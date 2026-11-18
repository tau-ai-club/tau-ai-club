import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SOCIAL } from "@/config/site";
import { getViewer } from "@/lib/auth/viewer";
import { AuthPanel, SignedInAs, SignInButton, SignOutButton } from "@/components/auth/auth-buttons";
import { InstagramIcon } from "@/components/site/instagram-icon";

export async function generateMetadata({ params }: PageProps<"/[locale]/members-only">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("membersOnlyTitle"), robots: { index: false, follow: false } };
}

/**
 * Where non-allowlisted people land. No join request, no pending state: the club is
 * closed. Renders nothing about members, so there's nothing to leak. Meant to feel
 * like a friendly door, not an error: the brand card, a warm note, and a real way to
 * stay in touch (Instagram).
 */
export default async function MembersOnlyPage({ params }: PageProps<"/[locale]/members-only">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, te, viewer] = await Promise.all([getTranslations("auth"), getTranslations("event"), getViewer()]);
  if (viewer.kind === "member") redirect({ href: "/me", locale });

  return (
    <AuthPanel
      testId="members-only"
      title={t("membersOnlyTitle")}
      icon={<Sparkles aria-hidden />}
      after={
        <aside className="flex flex-col gap-4 border border-border-accent bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="grid gap-1">
            <h2 className="font-semibold text-fg">{t("membersOnlyFollowTitle")}</h2>
            <p className="max-w-[40ch] text-[0.9375rem] text-fg-muted">{t("membersOnlyFollowBody")}</p>
          </div>
          <a
            href={SOCIAL.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost shrink-0"
          >
            <InstagramIcon className="size-4" />
            {t("membersOnlyFollowCta")}
            <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
            <span className="sr-only"> {te("opensInNewTab")}</span>
          </a>
        </aside>
      }
    >
      <p>{t("membersOnlyBody")}</p>
      {viewer.kind === "outsider" ? (
        <>
          {viewer.email && <SignedInAs label={t("signedInAs")} email={viewer.email} />}
          <div className="flex flex-wrap gap-3">
            {/* Signing out is how you switch to the email that's on the list. */}
            <SignOutButton />
          </div>
        </>
      ) : (
        <>
          <p>{t("membersOnlyGuest")}</p>
          <SignInButton className="w-full sm:w-fit" />
        </>
      )}
    </AuthPanel>
  );
}
