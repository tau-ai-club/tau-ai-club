import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Hebrew, Silkscreen } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeDir, routing, type Locale } from "@/i18n/routing";
import { IS_PRODUCTION, SITE_URL } from "@/config/site";
import { alternatesFor, shareMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/site/site-header";
import { NavProgress } from "@/components/site/nav-progress";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { PageBackdrop } from "@/components/site/page-backdrop";
import { SiteFilm } from "@/components/site/site-film";
import { PixelTrail } from "@/components/motion/pixel-trail";
import "../globals.css";

// The site's one sans, Hebrew and Latin (DECISIONS 23.11, motion + fonts option 1). Self-hosted by
// next/font with a size-adjusted fallback, so the swap doesn't shift the layout. No 800: bold is 700.
const plexSans = IBM_Plex_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});
const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-silkscreen",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const INTRO_ONCE_SCRIPT =
  "try{var k='tau-intro-seen';if(sessionStorage.getItem(k))document.documentElement.setAttribute('data-intro-seen','');sessionStorage.setItem(k,'1')}catch(e){}";

/**
 * iPhone opening screens for the home-screen app (designer's part 2, public/home-screen/launch/).
 * iOS picks the one whose media query matches the phone exactly, so there's one per screen size:
 * CSS width x height at a pixel ratio, and the file is that size in device pixels.
 */
const IPHONE_SCREENS: [width: number, height: number, ratio: number][] = [
  [440, 956, 3],
  [402, 874, 3],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 3],
  [414, 896, 2],
  [375, 667, 2],
  [414, 736, 3],
  [320, 568, 2],
];
const IPHONE_LAUNCH_IMAGES = IPHONE_SCREENS.map(([w, h, r]) => ({
  url: `/home-screen/launch/launch-${w * r}x${h * r}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
}));

// The site never offers "add to home screen" (DECISIONS 19.11, changed): members add it themselves
// from the browser menu, which keeps working. preventDefault only keeps Android Chrome's own
// pop-up mini-bar off our pages; nothing stores or replays the prompt.
const NO_INSTALL_PROMPT_SCRIPT = "addEventListener('beforeinstallprompt',function(e){e.preventDefault()})";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0b0a1f",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: t("siteName"),
    title: { default: t("title"), template: `%s · ${t("siteName")}` },
    description: t("description"),
    alternates: alternatesFor(locale, "/"),
    ...shareMetadata({
      locale,
      path: "/",
      title: t("title"),
      description: t("description"),
      siteName: t("siteName"),
      imageAlt: t("ogAlt"),
    }),
    // Home screen (option 2): iPhone uses these for the icon's name and its own window. The
    // manifest link comes from src/app/manifest.ts, the icon from src/app/apple-icon.png.
    appleWebApp: { capable: true, title: "TAU AI Club", statusBarStyle: "default", startupImage: IPHONE_LAUNCH_IMAGES },
    // Preview deployments must not be indexed; only production is.
    robots: IS_PRODUCTION ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "nav" });

  return (
    <html
      lang={locale}
      dir={localeDir[locale as Locale]}
      className={`dark ${plexSans.variable} ${silkscreen.variable} ${plexMono.variable} h-full`}
      // The intro script below may add data-intro-seen before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* Play the home intro once per session (design/motion-spec.md §2). Runs before paint. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_ONCE_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: NO_INSTALL_PROMPT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-fg"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Suspense fallback={null}>
            <NavProgress />
          </Suspense>
          {/* One background and one cursor trail for every page (25.11): pages don't add their own. */}
          <div className="relative isolate flex flex-1 flex-col">
            <PageBackdrop />
            {/* The home film, on every page (25.11): one canvas, behind the header and the title area. */}
            <SiteFilm />
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
          </div>
          <SiteFooter />
          <PixelTrail />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
