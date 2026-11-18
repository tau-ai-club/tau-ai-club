import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarPlus, ChevronLeft, ChevronRight, Presentation, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE, type Locale } from "@/i18n/routing";
import { requireMember } from "@/lib/auth/viewer";
import { getSeason } from "@/lib/events";
import { formatTimeRange, isoAttr, loc, venueLabel } from "@/lib/event-format";
import { ICS_PATH, calendarFeedLinks } from "@/lib/ics";
import { calendarFeedKey } from "@/lib/calendar-access";
import { createClient } from "@/lib/supabase/server";
import { signPhotos } from "@/lib/members/photos";
import { getMemberProfile, getMyContact } from "@/lib/members/profile";
import { hintClass, raisedPanelClass, smallBtn } from "@/components/admin/styles";
import { SeasonTimeline } from "@/components/events/season-timeline";
import { PageBackdrop } from "@/components/site/page-backdrop";
import { IcebreakersTeaser } from "@/components/events/icebreakers-teaser";
import { ProfileEditor } from "@/components/members/profile-editor";
import { MyAttendance } from "@/components/members/my-attendance";
import { MembersEyebrow } from "@/components/members/members-eyebrow";
import { PanelHeading } from "@/components/members/panel-heading";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/me">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "me" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** "2026-11-18" in Israel time, to tell which meetup is today. */
const israelDay = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(d));

/**
 * The member's home after logging in, in the order the user set on 18.11: hello + their own
 * details (the same editor as /profile), today's meetup, the season dial, upcoming meetups with
 * calendar downloads, then lectures, workshops and the meeting games.
 */
export default async function MePage({ params }: PageProps<"/[locale]/me">) {
  const { locale: lc } = await params;
  const locale = lc as Locale;
  setRequestLocale(locale);
  const viewer = await requireMember("/me");
  const [t, tc, te, season, supabase] = await Promise.all([
    getTranslations("me"),
    getTranslations("content"),
    getTranslations("event"),
    getSeason(),
    createClient(),
  ]);
  const [profile, contact] = supabase
    ? await Promise.all([getMemberProfile(supabase, viewer.member.id), getMyContact(supabase)])
    : [null, null];
  const photos = supabase && profile ? await signPhotos(supabase, [profile.photo_url]) : new Map<string, string>();
  const photoSrc = profile?.photo_url ? (photos.get(profile.photo_url) ?? null) : null;
  const name = profile?.full_name ?? viewer.member.fullName;

  const upcoming = season.status === "ok" ? season.events.filter((e) => e.state !== "past") : [];
  const today = israelDay(season.status === "ok" ? season.now : new Date());
  const feed = calendarFeedLinks(locale, calendarFeedKey());
  const icsHref = (slug: string) => `/api/calendar/${slug}${locale === "he" ? "" : `?locale=${locale}`}`;
  const day = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, day: "numeric" });
  const month = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, month: "short" });
  const weekday = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, weekday: "long" });
  const Forward = locale === "he" ? ChevronLeft : ChevronRight;

  const todays = upcoming.filter((e) => israelDay(e.starts_at) === today);
  const later = upcoming.filter((e) => israelDay(e.starts_at) !== today);

  const eventRow = (e: (typeof upcoming)[number]) => {
    const isToday = israelDay(e.starts_at) === today;
    const title = loc(e, "title", locale) ?? e.slug;
    const venue = venueLabel(e, locale);
    const start = new Date(e.starts_at);
    return (
      <li
        key={e.slug}
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-3 px-3.5 py-3",
          isToday ? "bg-brand-purple-deeper" : "bg-bg-deep",
        )}
      >
        <time
          dateTime={isoAttr(e.starts_at)}
          className={cn(
            "pixel-corners grid w-14 shrink-0 place-items-center py-1.5 leading-none text-fg [--px:3px]",
            isToday ? "bg-brand-purple" : "bg-surface-hover",
          )}
        >
          <span className="font-mono text-[1.375rem] font-bold">{day.format(start)}</span>
          <span className={cn("mt-1 text-[0.75rem]", isToday ? "text-fg" : "text-fg-subtle")}>{month.format(start)}</span>
        </time>
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <p className="flex flex-wrap items-center gap-2">
            <Link href={`/events/${e.slug}`} className="-my-2.5 inline-block py-2.5 font-semibold text-fg underline-offset-4 hover:underline">
              {title}
            </Link>
            {isToday && <span className="pixel-corners bg-brand-purple px-2.5 py-0.5 text-[0.75rem] font-semibold text-fg [--px:2px]">{t("today")}</span>}
          </p>
          <p className="flex flex-wrap gap-x-2 text-sm text-fg-muted">
            <span>{weekday.format(start)}</span>
            <bdi dir="ltr" className="font-mono">
              {formatTimeRange(e.starts_at, e.ends_at)}
            </bdi>
            {venue && <span className="text-fg-subtle">· {venue}</span>}
          </p>
        </div>
        <a href={icsHref(e.slug)} download className={smallBtn} data-testid="me-event-ics">
          <CalendarPlus aria-hidden />
          {t("addToCalendar")}
          <span className="sr-only">: {title}</span>
        </a>
      </li>
    );
  };

  // The order the user set on 18.11 (docs/DECISIONS.md): 1. hello + your details, 2. today (only on
  // a meetup day), 3. the season dial, 4. upcoming meetups + calendar, 5. lectures, workshops, games.
  return (
    <div className="relative isolate">
      <PageBackdrop />
      <div className="mx-auto grid max-w-site gap-10 px-4 pt-10 pb-20 sm:px-8 lg:pt-14" data-testid="me">
        <div className="grid gap-6">
          <header className="grid gap-2">
            <MembersEyebrow />
            <h1
              className={cn(
                "text-[clamp(2rem,7vw,3rem)] leading-[1.05] font-extrabold text-fg",
                locale !== "he" ? "tracking-[-0.02em]" : "tracking-[-0.01em]",
              )}
              data-testid="me-hello"
            >
              {t.rich("hello", {
                name,
                hl: (chunks) => <span className="text-brand-purple-soft">{chunks}</span>,
              })}
            </h1>
            <p className="max-w-[60ch] text-[1.0625rem] text-fg-muted">{t("detailsBody")}</p>
          </header>
          <ProfileEditor memberId={viewer.member.id} name={name} profile={profile} contact={contact} photoSrc={photoSrc} />
        </div>

        {todays.length > 0 && (
          <section
            aria-labelledby="today-heading"
            className={cn(raisedPanelClass, "grid gap-4 border-brand-purple p-5 shadow-[var(--glow-featured)] sm:p-6")}
            data-testid="me-today"
          >
            <PanelHeading id="today-heading" locale={locale}>
              {t("todayTitle")}
            </PanelHeading>
            <ul className="cell-grid pixel-corners [--px:4px]">{todays.map(eventRow)}</ul>
          </section>
        )}

        {/* The season dial (speakers around the season): members only, since it shows the schedule. */}
        {season.status === "ok" && (
          <SeasonTimeline events={season.events} now={season.now} cohortName={season.cohort ? loc(season.cohort, "name", locale) : null} embedded />
        )}

        <section aria-labelledby="upcoming-heading" className={cn(raisedPanelClass, "grid gap-4 p-5 sm:p-6")} data-testid="me-upcoming">
          <PanelHeading id="upcoming-heading" locale={locale}>
            {t("upcomingTitle")}
          </PanelHeading>
          {later.length === 0 ? (
            <p className="text-fg-subtle">{t("upcomingEmpty")}</p>
          ) : (
            <ul className="cell-grid pixel-corners [--px:4px]">{later.map(eventRow)}</ul>
          )}
          <div className="grid gap-2 border-t border-border pt-4">
            <PanelHeading as="h3" locale={locale} className="text-[0.8125rem]">{t("seasonFeedTitle")}</PanelHeading>
            <p className="max-w-[60ch] text-sm text-fg-muted">{t("seasonFeedBody")}</p>
            <div className="flex flex-wrap gap-2">
              <a href={feed.google} target="_blank" rel="noopener noreferrer" className="btn btn-primary h-10 px-3.5 text-sm">
                <CalendarPlus aria-hidden />
                {t("seasonFeedGoogle")}
                <span className="sr-only"> {te("opensInNewTab")}</span>
              </a>
              <a href={ICS_PATH[locale]} download className={smallBtn} data-testid="me-season-ics">
                {t("seasonFeedDownload")}
              </a>
            </div>
            <p className={hintClass}>{t("icsHint")}</p>
          </div>
        </section>

        {/* My attendance (Luma check-ins), moved here from the old /profile page (user, 18.11). */}
        {supabase && <MyAttendance supabase={supabase} memberId={viewer.member.id} />}

        <section aria-labelledby="sections-heading" className="grid gap-3">
          <PanelHeading id="sections-heading" locale={locale}>
            {t("sectionsTitle")}
          </PanelHeading>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["/lectures", tc("navLectures"), t("lecturesHint"), Presentation],
                ["/workshops", tc("navWorkshops"), t("workshopsHint"), Wrench],
              ] as const
            ).map(([href, label, hint, Icon]) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    raisedPanelClass,
                    "group flex h-full items-center gap-4 p-4 transition-colors duration-150 hover:border-border-accent hover:bg-surface-hover",
                  )}
                >
                  <span className="pixel-corners grid size-11 shrink-0 place-items-center bg-brand-purple-deeper shadow-[inset_0_0_0_1px_var(--border-accent)] [--px:3px] text-fg [&_svg]:size-5">
                    <Icon aria-hidden />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="font-semibold text-fg">{label}</span>
                    <span className="text-sm text-fg-subtle">{hint}</span>
                  </span>
                  <Forward aria-hidden className="size-5 shrink-0 text-fg-subtle transition-colors group-hover:text-brand-purple-soft" />
                </Link>
              </li>
            ))}
          </ul>
          {/* The meeting games (another team builds the game; this says it's coming). The design the
              user chose on 18.11: the big card with the two seats (docs/DECISIONS.md). */}
          <IcebreakersTeaser locale={locale} embedded />
        </section>
      </div>
    </div>
  );
}

