import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["he", "en", "de", "fr"],
  defaultLocale: "he",
  // Hebrew lives at `/`, the others at `/en/...`, `/de/...`, `/fr/...`. German and French are
  // UI-only: content columns exist in Hebrew and English only (see `loc`).
  localePrefix: "as-needed",
  // Visitors always land on Hebrew at `/`. Their choice is remembered via the
  // NEXT_LOCALE cookie only after they pick a language with the switcher.
  localeDetection: false,
  // No `Link:` hreflang response header: it uses the request origin, not SITE_URL
  // (QA audit N6). The same alternates are in each page's <head> and in sitemap.xml.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

export const localeDir: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
  de: "ltr",
  fr: "ltr",
};

/** BCP 47 tag for Intl formatting. Event dates and times are still Israel time. */
export const intlLocale: Record<Locale, string> = { he: "he-IL", en: "en-GB", de: "de-DE", fr: "fr-FR" };

/** Latin-script locales (Silkscreen and mono are allowed); Hebrew uses Rubik. */
export const isLatin = (locale: Locale | string) => locale !== "he";

/** All event times are Israel time, whatever the viewer's timezone. */
export const TIME_ZONE = "Asia/Jerusalem";
