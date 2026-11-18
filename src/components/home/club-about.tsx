import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PixelIcon } from "./pixel-icon";
import { SectionHeading } from "./section-heading";

/** Last year's speakers' companies and the club's partners, from the recruiting post. Names only, never logos. */
const MET_WITH = ["Google", "Microsoft", "MongoDB", "Aleph", "Herzog Fox & Neeman"] as const;

/**
 * "About the club", in the club's own words from the cohort 02 recruiting post
 * (brand/instagram/recruiting-cohort-02.jpg, design/launch/NOTES.md). Server-rendered, no motion.
 */
export async function ClubAbout({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });
  const cells = [
    { n: 1, glyph: "week" },
    { n: 2, glyph: "build" },
    { n: 3, glyph: "people" },
  ] as const;
  return (
    <section aria-labelledby="club-about-heading" data-testid="club-about" className="mx-auto max-w-site px-4 pt-20 sm:px-8 lg:pt-28">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-end lg:gap-12">
        <SectionHeading id="club-about-heading" locale={locale} line1={t("aboutLine1")} line2={t("aboutLine2")} />
        <p className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted lg:pb-2 lg:text-[1.125rem]">{t("aboutLead")}</p>
      </div>

      <ul data-build="" className="cell-grid mt-10 md:grid-cols-3">
        {cells.map(({ n, glyph }) => (
          <li key={n} className="grid content-start gap-4 p-6 lg:p-7">
            <PixelIcon glyph={glyph} className="h-11 w-auto" />
            <div>
              <h3 className="text-[1.25rem] leading-tight font-bold text-fg">{t(`about${n}Title`)}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-pretty text-fg-muted">{t(`about${n}Body`)}</p>
            </div>
          </li>
        ))}
        <li className="grid gap-3 p-6 md:col-span-2 lg:p-7">
          <NameRow label={t("metWith")} names={MET_WITH.map((n) => ({ name: n, lang: "en" as const }))} />
        </li>
        <li className="grid gap-3 p-6 lg:p-7">
          <NameRow
            label={t("partners")}
            names={[
              { name: "Entrée Capital", lang: "en" as const },
              { name: t("partnerTau"), lang: locale },
            ]}
          />
        </li>
      </ul>
      {/* The recruiting post's tagline: Silkscreen in English, Rubik in Hebrew (Silkscreen has no Hebrew). */}
      {locale === "en" ? (
        <p lang="en" dir="ltr" className="mt-4 font-pixel text-[0.6875rem] tracking-[0.14em] text-fg-subtle">
          {t("aboutTagline")}
        </p>
      ) : (
        <p className="mt-4 text-[0.9375rem] font-medium text-fg-subtle">{t("aboutTagline")}</p>
      )}
    </section>
  );
}

function NameRow({ label, names }: { label: string; names: { name: string; lang: string }[] }) {
  return (
    <>
      <p className="text-[0.8125rem] text-fg-subtle">{label}</p>
      <ul className="flex flex-wrap items-center gap-y-1.5 text-[1.0625rem] font-semibold text-fg">
        {names.map(({ name, lang }, i) => (
          <li key={name} lang={lang} className="flex items-center whitespace-nowrap">
            {i > 0 && <span aria-hidden className="mx-3.5 size-[5px] bg-brand-purple" />}
            {name}
          </li>
        ))}
      </ul>
    </>
  );
}
