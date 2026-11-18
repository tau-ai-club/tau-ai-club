import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Handshake, Unlink } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { createPublicClient } from "@/lib/supabase/public";
import { formatShortDate, loc } from "@/lib/event-format";
import { AuthChip, AuthPanel } from "@/components/auth/auth-buttons";
import { SpeakerContactForm } from "@/components/speaker/speaker-contact-form";
import { submitSpeakerContact } from "./actions";

// One page per secret token: never cache, never index, never leak the URL via Referer.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/speaker/[token]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "speakerForm" });
  return {
    title: t("eyebrow"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

type Info = { name_he: string; name_en: string; expires_at: string };

/**
 * The speaker's consent form. The reader is an outside guest who got a link by
 * message, so the page leads with who is asking and why, shows the link's limits,
 * and makes every choice explicit (see SpeakerContactForm).
 */
export default async function SpeakerFormPage({ params }: PageProps<"/[locale]/speaker/[token]">) {
  const { locale: l, token } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("speakerForm");

  const supabase = createPublicClient();
  const valid = /^[0-9a-f]{64}$/.test(token);
  const { data } = supabase && valid ? await supabase.rpc("speaker_form_info", { p_token: token }) : { data: null };
  const info = (Array.isArray(data) ? data[0] : null) as Info | null;

  if (!info) {
    return (
      <AuthPanel testId="speaker-form-invalid" title={t("invalidTitle")} icon={<Unlink aria-hidden />}>
        <p>{t("invalidBody")}</p>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      wide
      testId="speaker-form"
      icon={<Handshake aria-hidden />}
      eyebrow={<AuthChip locale={locale}>{t("eyebrow")}</AuthChip>}
      title={t("title", { name: loc(info, "name", locale) ?? "" })}
    >
      <p className="max-w-[60ch]">{t("intro")}</p>
      <p className="flex w-fit items-center gap-2 rounded-[3px] border border-border bg-bg-deep/45 px-3 py-2 text-sm text-fg-muted">
        <Clock aria-hidden className="size-4 shrink-0 text-brand-purple-soft" />
        <span>{t("expires", { date: formatShortDate(info.expires_at, locale) })}</span>
      </p>
      <SpeakerContactForm
        action={submitSpeakerContact}
        token={token}
        labels={{
          shareEmail: t("shareEmail"),
          sharePhone: t("sharePhone"),
          shareLinkedin: t("shareLinkedin"),
          linkedinPublic: t("linkedinPublic"),
          email: t("email"),
          phone: t("phone"),
          linkedin: t("linkedin"),
          linkedinHint: t("linkedinHint"),
          membersOnlyNote: t("membersOnlyNote"),
          visibleMembers: t("visibleMembers"),
          consent: t("consent"),
          submit: t("submit"),
          doneTitle: t("doneTitle"),
          doneBody: t("doneBody"),
        }}
      />
      <p className="border-t border-border pt-4 text-sm text-fg-subtle">{t("signoff")}</p>
    </AuthPanel>
  );
}
