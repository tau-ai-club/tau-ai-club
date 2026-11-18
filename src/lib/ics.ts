import "server-only";
import type { Locale } from "@/i18n/routing";
import { TIME_ZONE } from "@/i18n/routing";
import type { ClubEvent } from "@/lib/data/types";
import { loc, speakerNames, venueLabel } from "@/lib/event-format";
import { getTranslations } from "next-intl/server";
import { SITE_URL } from "@/config/site";
import { getSeason } from "@/lib/events";

/** Feed path per locale. Static files (no query string) so they stay ISR-cached. */
export const ICS_PATH: Record<Locale, string> = {
  he: "/calendar.ics",
  en: "/calendar-en.ics",
  // No German/French feed: event content is English, so they share the English file.
  de: "/calendar-en.ics",
  fr: "/calendar-en.ics",
};

/**
 * Absolute feed URL, plus the one-click subscribe links built from it. `key` is the members'
 * feed key (src/lib/calendar-access.ts): only pass it on members-only pages.
 */
export function calendarFeedLinks(locale: Locale, key?: string | null) {
  const https = `${SITE_URL}${ICS_PATH[locale]}${key ? `?k=${key}` : ""}`;
  const webcal = https.replace(/^https?:/, "webcal:");
  return {
    https,
    webcal,
    // Google subscribes from a webcal:// URL passed as `cid`, then re-fetches it on its own schedule.
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}

/** RFC 5545 TEXT escaping. */
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line at 75 octets (UTF-8 aware: never split a multi-byte character). */
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * RFC 5545 SEQUENCE: must grow whenever the event changes. Seconds between the season's
 * epoch and the row's last edit, so every edit (updated_at trigger) bumps it.
 */
const SEQUENCE_EPOCH = Date.UTC(2026, 0, 1);
const sequence = (updatedAt: string) => Math.max(0, Math.floor((Date.parse(updatedAt) - SEQUENCE_EPOCH) / 1000));

/**
 * The whole season as an iCalendar feed. Only public fields (titles, blurbs,
 * speaker names, venue): never speaker contact data.
 */
export function buildSeasonIcs(
  events: ClubEvent[],
  locale: Locale,
  opts: { calName: string; calDesc: string; tbdLabel: string; now: Date },
) {
  const prefix = locale === "he" ? "" : `/${locale}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TAU AI Club//Season//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opts.calName)}`,
    `X-WR-CALDESC:${esc(opts.calDesc)}`,
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  const dtstamp = stamp(opts.now.toISOString());

  for (const e of events) {
    const pageUrl = `${SITE_URL}${prefix}/events/${e.slug}`;
    const names = speakerNames(e, locale);
    const description = [loc(e, "blurb", locale), names.length ? names.join(", ") : null, pageUrl, e.luma_url]
      .filter(Boolean)
      .join("\n\n");
    const address = e.venue ? loc(e.venue, "address", locale) : null;
    const location = [venueLabel(e, locale) ?? opts.tbdLabel, address].filter(Boolean).join(", ");

    lines.push(
      "BEGIN:VEVENT",
      // The slug, not the row id: seed-mode ids are regenerated with the fixtures, and a new
      // UID would duplicate every meetup in subscribers' calendars.
      `UID:${e.slug}@tau-ai-club`,
      `DTSTAMP:${dtstamp}`,
      `LAST-MODIFIED:${stamp(e.updated_at)}`,
      `SEQUENCE:${sequence(e.updated_at)}`,
      `DTSTART:${stamp(e.starts_at)}`,
      `DTEND:${stamp(e.ends_at)}`,
      `SUMMARY:${esc(`TAU AI Club · ${loc(e, "title", locale) ?? e.slug}`)}`,
      `DESCRIPTION:${esc(description)}`,
      `LOCATION:${esc(location)}`,
      `URL:${pageUrl}`,
      `STATUS:${e.is_tentative ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Shared GET body for the per-locale feed routes. */
export async function seasonIcsResponse(locale: Locale) {
  const season = await getSeason();
  // On a data error, fail loudly: calendar apps keep their last good copy instead of wiping the season.
  if (season.status !== "ok") return new Response("Season unavailable", { status: 503 });

  const t = await getTranslations({ locale, namespace: "calendarFeed" });
  const te = await getTranslations({ locale, namespace: "event" });
  const cohort = season.cohort ? loc(season.cohort, "name", locale) : null;
  const body = buildSeasonIcs(season.events, locale, {
    calName: cohort ? `TAU AI Club · ${cohort}` : "TAU AI Club",
    calDesc: t("description"),
    tbdLabel: te("venueTbd"),
    now: new Date(season.now),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="tau-ai-club${locale === "he" ? "" : `-${locale}`}.ics"`,
      // Members only while the members area is on: never cache it on the CDN.
      "Cache-Control": "private, max-age=300",
    },
  });
}

/**
 * One meetup as a downloadable .ics ("Add to calendar" in the members' area). Same UID as
 * the season feed, so importing both never duplicates the meetup. Public fields only.
 */
export async function eventIcsResponse(slug: string, locale: Locale) {
  const season = await getSeason();
  if (season.status !== "ok") return new Response("Season unavailable", { status: 503 });
  const event = season.events.find((e) => e.slug === slug);
  if (!event) return new Response("Not found", { status: 404 });
  const te = await getTranslations({ locale, namespace: "event" });
  const t = await getTranslations({ locale, namespace: "calendarFeed" });
  const body = buildSeasonIcs([event], locale, {
    calName: "TAU AI Club",
    calDesc: t("description"),
    tbdLabel: te("venueTbd"),
    now: new Date(season.now),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tau-ai-club-${slug}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
