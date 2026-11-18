import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { TIME_ZONE, intlLocale, isLatin } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getEventBySlug, getEventSlugs, getSeason } from "@/lib/events";
import {
  formatEventDate,
  formatShortDate,
  formatTimeRange,
  isoAttr,
  loc,
  speakerNames,
  venueIsTbd,
  venueLabel,
} from "@/lib/event-format";
import { jlmDay } from "@/lib/season-ruler";
import { alternatesFor, shareMetadata } from "@/lib/seo";
import { eventJsonLd, jsonLdHtml } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { EventActions, Tag } from "@/components/events/event-bits";
import { HomeMotion } from "@/components/motion/home-motion";
import { ChipSep, FlyerChip, InfoTile, PixelCluster, SpeakerAvatar, splitTitle } from "@/components/events/flyer-bits";
import { SpeakerLinkedIn } from "@/components/events/speaker-linkedin";
import { SpeakerContactLinks } from "@/components/events/speaker-contact-links";
import { authEnabled } from "@/lib/supabase/config";
import { requireMember } from "@/lib/auth/viewer";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getEventSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/events/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const event = await getEventBySlug(slug);
  if (!event) {
    // This page 404s: title it like the 404 page (the route that throws keeps its metadata).
    const tErr = await getTranslations({ locale, namespace: "errors" });
    return { title: tErr("notFoundTitle"), robots: { index: false, follow: false } };
  }
  // Members area on: meetup pages are members only (the schedule isn't public), so no
  // date/venue in the preview and not indexed.
  if (authEnabled()) return { title: loc(event, "title", locale) ?? "", robots: { index: false, follow: false } };
  // Public fields only (title, date, venue, speaker names, blurb). Never speaker contact data.
  const [t, te] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    getTranslations({ locale, namespace: "event" }),
  ]);
  const title = loc(event, "title", locale) ?? "";
  const when = `${formatEventDate(event.starts_at, locale)} · ${formatTimeRange(event.starts_at, event.ends_at)}`;
  const where = venueLabel(event, locale) ?? te("venueTbd");
  const who = speakerNames(event, locale).join(", ");
  // A tentative meetup says so first, so a link preview doesn't read as confirmed (QA audit S4).
  const tentative = event.is_tentative ? te("tentative") : null;
  const description = [tentative, when, where, who, loc(event, "blurb", locale)].filter(Boolean).join(" · ");
  const path = `/events/${slug}`;
  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    ...shareMetadata({
      locale,
      path,
      title: `${tentative ? `${title} (${tentative})` : title} · ${t("siteName")}`,
      description,
      siteName: t("siteName"),
      imageAlt: t("ogAlt"),
      type: "article",
    }),
  };
}


/**
 * One meetup. Same world as the home page: the logo grid backdrop, a featured
 * "ticket" with the date and actions (static, visible at first paint), and
 * speakers with faces. A past meetup reads as past: a Past tag, a written note,
 * no glow, a plain ticket and no calendar/registration actions.
 */
export default async function EventPage({ params }: PageProps<"/[locale]/events/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  if (authEnabled()) await requireMember(`/events/${slug}`);

  const [event, season] = await Promise.all([getEventBySlug(slug), getSeason()]);
  if (!event || season.status !== "ok") notFound();
  const [t, te, tm] = await Promise.all([
    getTranslations("eventPage"),
    getTranslations("event"),
    getTranslations("meta"),
  ]);
  const jsonLd = eventJsonLd(event, l, { siteName: tm("siteName"), venueTbd: te("venueTbd") });

  const past = event.state === "past";
  const live = event.state === "live";
  const dayDiff = jlmDay(event.starts_at) - jlmDay(season.now);
  const today = dayDiff === 0 && !past;
  const relative = live
    ? te("happeningNow")
    : dayDiff >= 0
      ? te("relativeDays", { days: dayDiff })
      : te("relativePast", { days: -dayDiff });

  const title = loc(event, "title", l) ?? event.slug;
  const blurb = loc(event, "blurb", l);
  const venue = venueLabel(event, l);
  const address = event.venue ? loc(event.venue, "address", l) : null;
  const speakers = event.event_speakers.map(({ speaker }) => {
    const name = loc(speaker, "name", l) ?? "";
    return {
      key: speaker.id,
      name,
      photoUrl: speaker.photo_url,
      linkedinUrl: speaker.linkedin_url,
      role: loc(speaker, "role", l) ?? null,
      company: loc(speaker, "company", l) ?? null,
    };
  });
  const authOn = authEnabled();
  const contactLabels = {
    title: t("contactTitle"),
    email: t("contactEmail"),
    phone: t("contactPhone"),
    linkedin: t("contactLinkedin"),
  };
  const seriesTotal = event.series ? season.events.filter((e) => e.series === event.series).length : 0;

  const index = season.events.findIndex((e) => e.slug === event.slug);
  const prev = index > 0 ? season.events[index - 1] : null;
  const next = index >= 0 && index < season.events.length - 1 ? season.events[index + 1] : null;

  const weekday = new Intl.DateTimeFormat(intlLocale[l], { timeZone: TIME_ZONE, weekday: "short" }).format(
    new Date(event.starts_at),
  );
  const hm = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  const { head, accent, tail } = splitTitle(title);
  const cohortName = season.cohort ? loc(season.cohort, "name", l) : null;
  const Back = l === "he" ? ArrowRight : ArrowLeft; // points toward inline-start
  const Forward = l === "he" ? ArrowLeft : ArrowRight;

  return (
    <div className="relative isolate">
      {/* Backdrop: the logo grid; the glow and the flyer's pixel staircase only while the meetup is still ahead. Decorative, static. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[34rem] overflow-hidden">
        <div className="hero-grid absolute inset-0" />
        {!past && <div className="hero-glow absolute inset-0" />}
        {!past && <PixelCluster className="absolute end-0 top-[4.5rem] w-[clamp(7.5rem,24vw,15.5rem)] rtl:-scale-x-100" />}
        <i className="absolute hidden lg:block start-[5%] top-[18rem] size-7 bg-logo-indigo" />
      </div>

      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />}
      <article data-testid="event-page" data-state={event.state} className="mx-auto max-w-site px-4 pt-6 sm:px-8 lg:pt-12">
        {/* min-h-6 + padding: a 24px+ target (WCAG 2.5.8, audit S5). */}
        <Link
          href="/"
          className="inline-flex min-h-6 w-fit items-center gap-2 rounded-sm py-1 text-sm text-fg-subtle transition-colors duration-150 hover:text-fg"
        >
          <Back aria-hidden className="size-4" />
          {t("back")}
        </Link>

        <header className="mt-7 max-w-[56rem] lg:mt-10">
          <div className="intro flex flex-wrap items-center gap-2 [--i:0]">
            {cohortName && (
              <FlyerChip locale={l}>
                {cohortName}
                {seriesTotal > 1 && event.series_no ? (
                  <>
                    <ChipSep />
                    <bdi>{te("seriesShort", { n: event.series_no, total: seriesTotal })}</bdi>
                  </>
                ) : null}
              </FlyerChip>
            )}
            {past && <Tag>{te("past")}</Tag>}
            {live && <Tag tone="next">{te("happeningNow")}</Tag>}
            {!live && today && <Tag tone="next">{te("today")}</Tag>}
            {event.state === "next" && !today && <Tag tone="next">{te("next")}</Tag>}
            {event.is_tentative && <Tag tone="tentative">{te("tentative")}</Tag>}
          </div>
          <h1
            className={cn(
              "intro mt-5 text-[clamp(2.25rem,7.5vw,4rem)] leading-[1.05] font-extrabold text-balance [--i:1]",
              past ? "text-fg-muted" : "text-fg",
              isLatin(l) ? "tracking-[-0.02em]" : "tracking-[-0.01em]",
            )}
          >
            {head}
            {accent && (
              <>
                {" "}
                <span className={past ? "text-fg-subtle" : "text-brand-purple"}>{accent}</span>
              </>
            )}
            {tail && (
              <span className="mt-3 block text-[clamp(1.25rem,3.4vw,1.875rem)] leading-snug font-semibold tracking-normal text-pretty text-fg-muted">
                {tail}
              </span>
            )}
          </h1>
          {blurb && (
            <p className="intro mt-5 max-w-[60ch] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted [--i:2] lg:text-[1.1875rem]">
              {blurb}
            </p>
          )}
        </header>

        <div className="mt-10 grid max-w-[56rem] gap-10 lg:mt-12">
          {/* ---------- Speakers, as on the flyer: round photo, name, role, company ---------- */}
          {speakers.length > 0 && (
            <section aria-labelledby="speakers-heading">
              <h2 id="speakers-heading" className="sr-only">
                {t("speakers")}
              </h2>
              <ul className={cn("grid gap-6", speakers.length > 1 && "sm:grid-cols-2")}>
                {speakers.map((sp) => {
                  const solo = speakers.length === 1;
                  return (
                    <li key={sp.key} data-testid="event-speaker" className="flex items-center gap-4 sm:gap-5">
                      <SpeakerAvatar pixel name={sp.name} photoUrl={sp.photoUrl} company={sp.company} size={solo ? 96 : 80} muted={past} />
                      <div className="min-w-0">
                        <p className={cn("leading-tight font-bold text-balance text-fg", solo ? "text-[clamp(1.5rem,4vw,2rem)]" : "text-xl")}>
                          {sp.name}
                        </p>
                        {sp.role && <p className="mt-1.5 leading-snug font-semibold text-fg">{sp.role}</p>}
                        {sp.company && (
                          <p className="mt-0.5 text-fg-subtle">
                            <bdi>{sp.company}</bdi>
                          </p>
                        )}
                        <SpeakerLinkedIn url={sp.linkedinUrl} name={sp.name} className="-ms-2 mt-1" />
                        {/* Members only: fetched after load from a no-store endpoint, never in this ISR HTML.
                            Not even rendered while the members area is off. */}
                        {authOn && <SpeakerContactLinks slug={event.slug} speakerId={sp.key} labels={contactLabels} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ---------- Ticket: the flyer's DATE / TIME / WHERE boxes, then the actions ---------- */}
          <section aria-label={t("when")} data-testid="event-ticket" className="grid gap-4">
            <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-[1.1fr_0.8fr_1.5fr] md:gap-3">
              <InfoTile
                locale={l}
                muted={past}
                label={t("date")}
                value={
                  <>
                    {weekday},{" "}
                    <bdi dir="ltr" className="font-mono font-medium">
                      {formatShortDate(event.starts_at, l)}
                    </bdi>
                    <span className="sr-only">
                      {" "}
                      <time dateTime={isoAttr(event.starts_at)}>{formatEventDate(event.starts_at, l)}</time>
                    </span>
                  </>
                }
                sub={<span className={cn(!past && "text-brand-purple-soft")}>{relative}</span>}
              />
              <InfoTile
                locale={l}
                muted={past}
                label={t("time")}
                value={
                  <bdi dir="ltr" className="font-mono font-medium whitespace-nowrap">
                    {hm(event.starts_at)}
                  </bdi>
                }
                sub={t("until", { time: hm(event.ends_at) })}
              />
              <InfoTile
                locale={l}
                muted={past}
                className="col-span-2 md:col-span-1"
                label={t("where")}
                value={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {venue && <span>{venue}</span>}
                    {venueIsTbd(event) && <Tag tone="tbd">{te("venueTbd")}</Tag>}
                  </span>
                }
                sub={
                  address || event.venue?.maps_url ? (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {address && <span>{address}</span>}
                      {event.venue?.maps_url && (
                        <a
                          href={event.venue.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-6 items-center gap-1 rounded-sm font-medium text-brand-purple-soft hover:text-brand-purple-softer"
                        >
                          {t("openMaps")}
                          <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
                          <span className="sr-only"> {te("opensInNewTab")}</span>
                        </a>
                      )}
                    </span>
                  ) : undefined
                }
              />
            </dl>

            {past ? (
              <p className="rounded-md border border-border bg-bg-deep/45 px-3.5 py-3 text-sm text-fg-subtle">{t("pastNote")}</p>
            ) : (
              <EventActions event={event} className="sm:max-w-md" />
            )}
          </section>
        </div>

        {/* ---------- Previous / next meetup ---------- */}
        {(prev || next) && (
          <nav aria-label={t("seasonNav")} data-build="" className="cell-grid mt-16 sm:grid-cols-2 lg:mt-24">
            {prev ? (
              <Link
                href={`/events/${prev.slug}`}
                className="group grid gap-1 p-4 transition-colors duration-150 hover:bg-surface sm:p-5"
              >
                <span className="inline-flex items-center gap-1.5 text-sm text-fg-subtle">
                  <Back aria-hidden className="size-4" />
                  {t("prevMeetup")}
                </span>
                <span className="font-semibold text-fg">{loc(prev, "title", l)}</span>
                <bdi dir="ltr" className="w-fit font-mono text-sm text-fg-subtle">
                  {formatShortDate(prev.starts_at, l)}
                </bdi>
              </Link>
            ) : (
              <span aria-hidden className="hidden sm:block" />
            )}
            {next && (
              <Link
                href={`/events/${next.slug}`}
                className="group grid justify-items-end gap-1 p-4 text-end transition-colors duration-150 hover:bg-surface sm:p-5"
              >
                <span className="inline-flex items-center gap-1.5 text-sm text-fg-subtle">
                  {t("nextMeetup")}
                  <Forward aria-hidden className="size-4" />
                </span>
                <span className="font-semibold text-fg">{loc(next, "title", l)}</span>
                <bdi dir="ltr" className="w-fit font-mono text-sm text-fg-subtle">
                  {formatShortDate(next.starts_at, l)}
                </bdi>
              </Link>
            )}
          </nav>
        )}
      </article>
      <HomeMotion />
    </div>
  );
}
