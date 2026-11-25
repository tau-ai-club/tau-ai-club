import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireMember } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { getMemberDirectory } from "@/lib/members/directory";
import { signPhotos } from "@/lib/members/photos";
import { raisedPanelClass } from "@/components/admin/styles";
import { MemberAvatar } from "@/components/members/member-avatar";
import { ProfileSubline } from "@/components/members/profile-subline";
import { MembersEyebrow } from "@/components/members/members-eyebrow";
import { MembersViews } from "@/components/members/members-views";
import { PixelIcon } from "@/components/home/pixel-icon";
import { cn } from "@/lib/utils";

// Members only: no member's name goes into the title or any metadata.
export async function generateMetadata({ params }: PageProps<"/[locale]/members">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "directory" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * "חברי המועדון / Members" (DECISIONS 25.11): everyone in the club, for signed-in members only.
 * Guests sign in; outsiders get the members-only page. The list comes from member_directory()
 * (members-only in the database: empty for anyone else) and shows only what it returns to
 * members: name, photo, year, faculty. Each entry opens the member's page.
 */
export default async function MembersPage({ params }: PageProps<"/[locale]/members">) {
  const { locale: l } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const viewer = await requireMember("/members");
  const [t, tp] = await Promise.all([getTranslations("directory"), getTranslations("profile")]);

  const supabase = await createClient();
  const list = supabase ? await getMemberDirectory(supabase) : null;
  const photos = list ? await signPhotos(supabase!, list.map((m) => m.photo_url)) : new Map<string, string>();
  const Forward = locale === "he" ? ChevronLeft : ChevronRight;

  return (
    <div className="relative isolate">
      <div className="mx-auto grid max-w-site gap-6 px-4 pt-10 pb-20 sm:px-8 lg:pt-14" data-testid="members-directory">
        <header className="grid gap-3">
          <MembersEyebrow />
          <h1 className="flex items-center gap-3 text-[clamp(1.875rem,6vw,2.5rem)] leading-[1.1] font-extrabold text-balance text-fg">
            <PixelIcon glyph="people" className="h-8 w-auto md:h-10" />
            {t("title")}
          </h1>
          <MembersViews current="all" />
          <p className="max-w-[60ch] text-[1.0625rem] text-fg-muted">{t("body")}</p>
          {list && list.length > 0 && (
            <p className="text-sm text-fg-subtle" data-testid="members-count">
              {t.rich("count", { n: list.length, b: (c) => <bdi>{c}</bdi> })}
            </p>
          )}
        </header>

        {!list ? (
          <p role="alert" className="text-fg-muted">
            {t("error")}
          </p>
        ) : list.length === 0 ? (
          <p className="text-fg-muted">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => (
              <li key={m.id} data-testid="directory-member">
                <Link
                  href={`/members/${m.id}`}
                  className={cn(
                    raisedPanelClass,
                    "group flex h-full items-center gap-4 p-4 transition-colors duration-150 hover:border-border-accent hover:bg-surface-hover",
                  )}
                >
                  <MemberAvatar name={m.full_name} src={m.photo_url ? (photos.get(m.photo_url) ?? null) : null} size={56} />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="font-semibold text-fg">
                      <bdi>{m.full_name}</bdi>
                      {m.id === viewer.member.id && <span className="ms-2 text-sm font-normal text-brand-purple-soft">{t("you")}</span>}
                    </span>
                    <ProfileSubline parts={[m.year ? tp("yearN", { n: m.year }) : null, m.faculty]} className="text-sm text-fg-subtle" />
                  </span>
                  <Forward aria-hidden className="size-5 shrink-0 text-fg-subtle transition-colors group-hover:text-brand-purple-soft" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
