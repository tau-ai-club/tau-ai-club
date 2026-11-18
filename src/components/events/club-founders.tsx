import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { TeamMember } from "@/lib/data/types";
import { loc } from "@/lib/event-format";
import { SectionHeading } from "@/components/home/section-heading";
import { PeopleGrid } from "./people-grid";
import { PersonCard } from "./person-card";

/**
 * "Meet the club's founders", after the club's "Meet our managers" post. Same cards as the
 * season speakers. Role and company are English on both locales. Server-rendered, visible
 * without JS. Public fields only.
 */
export async function ClubFounders({ team, locale }: { team: TeamMember[]; locale: Locale }) {
  if (team.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <section aria-labelledby="club-founders-heading" data-testid="club-founders" className="mx-auto max-w-site px-4 pt-20 sm:px-8 lg:pt-28">
      <SectionHeading id="club-founders-heading" locale={locale} line1={t("foundersLine1")} line2={t("foundersLine2")} />
      <PeopleGrid>
        {team.map((m) => (
          <PersonCard
            key={m.id}
            testId="club-founder"
            locale={locale}
            name={loc(m, "name", locale) ?? ""}
            photoUrl={m.photo_url}
            company={m.company_en}
            role={m.role_en}
            linkedinUrl={m.linkedin_url}
          />
        ))}
      </PeopleGrid>
    </section>
  );
}
