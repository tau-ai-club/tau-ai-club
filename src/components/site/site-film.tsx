"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { HeroFilm, HeroFilmToggle } from "@/components/home/hero-film";

/**
 * The home page's moving film on every page (user, 25.11), rendered once in the locale layout, so
 * there is exactly one canvas per page and it keeps running across page changes. Home keeps its
 * tall film (and its own pause button in the hero); every other page gets a band behind the header
 * and the title area that fades out before the content. Everything HeroFilm does stays: nothing
 * under reduced motion or Save-Data, paused off screen and in a hidden tab, starts after hydration
 * (no first-paint or LCP cost), and one remembered pause setting for the whole site.
 */
export function SiteFilm() {
  const home = usePathname() === "/";
  return <HeroFilm variant={home ? "home" : "band"} />;
}

/**
 * The pause button, top end of every page. Not on home (it sits under the hero there) or in the
 * admin area (it sits in the admin top row, next to sign-out: <FilmToggleInline>).
 */
export function SiteFilmToggle() {
  const t = useTranslations("home");
  const path = usePathname();
  // Decided after mount, like the film itself: a rewritten URL (e.g. the admin area while sign-in
  // is off) can have another path on the server than in the browser, which would break hydration.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only decision, see above
  useEffect(() => setMounted(true), []);
  if (!mounted || path === "/" || path === "/admin" || path.startsWith("/admin/")) return null;
  return (
    <div className="relative mx-auto max-w-site">
      <HeroFilmToggle pauseLabel={t("filmPause")} playLabel={t("filmPlay")} className="absolute top-3 end-4 z-10 sm:end-8" />
    </div>
  );
}

/** The same pause button in a row of its own controls (the admin top row). */
export function FilmToggleInline() {
  const t = useTranslations("home");
  return <HeroFilmToggle pauseLabel={t("filmPause")} playLabel={t("filmPlay")} className="relative shrink-0" />;
}
