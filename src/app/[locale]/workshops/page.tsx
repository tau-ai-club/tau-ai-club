import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, ListChecks } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { requireMember } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { getSeason } from "@/lib/events";
import { hasBody } from "@/lib/content/sections";
import { formatEventDate, isoAttr, loc } from "@/lib/event-format";
import { Tag } from "@/components/events/event-bits";
import { ContentIntro, MembersOnlyMark, MembersSoon, PageBackdrop, SpeakerList } from "@/components/content/content-bits";
import { PeopleGrid } from "@/components/events/people-grid";
import { HomeMotion } from "@/components/motion/home-motion";
import { authEnabled } from "@/lib/supabase/config";
import { MembersEyebrow } from "@/components/members/members-eyebrow";

export async function generateMetadata({ params }: PageProps<"/[locale]/workshops">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return { title: t("workshopsTitle"), robots: { index: false, follow: false } };
}

/**
 * Zero to Hero workshops: members only (guests sign in, outsiders get the members-only page).
 * While the members area is off, everyone sees the public overview (titles, dates,
 * speakers, all public on the event pages anyway) and a "members only, coming soon" note.
 */
export default async function WorkshopsPage({ params }: PageProps<"/[locale]/workshops">) {
  const { locale: lc } = await params;
  const l = lc as Locale;
  setRequestLocale(l);
  const authOn = authEnabled();
  if (authOn) await requireMember("/workshops");
  const [t, te, season, supabase] = await Promise.all([getTranslations("content"), getTranslations("event"), getSeason(), createClient()]);

  const workshops = season.status === "ok" ? season.events.filter((e) => e.kind === "workshop") : [];
  const prepReady = new Set<string>();
  if (supabase && workshops.length) {
    const { data } = await supabase
      .from("event_content")
      .select("body_he, body_en, event:events!inner(slug)")
      .eq("section", "prep")
      .eq("status", "published")
      .in("event_id", workshops.map((w) => w.id));
    for (const row of (data ?? []) as unknown as { body_he: string; body_en: string | null; event: { slug: string } }[]) {
      if (hasBody(row)) prepReady.add(row.event.slug);
    }
  }
  const Forward = l === "he" ? ArrowLeft : ArrowRight;

  return (
    <div className="relative isolate">
    <PageBackdrop />
    <div className="mx-auto grid max-w-site gap-12 px-4 pt-10 pb-20 sm:px-8 lg:pt-14" data-testid="workshops-page">
      <ContentIntro locale={l} eyebrow={<MembersEyebrow />} title={t("workshopsTitle")} body={t("workshopsBody")} />
      {!authOn && <MembersSoon title={t("soonTitle")} body={t("soonBodyWorkshop")} />}
      {workshops.length === 0 ? (
        <p className="text-fg-subtle">{t("workshopsEmpty")}</p>
      ) : (
        <PeopleGrid>
          {workshops.map((w, i) => (
            <li key={w.slug} data-testid="workshop-card" data-tilt="" className="group relative grid min-w-0 content-start gap-3 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                  <span>{t("workshopNo", { n: w.series_no ?? i + 1, total: workshops.length })}</span>
                  {w.state === "past" && <Tag pixel>{te("past")}</Tag>}
                  {(w.state === "next" || w.state === "live") && <Tag pixel tone="next">{te(w.state === "live" ? "happeningNow" : "next")}</Tag>}
                </div>
                <h2 className="text-xl font-bold text-balance text-fg transition-colors duration-150 group-hover:text-brand-purple-soft">
                  <Link href={`/workshops/${w.slug}`} className="rounded-sm after:absolute after:inset-0">
                    {loc(w, "title", l) ?? w.slug}
                  </Link>
                </h2>
                <time dateTime={isoAttr(w.starts_at)} className="text-fg-muted">
                  {formatEventDate(w.starts_at, l)}
                </time>
                <SpeakerList event={w} locale={l} size={36} />
                {prepReady.has(w.slug) && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
                    <ListChecks aria-hidden className="size-4 text-brand-purple-soft" />
                    {t("prepReady")}
                  </p>
                )}
                <span aria-hidden className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand-purple-soft">
                  {t("workshopsTitle")}
                  <Forward className="size-4" />
                </span>
            </li>
          ))}
        </PeopleGrid>
      )}
      <MembersOnlyMark label={t("membersOnlyBadge")} />
    </div>
    <HomeMotion />
    </div>
  );
}
