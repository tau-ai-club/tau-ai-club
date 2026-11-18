import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * The 404 body. Used by [locale]/not-found.tsx and as the server-rendered fallback of the routes that 404.
 * Same language as the home hero: the logo grid behind, one big Silkscreen "404" (digits are Latin, so the
 * pixel font is safe in every locale) closed by the club's caret, then plain words.
 */
export async function NotFoundView({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "errors" });
  return (
    <div className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[34rem] overflow-hidden">
        <div className="hero-grid absolute inset-0 opacity-50" />
        <div className="hero-glow absolute inset-0" />
      </div>
      <div data-testid="not-found" className="mx-auto grid max-w-site gap-3 px-4 pt-14 pb-16 sm:px-8 sm:pt-20">
        <p
          dir="ltr"
          className="intro flex items-end justify-start font-pixel text-[clamp(5rem,26vw,13rem)] leading-[0.82] text-fg [--i:0]"
        >
          <bdi>404</bdi>
          <span aria-hidden className="pixel-caret shrink-0" />
        </p>
        <div className="mt-6 grid max-w-[60ch] gap-3 border-t border-border pt-6">
          <h1 className="intro text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.1] font-extrabold text-balance text-fg [--i:1]">{t("notFoundTitle")}</h1>
          <p className="intro text-[1.0625rem] leading-relaxed text-fg-muted [--i:2]">{t("notFoundBody")}</p>
          <Link href="/" className="btn btn-primary intro mt-3 w-full sm:w-fit [--i:3]">
            {t("goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
