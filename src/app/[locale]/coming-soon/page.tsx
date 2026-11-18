import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Hourglass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SOCIAL } from "@/config/site";
import { AuthChip, AuthPanel } from "@/components/auth/auth-buttons";
import { InstagramIcon } from "@/components/site/instagram-icon";

export async function generateMetadata({ params }: PageProps<"/[locale]/coming-soon">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "comingSoon" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Shown instead of every members/admin route while the members area is off
 * (authEnabled() false). src/proxy.ts rewrites /login, /admin/…, /profile, … here, so
 * the URL stays. Static, reads no cookies and renders nothing about members.
 */
export default async function ComingSoonPage({ params }: PageProps<"/[locale]/coming-soon">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, te] = await Promise.all([getTranslations("comingSoon"), getTranslations("event")]);

  return (
    <AuthPanel
      testId="coming-soon"
      icon={<Hourglass aria-hidden />}
      eyebrow={<AuthChip locale={locale}>{t("eyebrow")}</AuthChip>}
      title={t("title")}
    >
      <p>{t("body")}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary w-full sm:w-fit">
          {t("home")}
        </Link>
        <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost w-full sm:w-fit">
          <InstagramIcon className="size-4" />
          {t("instagram")}
          <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
          <span className="sr-only"> {te("opensInNewTab")}</span>
        </a>
      </div>
    </AuthPanel>
  );
}
