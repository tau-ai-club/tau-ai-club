import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { requireMember } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { getLinkedinMembers } from "@/lib/members/linkedin";
import { signPhotos } from "@/lib/members/photos";
import { MembersEyebrow } from "@/components/members/members-eyebrow";
import { MembersViews } from "@/components/members/members-views";
import { LinkedinList } from "@/components/members/linkedin-list";
import { PixelIcon } from "@/components/home/pixel-icon";

// Members only: no member's name or link goes into the title or any metadata.
export async function generateMetadata({ params }: PageProps<"/[locale]/members/linkedin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "directory" });
  return { title: t("linkedinTitle"), robots: { index: false, follow: false } };
}

/**
 * "להתחבר בלינקדאין / Connect on LinkedIn" (25.11): the members who put a LinkedIn link on their
 * profile, each with name, year and faculty and a button that opens their LinkedIn in a new tab.
 * Members only. Only what members already see on each member's page; nothing new is exposed.
 */
export default async function MembersLinkedinPage({ params }: PageProps<"/[locale]/members/linkedin">) {
  const { locale: l } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const viewer = await requireMember("/members/linkedin");
  const [t, tp] = await Promise.all([getTranslations("directory"), getTranslations("profile")]);

  const supabase = await createClient();
  const list = supabase ? await getLinkedinMembers(supabase, viewer.member.id) : null;
  const photos = list?.length ? await signPhotos(supabase!, list.map((m) => m.photo_url)) : new Map<string, string>();
  const rows = (list ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    subline: [m.year ? tp("yearN", { n: m.year }) : null, m.faculty].filter(Boolean).join(" · "),
    photo: m.photo_url ? (photos.get(m.photo_url) ?? null) : null,
    linkedin: m.linkedin,
  }));

  return (
    <div className="relative isolate">
      <div className="mx-auto grid max-w-site gap-6 px-4 pt-10 pb-20 sm:px-8 lg:pt-14" data-testid="members-linkedin">
        <header className="grid gap-3">
          <MembersEyebrow />
          <h1 className="flex items-center gap-3 text-[clamp(1.875rem,6vw,2.5rem)] leading-[1.1] font-extrabold text-balance text-fg">
            <PixelIcon glyph="people" className="h-8 w-auto md:h-10" />
            {t("title")}
          </h1>
          <MembersViews current="linkedin" />
        </header>

        <section aria-labelledby="linkedin-heading" className="grid max-w-3xl gap-4">
          <div className="grid gap-1.5">
            <h2 id="linkedin-heading" className="text-xl font-bold text-fg">
              {t("linkedinTitle")}
            </h2>
            <p className="max-w-[65ch] text-fg-muted">{t("linkedinBody")}</p>
          </div>
          {!list ? (
            <p role="alert" className="text-fg-muted">
              {t("error")}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-fg-muted" data-testid="linkedin-empty">
              {t("linkedinEmpty")}
            </p>
          ) : (
            <LinkedinList viewerId={viewer.member.id} rows={rows} />
          )}
        </section>
      </div>
    </div>
  );
}
