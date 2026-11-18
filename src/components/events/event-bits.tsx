import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, CalendarDays, CalendarPlus, MapPin, UserRound } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import type { SeasonEvent } from "@/lib/data/types";
import {
  formatEventDate,
  formatTimeRange,
  googleCalendarUrl,
  isoAttr,
  speakerNames,
  venueIsTbd,
  venueLabel,
} from "@/lib/event-format";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/config/site";

type TagTone = "next" | "tentative" | "tbd" | "neutral";

/** Status tag. State is always written in text, never shown by color alone. */
export function Tag({ children, tone = "neutral", pixel }: { children: React.ReactNode; tone?: TagTone; pixel?: boolean }) {
  return (
    <span
      className={cn(
        "tag",
        tone === "next" && "tag-next",
        tone === "tentative" && "tag-tentative",
        tone === "tbd" && "tag-tbd",
        pixel && "rounded-none",
      )}
    >
      {children}
    </span>
  );
}

/** Kept for existing callers: maps the old pill tones onto tags. */
export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "warn" | "muted" }) {
  return <Tag tone={tone === "accent" ? "next" : tone === "warn" ? "tentative" : "neutral"}>{children}</Tag>;
}

/** Status tags: past / live / tentative / venue TBD. */
export async function EventPills({
  event,
  showState = true,
  showVenue = false,
}: {
  event: SeasonEvent;
  showState?: boolean;
  showVenue?: boolean;
}) {
  const t = await getTranslations("event");
  return (
    <>
      {showState && event.state === "past" && <Tag>{t("past")}</Tag>}
      {showState && event.state === "live" && <Tag tone="next">{t("happeningNow")}</Tag>}
      {event.is_tentative && <Tag tone="tentative">{t("tentative")}</Tag>}
      {showVenue && venueIsTbd(event) && <Tag tone="tbd">{t("venueTbd")}</Tag>}
    </>
  );
}

/** Date · time · venue · speakers. Dates and times are isolated so they don't reorder in RTL. */
export async function EventMeta({ event, size = "md" }: { event: SeasonEvent; size?: "md" | "sm" }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("event");
  const tp = await getTranslations("eventPage");
  const venue = venueLabel(event, locale);
  const names = speakerNames(event, locale);
  const icon = cn("mt-[0.2em] shrink-0 text-brand-purple-soft", size === "md" ? "size-[18px]" : "size-4");

  return (
    <dl className={cn("grid gap-2.5 leading-normal", size === "md" ? "text-[0.9375rem]" : "text-sm")}>
      <div className="flex items-start gap-2.5">
        <dt className="sr-only">{tp("when")}</dt>
        <CalendarDays aria-hidden className={icon} />
        <dd className="text-fg-muted">
          <time dateTime={isoAttr(event.starts_at)}>{formatEventDate(event.starts_at, locale)}</time>
          <span aria-hidden className="mx-1.5 text-fg-faint">
            ·
          </span>
          <bdi dir="ltr" className="font-mono text-[0.875rem]">
            {formatTimeRange(event.starts_at, event.ends_at)}
          </bdi>
        </dd>
      </div>
      <div className="flex items-start gap-2.5">
        <dt className="sr-only">{tp("where")}</dt>
        <MapPin aria-hidden className={icon} />
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-muted">
          {venue && <span>{venue}</span>}
          {venueIsTbd(event) && <Tag tone="tbd">{t("venueTbd")}</Tag>}
        </dd>
      </div>
      {names.length > 0 && (
        <div className="flex items-start gap-2.5">
          <dt className="sr-only">{tp("speakers")}</dt>
          <UserRound aria-hidden className={icon} />
          <dd className="text-fg-muted">{t("speakersWith", { names: names.join(", ") })}</dd>
        </div>
      )}
    </dl>
  );
}

/** Luma (only when luma_url is set) + Google Calendar. Calendar becomes the primary action when there's no Luma link. */
export async function EventActions({ event, className }: { event: SeasonEvent; className?: string }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("event");
  const pageUrl = `${SITE_URL}${locale === "he" ? "" : `/${locale}`}/events/${event.slug}`;
  const gcal = googleCalendarUrl(event, locale, { pageUrl, tbdLabel: t("venueTbd") });
  const hasLuma = !!event.luma_url;

  return (
    <div className={cn("grid gap-2.5", hasLuma && "grid-cols-2", className)}>
      {event.luma_url && (
        <a href={event.luma_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          {t("registerLuma")}
          <ArrowUpRight aria-hidden className="rtl:-scale-x-100" />
          <span className="sr-only"> {t("opensInNewTab")}</span>
        </a>
      )}
      <a
        href={gcal}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("btn", hasLuma ? "btn-ghost" : "btn-primary")}
      >
        <CalendarPlus aria-hidden />
        {t("addToCalendar")}
        <span className="sr-only"> {t("opensInNewTab")}</span>
      </a>
    </div>
  );
}
