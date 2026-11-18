"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import NextLink from "next/link";
import { usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/seo";
import { LocaleFlag } from "./flags";

/** Each language is named in itself, so it is readable whatever the current language is. */
const NATIVE_NAME: Record<Locale, string> = { he: "עברית", en: "English", de: "Deutsch", fr: "Français" };

/** Flag button that opens a list of all languages; each is a link to the same page in that language. */
export function LanguageSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  // Locale-free path, e.g. "/events/zero-to-hero-1".
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="language-list"
        aria-label={`${t("language")}: ${NATIVE_NAME[locale]}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 min-w-11 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg max-sm:h-11"
      >
        <LocaleFlag locale={locale} />
        <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true" className="shrink-0">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <ul
          id="language-list"
          className="absolute end-0 top-full z-50 mt-2 min-w-44 rounded-lg border border-border-accent bg-bg p-1 shadow-lg"
        >
          {routing.locales.map((target) => (
            <li key={target}>
              {/* A plain link to the final URL: next-intl's Link writes `/he/...` for the default
                  locale, which then 307s to `/...` (QA audit S6). Locale detection is off, so no cookie is needed. */}
              <NextLink
                href={localizedPath(target, pathname)}
                lang={target}
                hrefLang={target}
                aria-current={target === locale ? "true" : undefined}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2.5 rounded-md px-3 text-[0.875rem] text-fg transition-colors duration-150 hover:bg-surface-hover aria-[current=true]:bg-brand-purple/15 aria-[current=true]:font-semibold"
              >
                <LocaleFlag locale={target} />
                <span>{NATIVE_NAME[target]}</span>
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
