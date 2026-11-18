import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { requireMember } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { getEventBySlug, getSeason } from "@/lib/events";
import { getEventContent } from "@/lib/content/data";
import { WORKSHOP_SECTIONS, bodyFor, hasBody } from "@/lib/content/sections";
import { dbLang, formatEventDate, formatTimeRange, isoAttr, loc } from "@/lib/event-format";
import { Tag } from "@/components/events/event-bits";
import { MembersSoon, PageBackdrop, SpeakerList } from "@/components/content/content-bits";
import { HomeMotion } from "@/components/motion/home-motion";
import { authEnabled } from "@/lib/supabase/config";
import { SectionBlock } from "@/components/content/section-block";
import { MembersEyebrow } from "@/components/members/members-eyebrow";
import { Download } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/[locale]/workshops/[slug]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return { title: t("workshopsTitle"), robots: { index: false, follow: false } };
}

/**
 * One workshop: prep checklist, summary, key commands, exercises, resources. Members only.
 * While the members area is off: the public header and a "members only, coming soon" note.
 */
export default async function WorkshopPage({ params }: PageProps<"/[locale]/workshops/[slug]">) {
  const { locale: lc, slug } = await params;
  const l = lc as Locale;
  setRequestLocale(l);
  const authOn = authEnabled();
  if (authOn) await requireMember(`/workshops/${slug}`);

  const event = await getEventBySlug(slug);
  if (!event || event.kind !== "workshop") notFound();
  const [t, te, season, supabase] = await Promise.all([getTranslations("content"), getTranslations("event"), getSeason(), createClient()]);
  const content = supabase ? await getEventContent(supabase, slug) : null;
  const total = season.status === "ok" ? season.events.filter((e) => e.kind === "workshop").length : 0;
  const Back = l === "he" ? ArrowRight : ArrowLeft;
  const hebrewOnly = { label: t("hebrewOnly"), hint: t("hebrewOnlyHint") };

  return (
    <div className="relative isolate">
    <PageBackdrop />
    <article className="mx-auto grid max-w-4xl gap-10 px-4 pt-6 pb-20 sm:px-8 lg:pt-12" data-testid="workshop-page">
      <Link
        href="/workshops"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm text-fg-subtle transition-colors duration-150 hover:text-fg"
      >
        <Back aria-hidden className="size-4" />
        {t("backToWorkshops")}
      </Link>

      <header className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <MembersEyebrow />
          {event.series_no && total > 0 && <span className="text-sm text-fg-muted">{t("workshopNo", { n: event.series_no, total })}</span>}
          {event.state === "past" && <Tag pixel>{te("past")}</Tag>}
        </div>
        <h1 {...dbLang(l)} className="text-[clamp(2rem,6.5vw,3.25rem)] leading-[1.08] font-extrabold text-balance text-fg">{loc(event, "title", l) ?? slug}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted">
          <CalendarDays aria-hidden className="size-4 shrink-0 text-brand-purple-soft" />
          <time dateTime={isoAttr(event.starts_at)}>{formatEventDate(event.starts_at, l)}</time>
          <bdi dir="ltr" className="font-mono text-sm">
            {formatTimeRange(event.starts_at, event.ends_at)}
          </bdi>
          <Link href={`/events/${slug}`} className="inline-flex min-h-11 items-center text-sm text-brand-purple-soft underline underline-offset-4 hover:text-fg">
            {te("details")}
          </Link>
        </p>
        <SpeakerList event={event} locale={l} size={56} />
      </header>

      {!authOn && <MembersSoon title={t("soonTitle")} body={t("soonBodyWorkshop")} />}

      {authOn && WORKSHOP_SECTIONS.map((section) => {
        const row = content?.sections.find((s) => s.section === section);
        const title = t(`section_${section}`);
        if (!row || !hasBody(row)) {
          return (
            <SectionBlock key={section} section={section} title={title} hebrewOnly={hebrewOnly}>
              <p className="mt-3 inline-flex items-center gap-2 text-fg-subtle" data-testid="coming-soon">
                <Clock aria-hidden className="size-4 shrink-0" />
                {t("comingSoon")}
              </p>
            </SectionBlock>
          );
        }
        return <SectionBlock key={section} section={section} title={title} body={bodyFor(row, l)} hebrewOnly={hebrewOnly} />;
      })}

      {content && content.files.length > 0 && (
        <SectionBlock section="files" title={t("files")} hebrewOnly={hebrewOnly}>
          <ul className="mt-4 grid gap-2">
            {content.files.map((f) => (
              <li key={f.id}>
                <a href={`/api/files/${f.id}`} className="btn btn-ghost w-full justify-start sm:w-fit" data-testid="file-download">
                  <Download aria-hidden className="size-4" />
                  {t("download", { title: l !== "he" ? f.title_en : f.title_he })}
                </a>
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}
    </article>
    <HomeMotion />
    </div>
  );
}
