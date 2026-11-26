import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public";
import { withFormat, type ContentRow, type EventFile } from "./sections";

type PublicSections = Record<string, Partial<Record<ContentRow["section"], Pick<ContentRow, "body_he" | "body_en">>>>;

/** Same switch as the season data: committed seed in seed/fixture mode, never silently. */
function fixturesAllowed() {
  return (
    process.env.DATA_SOURCE === "seed" ||
    (process.env.USE_FIXTURES === "1" && process.env.VERCEL_ENV !== "production")
  );
}

/**
 * Public, published sections of every published event, keyed by event slug (anon role:
 * RLS returns nothing members-only and no drafts). Cookie-less, so ISR pages can use it.
 */
export const getPublicSections = cache(async (): Promise<PublicSections> => {
  // Seed/fixtures first, as in lib/events.ts: the season and its content come from the same place.
  if (fixturesAllowed()) return (await import("@/lib/data/content-fixtures.json")).default as PublicSections;
  const supabase = createPublicClient();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("event_content")
    .select("section, body_he, body_en, event:events!inner(slug)")
    .eq("status", "published")
    .eq("visibility", "public");
  if (error) {
    console.error("[content] public sections query failed", error);
    return {};
  }
  const out: PublicSections = {};
  for (const row of (data ?? []) as unknown as { section: ContentRow["section"]; body_he: string; body_en: string | null; event: { slug: string } }[]) {
    (out[row.event.slug] ??= {})[row.section] = { body_he: row.body_he, body_en: row.body_en };
  }
  return out;
});

/**
 * Everything the caller may read for one event, as the signed-in user (cookie-aware
 * client): RLS returns public sections to anyone and members-only ones to members.
 */
export async function getEventContent(supabase: SupabaseClient, slug: string) {
  const { data: event } = await supabase.from("events").select("id, kind").eq("slug", slug).maybeSingle();
  if (!event) return null;
  const [{ data: sections, error }, { data: files }] = await Promise.all([
    supabase
      .from("event_content")
      .select("section, body_he, body_en, visibility, status, updated_at")
      .eq("event_id", event.id)
      .eq("status", "published"),
    supabase.from("event_files").select("id, title_he, title_en, kind, category, path").eq("event_id", event.id).eq("status", "published"),
  ]);
  if (error) console.error("[content] event content query failed", error);
  return {
    eventId: event.id as string,
    kind: event.kind as string,
    sections: (sections ?? []) as ContentRow[],
    files: ((files ?? []) as EventFile[]).map(withFormat),
  };
}
