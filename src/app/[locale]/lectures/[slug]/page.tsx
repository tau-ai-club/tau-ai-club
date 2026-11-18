import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getEventBySlug, getSeason } from "@/lib/events";
import { getPublicSections } from "@/lib/content/data";
import { LECTURE_SECTIONS, bodyFor, contentKindOf } from "@/lib/content/sections";
import { markdownToText } from "@/lib/content/markdown";
import { formatEventDate, formatTimeRange, isoAttr, loc, speakerNames } from "@/lib/event-format";
import { alternatesFor, shareMetadata } from "@/lib/seo";
import { Tag } from "@/components/events/event-bits";
import { Eyebrow, MembersOnlyMark, MembersSoon, PageBackdrop, SpeakerList } from "@/components/content/content-bits";
import { HomeMotion } from "@/components/motion/home-motion";
import { authEnabled } from "@/lib/supabase/config";
import { requireMember } from "@/lib/auth/viewer";
import { SectionBlock } from "@/components/content/section-block";
import { MembersContent } from "@/components/content/members-content";

export const revalidate = 300;

export async function generateStaticParams() {
  const season = await getSeason();
  const slugs = season.status === "ok" ? season.events.filter((e) => contentKindOf(e.kind) === "lecture").map((e) => e.slug) : [];
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

async function getLecture(slug: string) {
  const event = await getEventBySlug(slug);
  return event && contentKindOf(event.kind) === "lecture" ? event : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/lectures/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const event = await getLecture(slug);
  if (!event) return {};
  // Public fields only: title, date, speaker names, the public blurb. Never members-only text.
  const [tm, sections] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getPublicSections()]);
  const title = loc(event, "title", locale) ?? slug;
  const blurb = sections[slug]?.blurb;
  const description = [
    formatEventDate(event.starts_at, locale),
    speakerNames(event, locale).join(", "),
    blurb ? markdownToText((locale !== "he" ? blurb.body_en : null) || blurb.body_he) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const path = `/lectures/${slug}`;
  // Members area on: members-only, so not indexed or shared.
  if (authEnabled()) return { title, robots: { index: false, follow: false } };
  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    ...shareMetadata({ locale, path, title: `${title} · ${tm("siteName")}`, description, siteName: tm("siteName"), imageAlt: tm("ogAlt"), type: "article" }),
  };
}

/**
 * One lecture. Members only once the members area is on. While it's off, a public
 * (cached) preview: speaker, date, the public blurb. The members-only
 * write-up (summary, goals, takeaways, the PDF) loads in a client island from a no-store
 * endpoint, so it is never in this page's HTML.
 */
export default async function LecturePage({ params }: PageProps<"/[locale]/lectures/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  // Members area on: members only (guests log in and come back here).
  if (authEnabled()) await requireMember(`/lectures/${slug}`);
  const event = await getLecture(slug);
  if (!event) notFound();
  const [t, te, sections] = await Promise.all([getTranslations("content"), getTranslations("event"), getPublicSections()]);

  const title = loc(event, "title", l) ?? slug;
  const blurb = sections[slug]?.blurb;
  const Back = l === "he" ? ArrowRight : ArrowLeft;
  const membersOrder = LECTURE_SECTIONS.filter((s) => s !== "blurb");

  return (
    <div className="relative isolate">
    <PageBackdrop />
    <article className="mx-auto grid max-w-4xl gap-10 px-4 pt-6 pb-20 sm:px-8 lg:pt-12" data-testid="lecture-page" data-state={event.state}>
      <Link
        href="/lectures"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm text-fg-subtle transition-colors duration-150 hover:text-fg"
      >
        <Back aria-hidden className="size-4" />
        {t("backToLectures")}
      </Link>

      <header className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow he="הרצאה" en="Lecture" />
          {event.state === "past" && <Tag pixel>{te("past")}</Tag>}
        </div>
        <h1 className="text-[clamp(2rem,6.5vw,3.25rem)] leading-[1.08] font-extrabold text-balance text-fg">{title}</h1>
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
        <SpeakerList event={event} locale={l} size={72} />
      </header>

      {blurb ? (
        <SectionBlock
          section="blurb"
          title={t("section_blurb")}
          body={bodyFor(blurb, l)}
          hebrewOnly={{ label: t("hebrewOnly"), hint: t("hebrewOnlyHint") }}
        />
      ) : (
        <p className="text-fg-subtle">{t("summaryComing")}</p>
      )}

      <div className="grid gap-6 border-t border-border pt-10">
        <MembersOnlyMark label={t("membersPart")} />
        {/* While the members area is off there is nothing to fetch and no one to sign in. */}
        {authEnabled() ? (
          <MembersContent slug={slug} order={membersOrder} path={`/lectures/${slug}`} />
        ) : (
          <MembersSoon title={t("soonTitle")} body={t("soonBody")} />
        )}
      </div>
    </article>
    <HomeMotion />
    </div>
  );
}
