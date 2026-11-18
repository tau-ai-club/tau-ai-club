import type { Locale } from "@/i18n/routing";
import { TIME_ZONE, intlLocale } from "@/i18n/routing";
import type { ClubEvent } from "@/lib/data/types";

/**
 * Pick the `${field}_he` / `${field}_en` column for a locale, falling back to the other language.
 * Content has Hebrew and English columns only, so German and French read English first, then Hebrew.
 */
export function loc<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string | null {
  const primary = row[`${field}_${locale === "he" ? "he" : "en"}`];
  const fallback = row[`${field}_${locale === "he" ? "en" : "he"}`];
  const value = primary ?? fallback;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** e.g. he: "יום רביעי, 18 בנובמבר" · en: "Wednesday, 18 November" (Israel time). */
export function formatEventDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

/** Short date for the timeline, e.g. "18.11". */
export function formatShortDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  })
    .format(new Date(iso))
    .replace("/", ".")
    .replace(/\.$/, "");
}

/** "18:00–20:00" in Israel time (24h in both languages). */
export function formatTimeRange(startIso: string, endIso: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${f.format(new Date(startIso))}–${f.format(new Date(endIso))}`;
}

/** Machine-readable ISO for <time dateTime>. */
export const isoAttr = (iso: string) => new Date(iso).toISOString();

export function speakerNames(event: ClubEvent, locale: Locale): string[] {
  return event.event_speakers.map((es) => loc(es.speaker, "name", locale)).filter((n): n is string => !!n);
}

/** Venue label: the venue name, else the venue note, else null (caller shows "Venue TBD"). */
export function venueLabel(event: ClubEvent, locale: Locale): string | null {
  const name = event.venue ? loc(event.venue, "name", locale) : null;
  const note = loc(event, "venue_note", locale);
  if (name && note) return `${name} · ${note}`;
  return name ?? note;
}

/** True when the venue isn't pinned down yet (no venue row). */
export const venueIsTbd = (event: ClubEvent) => !event.venue;

function gcalStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Google Calendar "add event" link (times in UTC, displayed in Israel time). */
export function googleCalendarUrl(
  event: ClubEvent,
  locale: Locale,
  opts: { pageUrl?: string; tbdLabel: string },
) {
  const title = loc(event, "title", locale) ?? "";
  const names = speakerNames(event, locale);
  const details = [loc(event, "blurb", locale), names.length ? names.join(", ") : null, opts.pageUrl, event.luma_url]
    .filter(Boolean)
    .join("\n\n");
  const address = event.venue ? loc(event.venue, "address", locale) : null;
  const location = [venueLabel(event, locale) ?? opts.tbdLabel, address].filter(Boolean).join(", ");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `TAU AI Club · ${title}`,
    dates: `${gcalStamp(event.starts_at)}/${gcalStamp(event.ends_at)}`,
    ctz: TIME_ZONE,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Database text has Hebrew and English columns only, so on the German and French pages it renders
 * in English. Spread this onto the element holding that text so screen readers switch voice.
 */
export function dbLang(locale: Locale): { lang?: "en" } {
  return locale === "de" || locale === "fr" ? { lang: "en" } : {};
}
