import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getSeason, getTeam } from "@/lib/events";
import { loc } from "@/lib/event-format";
import { cn } from "@/lib/utils";
import { jsonLdHtml, organizationJsonLd } from "@/lib/structured-data";
import { NextEventCard } from "@/components/events/next-event-card";
import { SeasonTimeline } from "@/components/events/season-timeline";
import { SeasonSpeakers } from "@/components/events/season-speakers";
import { ClubFounders } from "@/components/events/club-founders";
import { ClubAbout } from "@/components/home/club-about";
import { PixelMosaic } from "@/components/home/pixel-mosaic";
import { HomeMotion } from "@/components/motion/home-motion";
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

  const [season, team, t, te, tm, tf] = await Promise.all([
    getSeason(),
    getTeam(),
    getTranslations("home"),
    getTranslations("errors"),
    getTranslations("meta"),
    getTranslations("footer"),
  ]);
  const orgJsonLd = organizationJsonLd(l, { name: tm("siteName"), description: tm("description") });
  const cohort = season.status === "ok" ? season.cohort : null;
  const tagline = cohort ? loc(cohort, "tagline", l) : null;
  const next = season.status === "ok" ? season.next : null;
  // Members area on: the schedule (dates, times, places) is for members only, in /me.
  // Open question for the club (docs/OPEN-QUESTIONS.md #1). Guests see the vision, speakers and founders.
  const showSchedule = !authEnabled();
  const seriesTotal =
    season.status === "ok" && next?.series ? season.events.filter((e) => e.series === next.series).length : undefined;

  return (
    <div className="relative isolate">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(orgJsonLd)} />
      {/* Backdrop: the logo grid, fading out. Decorative, static. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[40rem] overflow-hidden">
        <div className="hero-grid absolute inset-0 opacity-50" />
      </div>

      <div
        className={cn(
          "mx-auto grid max-w-site gap-8 px-4 pt-8 sm:px-8 lg:gap-12 lg:pt-14",
          showSchedule ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end" : "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",
        )}
      >
        <section aria-labelledby="hero-heading" data-hero="">
          {cohort && (
            <p className="intro flex w-fit items-stretch border border-border-accent text-[0.6875rem] leading-none [--i:0]">
              {l === "en" ? (
                <span lang="en" className="bg-brand-purple px-2.5 py-2 font-pixel tracking-[0.18em] text-on-purple uppercase">
                  {cohort.name_en}
                </span>
              ) : (
                <span className="eyebrow-he bg-brand-purple px-2.5 py-1.5 text-on-purple!">{loc(cohort, "name", l)}</span>
              )}
              <bdi dir="ltr" className="px-2.5 py-2 font-mono text-[0.75rem] text-fg-muted">
                {cohortYears(cohort.starts_on, cohort.ends_on)}
              </bdi>
            </p>
          )}
          <h1
            id="hero-heading"
            className={cn(
              "mt-5 text-[clamp(3rem,12.5vw,6.5rem)] leading-[0.98] font-extrabold text-balance text-fg",
              l === "en" ? "tracking-[-0.03em]" : "tracking-[-0.015em]",
            )}
          >
            <span className="intro block [--i:1]">{t("heroLine1")}</span>
            <span className="intro block text-brand-purple-soft [--i:2]">{t("heroLine2")}</span>
          </h1>
          {tagline && (
            <p className="intro mt-5 max-w-[44ch] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted [--i:3] lg:text-[1.1875rem]">
              {tagline}
            </p>
          )}
        </section>

        {!showSchedule ? (
          <PixelMosaic data-mosaic="" className="w-44 justify-self-end rtl:-scale-x-100 sm:w-56 lg:w-[22rem]" />
        ) : season.status === "ok" ? (
          <NextEventCard event={next} now={season.now} seriesTotal={seriesTotal} />
        ) : (
          <p role="status" data-testid="data-unavailable" className="rounded-lg border border-border bg-surface p-5">
            {te("dataUnavailable")}
          </p>
        )}
      </div>

      {/* The club's sign-off, set as the page's one big pixel moment. Silkscreen (Latin) in English, Rubik 800 in Hebrew. */}
      <div className="mx-auto mt-10 max-w-site overflow-hidden px-4 sm:px-8 lg:mt-14">
        <p
          data-band=""
          {...(l === "en" ? { lang: "en", dir: "ltr" } : {})}
          className={cn(
            "flex items-end border-y border-border py-3 leading-[0.82] whitespace-nowrap text-fg",
            l === "en"
              ? "font-pixel text-[clamp(2.5rem,11.6vw,9.25rem)]"
              : "text-[clamp(2.75rem,12.5vw,10rem)] font-extrabold tracking-[-0.015em]",
          )}
        >
          <span data-band-text="" className="flex items-end">
            <span>{tf("tagline")}</span>
            <span aria-hidden className="pixel-caret shrink-0" />
          </span>
        </p>
      </div>

      <ClubAbout locale={l} />
      {showSchedule && season.status === "ok" && <SeasonTimeline events={season.events} now={season.now} cohortName={cohort ? loc(cohort, "name", l) : null} />}
      {season.status === "ok" && <SeasonSpeakers events={season.events} locale={l} />}
      <ClubFounders team={team} locale={l} />
      <HomeMotion />
    </div>
  );
}
