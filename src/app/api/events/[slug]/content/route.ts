import { NextResponse, type NextRequest } from "next/server";
import { routeClient } from "@/lib/auth/route-client";
import { hasAuthCookie } from "@/lib/supabase/config";
import { withFormat, type ContentRow, type EventFile } from "@/lib/content/sections";

export const dynamic = "force-dynamic";

export type MembersContent = {
  viewer: "guest" | "outsider" | "member";
  sections: Pick<ContentRow, "section" | "body_he" | "body_en" | "updated_at">[];
  files: EventFile[];
};

const NO_STORE = { "Cache-Control": "private, no-store", Vary: "Cookie" };

/**
 * The members-only sections of one published lecture or workshop.
 *
 * Lecture pages are ISR and identical for everyone, so members-only text must never be
 * in them. A client island calls this endpoint; it answers per request, is never cached,
 * and returns no sections to guests and non-members. The database decides: RLS on
 * event_content returns members-only and published rows only when is_member().
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/events/[slug]/content">) {
  const respond = (body: MembersContent, apply?: (r: NextResponse) => NextResponse) => {
    const r = NextResponse.json(body, { headers: NO_STORE });
    return apply ? apply(r) : r;
  };
  const guest: MembersContent = { viewer: "guest", sections: [], files: [] };

  if (!hasAuthCookie(request.cookies.getAll().map((c) => c.name))) return respond(guest);
  const rc = routeClient(request);
  if (!rc) return respond(guest);
  const { supabase, apply } = rc;

  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return respond(guest, apply);

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return respond(guest, apply);
  const { data: isMember } = await supabase.rpc("is_member");
  if (isMember !== true) return respond({ ...guest, viewer: "outsider" }, apply);

  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!event) return respond({ viewer: "member", sections: [], files: [] }, apply);

  const [{ data: sections }, { data: files }] = await Promise.all([
    supabase
      .from("event_content")
      .select("section, body_he, body_en, updated_at")
      .eq("event_id", event.id)
      .eq("status", "published")
      .eq("visibility", "members"),
    supabase.from("event_files").select("id, title_he, title_en, kind, category, path").eq("event_id", event.id).eq("status", "published"),
  ]);
  return respond(
    {
      viewer: "member",
      sections: (sections ?? []) as MembersContent["sections"],
      files: ((files ?? []) as EventFile[]).map(withFormat),
    },
    apply,
  );
}
