import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getSeason, getTeam } from "@/lib/events";
import { loc } from "@/lib/event-format";
import { cn } from "@/lib/utils";
import { jsonLdHtml, organizationJsonLd } from "@/lib/structured-data";
import { NextEventCard } from "@/components/events/next-event-card";
import { MemberNextEvent } from "@/components/events/member-next-event";
import { MEMBER_HINT_SCRIPT, NextEventPlaceholder } from "@/components/events/next-event-placeholder";
import { SeasonTimeline } from "@/components/events/season-timeline";
import { SeasonSpeakers } from "@/components/events/season-speakers";
import { ClubFounders } from "@/components/events/club-founders";
import { ClubAbout } from "@/components/home/club-about";
import { HeroFaces, seasonSpeakers } from "@/components/home/hero-faces";
import { authEnabled } from "@/lib/supabase/config";

// ISR: re-render at most every 5 minutes (see PUBLIC_REVALIDATE_SECONDS in config/site.ts;
// route segment config must be a literal).
export const revalidate = 300;

/** "2026–27" from the cohort's start/end dates. */
function cohortYears(startsOn: string, endsOn: string) {
  const a = startsOn.slice(0, 4);
  const b = endsOn.slice(0, 4);
  return a === b ? a : `${a}–${b.slice(2)}`;
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [season, team, t, te, tm] = await Promise.all([
    getSeason(),
    getTeam(),
    getTranslations("home"),
    getTranslations("errors"),
    getTranslations("meta"),
  ]);
  const orgJsonLd = organizationJsonLd(l, { name: tm("siteName"), description: tm("description") });
  const cohort = season.status === "ok" ? season.cohort : null;
  const tagline = cohort ? loc(cohort, "tagline", l) : null;
  const next = season.status === "ok" ? season.next : null;
  // Members area on: the schedule (dates, times, places) is for members only, in /me.
  // Open question for the club (docs/OPEN-QUESTIONS.md #1). Guests see the vision, speakers and founders.
  const showSchedule = !authEnabled();
  // Without the schedule card, the hero's second column shows the season's speakers instead (review 19.11, item 4).
  const speakers = season.status === "ok" ? seasonSpeakers(season.events) : [];
  const faces = !showSchedule && speakers.length > 0;
  const seriesTotal =
    season.status === "ok" && next?.series ? season.events.filter((e) => e.series === next.series).length : undefined;

  return (
    <div className="relative isolate">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(orgJsonLd)} />
      {/* The film itself is the layout's SiteFilm (one canvas per page), with no pause button (26.11). */}
      {/* Before the hero paints: mark a member's browser, so their layout is there from the first paint (no jump). */}
      {!showSchedule && <script dangerouslySetInnerHTML={{ __html: MEMBER_HINT_SCRIPT }} />}

      <div className={cn(
          "relative mx-auto grid max-w-site gap-7 px-4 pt-6 sm:px-8 lg:items-end lg:gap-14 lg:pt-16",
          (showSchedule || faces) && "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
        )}>
        <section aria-labelledby="hero-heading">
          <h1
            id="hero-heading"
            className={cn(
              // Weight and tracking come from the site-wide heading rule (globals.css).
              "text-[clamp(2.6rem,11vw,5.25rem)] leading-[1.02] text-balance text-fg",
            )}
          >
            {/* Each line rises out of its own mask on the first view (globals.css, .intro-line). */}
            <span className="intro-line [--i:1]"><span>{t("heroLine1")}</span></span>
            <span className="intro-line text-brand-purple-soft [--i:2]"><span>{t("heroLine2")}</span></span>
          </h1>
          {tagline && (
            <p className="intro mt-4 max-w-[46ch] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted [--i:3] lg:text-[1.1875rem]">
              {tagline}
            </p>
          )}
          {cohort && (
            <p className="intro mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-2 [--i:4]">
              <span lang="en" className="eyebrow-pixel text-[0.6875rem]">
                {cohort.name_en}
              </span>
              <bdi dir="ltr" className="font-mono text-[0.8125rem] text-fg-subtle">
                {cohortYears(cohort.starts_on, cohort.ends_on)}
              </bdi>
            </p>
          )}
          {faces && <HeroFaces layout="row" speakers={speakers} locale={l} label={t("heroFacesLink", { count: speakers.length })} />}
        </section>

        {!showSchedule ? (
          // Signed-in members get their Next event card here after load (review item 5); guests and the cached HTML keep the faces.
          // Part 2: a placeholder holds the card's place from the moment the page knows it's a member, so nothing jumps
          // when the card lands, and members keep the faces (the short row, now also on wide screens; DECISIONS 19.11).
          <MemberNextEvent pending={<NextEventPlaceholder label={t("memberNextLoading")} />}>
            {faces && <HeroFaces layout="wide" speakers={speakers} locale={l} label={t("heroFacesLink", { count: speakers.length })} />}
          </MemberNextEvent>
        ) : season.status === "ok" ? (
          <NextEventCard event={next} now={season.now} seriesTotal={seriesTotal} />
        ) : (
          <p role="status" data-testid="data-unavailable" className="rounded-lg border border-border bg-surface p-5">
            {te("dataUnavailable")}
          </p>
        )}
      </div>

      <ClubAbout locale={l} />
      {showSchedule && season.status === "ok" && <SeasonTimeline events={season.events} now={season.now} cohortName={cohort ? loc(cohort, "name", l) : null} />}
      {season.status === "ok" && <SeasonSpeakers events={season.events} locale={l} />}
      <ClubFounders team={team} locale={l} />
    </div>
  );
}
