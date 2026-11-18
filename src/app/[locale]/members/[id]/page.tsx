import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Globe, Link2, Mail, Pencil, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireMember } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { loc } from "@/lib/event-format";
import { signPhotos } from "@/lib/members/photos";
import { getMemberContact, getMemberProfile, LINK_KEYS } from "@/lib/members/profile";
import { raisedPanelClass, smallBtn } from "@/components/admin/styles";
import { MemberAvatar } from "@/components/members/member-avatar";
import { ProfileSubline } from "@/components/members/profile-subline";
import { MembersEyebrow } from "@/components/members/members-eyebrow";
import { PanelHeading } from "@/components/members/panel-heading";
import { PageBackdrop } from "@/components/site/page-backdrop";
import { cn } from "@/lib/utils";

// Members only: no member's name goes into the title or any metadata.
export async function generateMetadata({ params }: PageProps<"/[locale]/members/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return { title: t("memberTitle"), robots: { index: false, follow: false } };
}

/** Read-only profile of one member, for members. Guests sign in; outsiders get the members-only page. */
export default async function MemberPage({ params }: PageProps<"/[locale]/members/[id]">) {
  const { locale: l, id } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  await requireMember(`/members/${id}`);
  const [t, te] = await Promise.all([getTranslations("profile"), getTranslations("event")]);

  const supabase = await createClient();
  const profile = supabase ? await getMemberProfile(supabase, id) : null;
  if (!supabase || !profile) notFound();

  const [photos, contact] = await Promise.all([signPhotos(supabase, [profile.photo_url]), getMemberContact(supabase, id)]);
  const photoSrc = profile.photo_url ? (photos.get(profile.photo_url) ?? null) : null;
  const bio = loc(profile, "bio", locale);
  const links = LINK_KEYS.filter((k) => profile.links?.[k]);
  const subline = [profile.year ? t("yearN", { n: profile.year }) : null, profile.faculty, profile.program];

  return (
    <article className="relative isolate" data-testid="member-profile">
      <PageBackdrop />
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-20 sm:px-8 lg:pt-14">
        <MembersEyebrow />
        {/* 1px frame of the same stepped shape (clip-path would cut a real border at the corners). */}
        <div className="pixel-corners mt-3 bg-brand-purple/40 p-px [--px:6px]">
        <header className="pixel-corners flex flex-col gap-5 bg-bg-raised p-6 shadow-[var(--highlight-top)] [--px:6px] [background-image:var(--card-featured-bg)] sm:flex-row sm:items-center sm:gap-7 sm:p-8">
          <MemberAvatar name={profile.full_name} src={photoSrc} size={128} />
          <div className="grid min-w-0 gap-2">
            <h1 className="text-[clamp(1.875rem,6vw,2.5rem)] leading-[1.1] font-extrabold text-balance text-fg">{profile.full_name}</h1>
            <ProfileSubline parts={subline} className="text-fg-muted" />
            {profile.is_self && (
              <Link href="/me" className={cn(smallBtn, "mt-2 w-fit")}>
                <Pencil aria-hidden />
                {t("edit")}
              </Link>
            )}
          </div>
        </header>
        </div>

        <div className={cn("mt-5 grid items-start gap-5", (links.length > 0 || contact) && "md:grid-cols-[minmax(0,1fr)_16rem]")}>
          <section aria-label={t("about")} className={cn(raisedPanelClass, "p-5 sm:p-6")}>
            <PanelHeading locale={locale}>{t("about")}</PanelHeading>
            {bio ? (
              <p className="mt-4 max-w-[65ch] text-[1.0625rem] leading-relaxed whitespace-pre-line text-fg-muted">{bio}</p>
            ) : (
              <p className="mt-4 text-fg-subtle">{t("noBio")}</p>
            )}
          </section>

          {(links.length > 0 || contact) && (
            <div className="grid gap-5">
              {contact && (
                <section aria-labelledby="contact-heading" className={cn(raisedPanelClass, "p-5 sm:p-6")} data-testid="member-contact">
                  <PanelHeading id="contact-heading" locale={locale}>
                    {t("contact")}
                  </PanelHeading>
                  <ul className="mt-4 grid gap-2 text-[0.9375rem]">
                    {contact.phone && (
                      <li className="flex items-center gap-2.5">
                        <Phone aria-hidden className="size-4 shrink-0 text-brand-purple-soft" />
                        <span className="sr-only">{t("phone")}: </span>
                        <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="inline-flex min-h-11 items-center font-mono text-fg underline-offset-4 hover:underline">
                          {contact.phone}
                        </a>
                      </li>
                    )}
                    {contact.contact_email && (
                      <li className="flex items-center gap-2.5">
                        <Mail aria-hidden className="size-4 shrink-0 text-brand-purple-soft" />
                        <span className="sr-only">{t("contactEmail")}: </span>
                        <a href={`mailto:${contact.contact_email}`} dir="ltr" className="inline-flex min-h-11 items-center font-mono break-all text-fg underline-offset-4 hover:underline">
                          {contact.contact_email}
                        </a>
                      </li>
                    )}
                  </ul>
                </section>
              )}
            {links.length > 0 && (
              <section aria-labelledby="links-heading" className={cn(raisedPanelClass, "p-5 sm:p-6")}>
                <PanelHeading id="links-heading" locale={locale}>
                  {t("links")}
                </PanelHeading>
                <ul className="cell-grid mt-4 [&_:focus-visible]:outline-offset-[-2px]">
                  {links.map((k) => {
                    const Icon = k === "website" ? Globe : Link2;
                    return (
                      <li key={k}>
                        <a
                          href={profile.links[k]}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-[0.9375rem] font-medium text-fg transition-colors duration-150 hover:bg-surface-hover"
                        >
                          <Icon aria-hidden className="size-4 shrink-0 text-brand-purple-soft" />
                          <span className="grow">{t(`link_${k}`)}</span>
                          <ArrowUpRight aria-hidden className="size-4 shrink-0 text-fg-subtle rtl:-scale-x-100" />
                          <span className="sr-only"> {te("opensInNewTab")}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
        </div>
      </div>
    </article>
  );
}
