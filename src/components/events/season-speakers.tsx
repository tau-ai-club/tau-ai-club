import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { ClubEvent, Speaker } from "@/lib/data/types";
import { loc } from "@/lib/event-format";
import { SectionHeading } from "@/components/home/section-heading";
import { GridFill, PersonCard } from "./person-card";

/**
 * "Meet our speakers", after the club's Instagram post: each speaker once, in the order they
 * first appear in the season, in cells of the logo grid.
 * Public fields only.
 */
export async function SeasonSpeakers({ events, locale }: { events: ClubEvent[]; locale: Locale }) {
  const seen = new Map<string, Speaker>();
  for (const e of events) for (const { speaker } of e.event_speakers) if (!seen.has(speaker.id)) seen.set(speaker.id, speaker);
  if (seen.size === 0) return null;
  const t = await getTranslations({ locale, namespace: "home" });

  const people = [...seen.values()];
  return (
    <section aria-labelledby="season-speakers-heading" data-testid="season-speakers" className="mx-auto max-w-site px-4 pt-20 sm:px-8 lg:pt-28">
      <SectionHeading id="season-speakers-heading" locale={locale} line1={t("speakersLine1")} line2={t("speakersLine2")} />
      <ul data-build="" className="cell-grid mt-10 grid-cols-2 lg:grid-cols-4">
        {people.map((sp) => (
          <PersonCard
            key={sp.id}
            testId="season-speaker"
            locale={locale}
            name={loc(sp, "name", locale) ?? ""}
            photoUrl={sp.photo_url}
            company={loc(sp, "company", locale)}
            role={loc(sp, "role", locale)}
            linkedinUrl={sp.linkedin_url}
          />
        ))}
        <GridFill n={people.length} />
      </ul>
    </section>
  );
}
