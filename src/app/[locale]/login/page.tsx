import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { KeyRound, Mail, MailCheck, UserRoundCheck } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth/viewer";
import { safeNext } from "@/lib/auth/next-path";
import { AuthAlert, AuthChip, AuthPanel, SignedInAs, SignOutButton } from "@/components/auth/auth-buttons";
import { hintClass, inputClass, labelClass } from "@/components/admin/styles";
import { SOCIAL } from "@/config/site";
import { cn } from "@/lib/utils";

/** Progress through the log-in: email → code → in. Decorative; the title says where you are. */
function Steps({ on }: { on: 1 | 2 | 3 }) {
  return (
    <span aria-hidden className="flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <i key={n} className={cn("h-1.5 flex-1", n <= on ? "bg-brand-purple" : "bg-border-strong")} />
      ))}
    </span>
  );
}

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle"), robots: { index: false, follow: false } };
}

const ERRORS = {
  cancelled: "errorCancelled",
  failed: "errorFailed",
  unavailable: "errorUnavailable",
  email: "errorEmail",
  code: "errorCode",
  expired: "errorExpired",
  throttled: "errorThrottled",
} as const;

/**
 * "Member log in" with an email code (no public sign-up). Step 1 posts the email to /api/auth/otp; step 2
 * (?sent=1) posts the code to /api/auth/verify. Plain forms: works without JavaScript.
 * The pending email is kept in an HttpOnly cookie, never in the URL or this page.
 */
export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/me");
  const sent = sp.sent === "1";
  const errorKey = typeof sp.error === "string" && sp.error in ERRORS ? ERRORS[sp.error as keyof typeof ERRORS] : null;

  const [t, nav, viewer] = await Promise.all([getTranslations("auth"), getTranslations("nav"), getViewer()]);
  const l = locale as Locale;
  // Step 2 and "signed in": the chip keeps "Member log in" in view under the new title.
  const eyebrow = (on: 1 | 2 | 3) => (
    <div className="grid gap-5">
      <Steps on={on} />
      {on > 1 && <AuthChip locale={l}>{nav("signIn")}</AuthChip>}
    </div>
  );
  // No sign-up: people outside the cohort are pointed to the club's Instagram.
  const notInCohort = (
    <p className="px-1 text-center text-[0.875rem] text-fg-subtle">
      <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong underline-offset-4 transition-colors duration-150 hover:text-fg">
        {t("notInCohort")}
      </a>
    </p>
  );
  // Signed in but not on the list: the members-only page explains what to do.
  if (viewer.kind === "outsider") redirect({ href: "/members-only", locale });

  if (viewer.kind === "member") {
    return (
      <AuthPanel testId="login" eyebrow={eyebrow(3)} title={t("loginTitle")} icon={<UserRoundCheck aria-hidden />}>
        {viewer.email && <SignedInAs label={t("signedInAs")} email={viewer.email} />}
        <div className="flex flex-wrap gap-3">
          <Link href={next} className="btn btn-primary w-full sm:w-fit">
            {t("continue")}
          </Link>
          {viewer.member.role === "admin" && (
            <Link href="/admin/members" className="btn btn-ghost">
              {nav("admin")}
            </Link>
          )}
          <SignOutButton />
        </div>
      </AuthPanel>
    );
  }

  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
    </>
  );

  if (sent) {
    return (
      <AuthPanel testId="login" eyebrow={eyebrow(2)} title={t("codeTitle")} icon={<MailCheck aria-hidden />} after={notInCohort}>
        {/* Neutral on purpose: it never says whether the email is on the list. */}
        <p className="flex items-start gap-3 rounded-[3px] border border-border-accent bg-brand-purple/[0.07] px-3.5 py-3 text-[0.9375rem] text-fg">
          <Mail aria-hidden className="mt-0.5 size-[18px] shrink-0 text-brand-purple-soft" />
          <span data-testid="code-sent">{t("codeSent")}</span>
        </p>
        {errorKey && <AuthAlert>{t(errorKey)}</AuthAlert>}
        <form action="/api/auth/verify" method="post" className="grid gap-4" data-testid="code-form">
          {hidden}
          <label className={labelClass}>
            {t("codeLabel")}
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 \-]{6,12}"
              maxLength={12}
              dir="ltr"
              placeholder="000000"
              className={`${inputClass} h-16 text-center font-mono text-[1.75rem] tracking-[0.5em] placeholder:text-fg-subtle/50 sm:text-[2rem]`}
            />
          </label>
          <p className={hintClass}>{t("codeHint")}</p>
          <button type="submit" className="btn btn-primary h-12 w-full">
            {t("codeSubmit")}
          </button>
        </form>
        <Link href={{ pathname: "/login", query: { next } }} className="inline-flex min-h-11 w-fit items-center text-sm text-brand-purple-soft underline underline-offset-4 hover:text-fg">
          {t("useAnotherEmail")}
        </Link>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel testId="login" eyebrow={eyebrow(1)} title={t("loginTitle")} icon={<KeyRound aria-hidden />} after={notInCohort}>
      <p>{t("loginBody")}</p>
      {errorKey && <AuthAlert>{t(errorKey)}</AuthAlert>}
      <form action="/api/auth/otp" method="post" className="grid gap-4" data-testid="email-form">
        {hidden}
        <label className={labelClass}>
          {t("emailLabel")}
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            className={`${inputClass} h-12 text-start placeholder:text-fg-subtle`}
          />
        </label>
        <button type="submit" className="btn btn-primary h-12 w-full">
          {t("emailSubmit")}
        </button>
      </form>
    </AuthPanel>
  );
}
