import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getViewer } from "@/lib/auth/viewer";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { SignOutButton } from "@/components/auth/auth-buttons";
import { FilmToggleInline } from "@/components/site/site-film";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Admin area chrome. The guard lives in each page (requireAdmin with its own path, so
 * sign-in returns to the right page); RLS checks every query. Non-admins never see
 * the chrome: their page redirects or 404s.
 */
export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const viewer = await getViewer();
  if (viewer.kind !== "member" || viewer.member.role !== "admin") return children;
  const [t, tc, locale] = await Promise.all([getTranslations("admin"), getTranslations("content"), getLocale()]);
  return (
    <div className="mx-auto grid max-w-site grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-8 pb-20 sm:px-8 lg:pt-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className={locale === "he" ? "eyebrow-he text-sm" : "eyebrow-pixel text-[0.6875rem]"}>{t("eyebrow")}</p>
          <div className="flex min-w-0 items-center gap-3 text-sm text-fg-subtle">
            <FilmToggleInline />
            <bdi dir="ltr" className="truncate font-mono text-[0.8125rem]">
              {viewer.email}
            </bdi>
            <SignOutButton className="h-9 shrink-0 px-3 text-sm" />
          </div>
        </div>
        <AdminTabs
          label={t("navLabel")}
          tabs={[
            { href: "/admin", label: t("overviewTab"), exact: true },
            { href: "/admin/events", label: t("eventsTab") },
            { href: "/admin/venues", label: t("venuesTab") },
            { href: "/admin/speaker-profiles", label: t("speakerProfilesTab") },
            { href: "/admin/members", label: t("membersTab") },
            { href: "/admin/attendance", label: t("attendanceTab") },
            { href: "/admin/pair", label: t("pairTab") },
            { href: "/admin/initiatives", label: t("initiativesTab") },
            { href: "/admin/content", label: tc("adminTab") },
          ]}
        />
      </div>
      {children}
    </div>
  );
}
