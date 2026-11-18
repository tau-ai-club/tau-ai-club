import { getLocale, getTranslations } from "next-intl/server";
import { SOCIAL } from "@/config/site";
import { InstagramIcon } from "./instagram-icon";
import { LinkedInIcon } from "./linkedin-icon";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const meta = await getTranslations("meta");
  const locale = await getLocale();
  const en = locale !== "he";

  return (
    <footer className="mt-14 border-t border-border bg-bg-deep">
      <div className="mx-auto grid max-w-site gap-6 px-4 pt-8 pb-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-start lg:gap-8">
          <p className="max-w-[44ch] text-fg-muted">{t("follow")}</p>
          <div className="flex flex-wrap gap-2">
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" data-magnetic="" className="btn btn-ghost h-[2.625rem]">
              <InstagramIcon />
              <bdi dir="ltr">@tau.ai.club</bdi>
            </a>
            {/* Named by its visible text (label in name, WCAG 2.5.3), like the Instagram button. */}
            <a href={SOCIAL.linkedin} target="_blank" rel="noopener noreferrer" data-magnetic="" className="btn btn-ghost h-[2.625rem]">
              <LinkedInIcon />
              <span>{t("linkedin")}</span>
            </a>
          </div>
        </div>
        <p
          {...(en ? { lang: locale } : {})}
          className={
            en
              ? "flex flex-wrap justify-between gap-x-8 gap-y-2 font-pixel text-[0.6875rem] leading-relaxed tracking-[0.22em] text-fg-subtle uppercase"
              : "flex flex-wrap justify-between gap-x-8 gap-y-2 text-[0.8125rem] leading-relaxed font-medium text-fg-subtle"
          }
        >
          <span className="text-brand-purple-soft">{t("tagline")}</span>
          <span>
            {en ? meta("siteName") : <span lang="en">{meta("siteName")}</span>} · <bdi>{new Date().getFullYear()}</bdi>
          </span>
        </p>
      </div>
    </footer>
  );
}
