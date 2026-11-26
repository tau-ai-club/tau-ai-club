"use client";

import { usePathname } from "@/i18n/navigation";
import { HeroFilm } from "@/components/home/hero-film";

/**
 * The home page's moving film on every page (user, 25.11), rendered once in the locale layout, so
 * there is exactly one canvas per page and it keeps running across page changes. Home keeps its
 * tall film; every other page gets a band behind the header and the title area that fades out
 * before the content. Everything HeroFilm does stays: nothing under reduced motion or Save-Data,
 * paused off screen and in a hidden tab, starts after hydration (no first-paint or LCP cost). No
 * pause button (user, 26.11).
 */
export function SiteFilm() {
  const home = usePathname() === "/";
  return <HeroFilm variant={home ? "home" : "band"} />;
}
