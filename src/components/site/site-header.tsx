import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LockKeyhole } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SOCIAL } from "@/config/site";
import { authEnabled } from "@/lib/supabase/config";
import { InstagramIcon } from "./instagram-icon";
import { LinkedInIcon } from "./linkedin-icon";
import { LanguageSwitch } from "./language-switch";
import { MemberAction, MemberSectionLinks } from "./member-nav";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const meta = await getTranslations("meta");
  const tc = await getTranslations("content");
  const authOn = authEnabled();
  // Same HTML for everyone (public pages stay cacheable).
  // Members area on: Lectures and Workshops are members-only, so guests don't see them in the
  // nav; a client island shows them after a member logs in (see member-nav.tsx).
  // Members area off: the public preview tabs (Workshops with a lock) as before.
  const sectionLinks = (className: string) =>
    authOn ? (
      <MemberSectionLinks
        lectures={tc("navLectures")}
        workshops={tc("navWorkshops")}
        className={className}
        linkClassName={navLinkClass}
      />
    ) : (
      <ul className={className}>
        <li>
          <Link href="/lectures" className={navLinkClass}>
            {tc("navLectures")}
          </Link>
        </li>
        <li>
          <Link href="/workshops" className={navLinkClass}>
            {tc("navWorkshops")}
            <LockKeyhole aria-hidden className="size-3.5 text-fg-subtle" />
            <span className="sr-only"> ({tc("navMembersOnly")})</span>
          </Link>
        </li>
      </ul>
    );

  return (
    <header className="relative z-10">
      <nav
        aria-label={t("label")}
        className="mx-auto flex h-16 max-w-site items-center justify-between gap-4 px-4 sm:px-8 lg:h-[4.75rem]"
      >
        {/* Logo sits at the start (right in Hebrew, left in English). Never mirrored. */}
        <Link
          href="/"
          className="intro-fade inline-flex items-center rounded-sm"
          aria-label={`${meta("siteName")} · ${t("home")}`}
        >
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={520}
            height={322}
            // Audit N4: the slot is 65px wide (78px from lg), so ask for a small file, not w=640.
            sizes="(min-width: 1024px) 78px, 65px"
            priority
            className="h-10 w-auto [image-rendering:pixelated] lg:h-12"
          />
        </Link>
        {sectionLinks("intro-fade me-auto ms-4 hidden items-center gap-1.5 sm:flex [--i:1] lg:ms-8")}
        <div className="intro-fade flex items-center gap-1.5 [--i:1]">
          <a
            href={SOCIAL.instagram}
            target="_blank"
            rel="noopener noreferrer"
            data-magnetic=""
            aria-label={t("instagramLabel")}
            className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <InstagramIcon className="size-[18px]" />
          </a>
          <a
            href={SOCIAL.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            data-magnetic=""
            aria-label={t("linkedinLabel")}
            className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <LinkedInIcon className="size-[18px]" />
          </a>
          {/* Hidden while the members area is off (authEnabled(): no AUTH_ENABLED / Supabase, or seed mode).
              Guests see "Member log in"; after a member logs in, "My area". */}
          {authOn && (
            <MemberAction
              login={t("signIn")}
              myArea={t("myArea")}
              // Guests: the one purple action in the header. Members: a quiet pill back to their area.
              className="btn btn-primary h-9 px-3.5 text-[0.8125rem]"
              memberClassName="inline-flex h-9 items-center rounded-full border border-border-accent bg-brand-purple/10 px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-fg transition-colors duration-150 hover:bg-brand-purple/20"
            />
          )}
          <LanguageSwitch />
        </div>
      </nav>
      <nav aria-label={tc("navLabel")} className="sm:hidden">
        {sectionLinks("-mt-1 flex items-center gap-1.5 overflow-x-auto px-2.5 pb-2")}
      </nav>
    </header>
  );
}

const navLinkClass =
  // Option 1 (user, 18.11): a thin frame on each tab so it reads as something to tap.
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-fg/25 px-3 text-[0.875rem] font-medium whitespace-nowrap text-fg transition-colors duration-150 hover:border-border-accent hover:bg-surface-hover";
