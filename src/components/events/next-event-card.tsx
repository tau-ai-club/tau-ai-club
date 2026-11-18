import { getLocale, getTranslations } from "next-intl/server";
import { intlLocale, type Locale } from "@/i18n/routing";
import { TIME_ZONE } from "@/i18n/routing";
import type { SeasonEvent } from "@/lib/data/types";
import { formatEventDate, formatShortDate, formatTimeRange, isoAttr, loc, venueIsTbd, venueLabel } from "@/lib/event-format";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { EventActions, EventPills, Tag } from "./event-bits";
import { FlyerChip, InfoTile, SpeakerAvatar, splitTitle } from "./flyer-bits";

/** Whole calendar days from `nowIso` to the event's start, counted in Israel time. */
function daysUntil(startIso: string, nowIso: string) {
  const day = (iso: string) => {
    const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(iso))
      .split("-")
      .map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.max(0, Math.round((day(startIso) - day(nowIso)) / 86_400_000));
}

/**
 * The Next event card. Server-rendered and fully visible in the first HTML:
 * no client JS, no entrance animation, never hidden waiting for an intro
 * (design/motion-spec.md §0).
 */
export async function NextEventCard({
  event,
  now,
  seriesTotal,
  className,
}: {
  event: SeasonEvent | null;
  /** Server "now" (ISO) the season was classified against. */
  now: string;
  /** Number of events in this event's series this season (for "session n of total"). */
  seriesTotal?: number;
  className?: string;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("event");
  const live = event?.state === "live";
  const tp = await getTranslations("eventPage");
  const blurb = event ? loc(event, "blurb", locale) : null;
  const title = splitTitle(event ? (loc(event, "title", locale) ?? event.slug) : "");
  const venue = event ? venueLabel(event, locale) : null;
  const weekday = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TIME_ZONE, weekday: "short" }).format(new Date(iso));

  return (
    <section
      aria-labelledby="next-event-heading"
      data-testid="next-event-card"
      data-event-slug={event?.slug ?? ""}
      className={cn(
        "relative rounded-lg border border-border-accent bg-bg-raised p-5 shadow-[var(--shadow-featured)] [background-image:var(--card-featured-bg)] lg:p-7",
        className,
      )}
    >
      {/* Corner brackets, as on the club's PDF covers. */}
      <span aria-hidden className="absolute -top-px -start-px size-3.5 rounded-ss-lg border-s-2 border-t-2 border-brand-purple" />
      <span aria-hidden className="absolute -top-px -end-px size-3.5 rounded-se-lg border-e-2 border-t-2 border-brand-purple" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FlyerChip locale={locale} id="next-event-heading">
          {live ? t("happeningNow") : t("nextEvent")}
        </FlyerChip>
        {event && !live && daysUntil(event.starts_at, now) === 0 && (
          // Meetup is today: say it loudly (text, not just color).
          <p className="tag tag-next gap-2 text-[0.8125rem]">
            <span aria-hidden className="size-1.5 bg-on-purple" />
            {t("today")}
          </p>
        )}
        {event && !live && daysUntil(event.starts_at, now) > 0 && (
          <p className={cn("text-[0.8125rem] font-medium text-brand-purple-softer", locale !== "he" && "font-mono")}>
            {t("relativeDays", { days: daysUntil(event.starts_at, now) })}
          </p>
        )}
      </div>

      {event ? (
        <>
          <h2 className="mt-5 text-[clamp(1.5rem,6vw,2rem)] leading-[1.12] font-extrabold text-balance">
            <Link href={`/events/${event.slug}`} className="rounded-sm transition-colors duration-150 hover:text-brand-purple-softer">
              {title.head}
              {title.accent && (
                <>
                  {" "}
                  <span className="text-brand-purple">{title.accent}</span>
                </>
              )}
              {title.tail && <span className="mt-1.5 block text-[1.0625rem] leading-snug font-semibold text-fg-muted">{title.tail}</span>}
            </Link>
          </h2>
          {event.series_no && seriesTotal && seriesTotal > 1 ? (
            <p className="mt-1.5 text-[0.9375rem] text-fg-subtle">
              {t("seriesPosition", { n: event.series_no, total: seriesTotal })}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 empty:hidden">
            <EventPills event={event} showState={false} />
          </div>

          {event.event_speakers.length > 0 && (
            <ul className="mt-4 grid gap-3">
              {event.event_speakers.map(({ speaker }) => {
                const name = loc(speaker, "name", locale) ?? "";
                const line = [loc(speaker, "role", locale), loc(speaker, "company", locale)].filter(Boolean).join(" · ");
                return (
                  <li key={speaker.id} className="flex items-center gap-3">
                    <SpeakerAvatar name={name} photoUrl={speaker.photo_url} size={48} />
                    <div className="min-w-0">
                      <p className="leading-tight font-semibold text-fg">
                        <span className="sr-only">{tp("speakers")}: </span>
                        {name}
                      </p>
                      {line && <p className="mt-0.5 text-sm leading-snug text-fg-subtle">{line}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-2.5">
            <InfoTile
              compact
              locale={locale}
              label={tp("date")}
              value={
                <>
                  {weekday(event.starts_at)},{" "}
                  <bdi dir="ltr" className="font-mono font-medium">
                    {formatShortDate(event.starts_at, locale)}
                  </bdi>
                  <span className="sr-only">
                    {" "}
                    <time dateTime={isoAttr(event.starts_at)}>{formatEventDate(event.starts_at, locale)}</time>
                  </span>
                </>
              }
            />
            <InfoTile
              compact
              locale={locale}
              label={tp("time")}
              value={
                <bdi dir="ltr" className="font-mono font-medium whitespace-nowrap">
                  {formatTimeRange(event.starts_at, event.ends_at)}
                </bdi>
              }
            />
            <InfoTile
              compact
              locale={locale}
              className="col-span-2"
              label={tp("where")}
              value={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {venue && <span>{venue}</span>}
                  {venueIsTbd(event) && <Tag tone="tbd">{t("venueTbd")}</Tag>}
                </span>
              }
            />
          </dl>

          {blurb && (
            <p className="mt-4 max-w-[68ch] rounded-md border border-border bg-bg-deep/45 px-3.5 py-3 text-[0.9375rem] leading-relaxed text-fg-muted">
              {blurb}
            </p>
          )}

          <EventActions event={event} className="mt-5" />
        </>
      ) : (
        <div className="mt-4 grid gap-2">
          <h2 className="text-h3 font-semibold">{t("noUpcomingTitle")}</h2>
          <p className="text-fg-subtle">{t("noUpcomingBody")}</p>
        </div>
      )}
    </section>
  );
}
