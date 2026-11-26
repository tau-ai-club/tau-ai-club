import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { contentKindOf, editableSectionsFor, type ContentRow, type EventFile } from "@/lib/content/sections";
import { formatEventDate, loc } from "@/lib/event-format";
import { AdminHeader } from "@/components/admin/admin-header";
import { smallBtn } from "@/components/admin/styles";
import { SectionEditor } from "@/components/admin/content/section-editor";
import { FilesPanel } from "@/components/admin/content/files-panel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One event's members-only files (PDF summaries, HTML lessons). Text sections only while TEXT_SECTIONS_ENABLED. */
export default async function AdminContentEditPage({ params }: PageProps<"/[locale]/admin/content/[id]">) {
  const { locale: lc, id } = await params;
  const l = lc as Locale;
  setRequestLocale(l);
  await requireAdmin(`/admin/content/${id}`);
  if (!UUID.test(id)) notFound();
  const [t, supabase] = await Promise.all([getTranslations("content"), createClient()]);
  if (!supabase) notFound();

  const [{ data: event }, { data: rows }, { data: files }] = await Promise.all([
    supabase.from("events").select("id, slug, kind, title_he, title_en, starts_at").eq("id", id).maybeSingle(),
    supabase.from("event_content").select("id, section, body_he, body_en, visibility, status, updated_at").eq("event_id", id),
    supabase.from("event_files").select("id, path, title_he, title_en, status, kind, category").eq("event_id", id).order("created_at"),
  ]);
  if (!event) notFound();
  const kind = contentKindOf(event.kind);
  const sections = (rows ?? []) as ContentRow[];
  const Back = l === "he" ? ArrowRight : ArrowLeft;
  const sitePath = kind === "workshop" ? `/workshops/${event.slug}` : `/lectures/${event.slug}`;

  return (
    <div className="grid gap-6" data-testid="admin-content-edit">
      <AdminHeader
        before={
          <Link href="/admin/content" className="inline-flex w-fit items-center gap-2 text-sm text-fg-subtle hover:text-fg">
            <Back aria-hidden className="size-4" />
            {t("adminBack")}
          </Link>
        }
        title={loc(event, "title", l) ?? event.slug}
        meta={formatEventDate(event.starts_at, l)}
        action={
          <Link href={sitePath} className={smallBtn}>
            {t("adminView")}
            <ArrowUpRight aria-hidden className="rtl:-scale-x-100" />
          </Link>
        }
      />
      {/* Files first and, while content is files only (DECISIONS 24.11), files only. */}
      <FilesPanel eventId={event.id} files={(files ?? []) as Required<EventFile>[]} />
      {editableSectionsFor(kind).map((section) => (
        <SectionEditor key={section} eventId={event.id} section={section} row={sections.find((s) => s.section === section) ?? null} />
      ))}
    </div>
  );
}
