import { getLocale, getTranslations } from "next-intl/server";
import { CircleAlert, LogIn, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Link to the "Member log in" page (email + code), coming back to `next` afterwards. */
export async function SignInButton({
  next = "/me",
  label,
  variant = "primary",
  className,
}: {
  next?: string;
  label?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const t = await getTranslations("auth");
  return (
    <Link
      href={{ pathname: "/login", query: { next } }}
      className={cn("btn w-fit", variant === "primary" ? "btn-primary" : "btn-ghost", className)}
    >
      <LogIn aria-hidden className="rtl:-scale-x-100" />
      {label ?? t("signIn")}
    </Link>
  );
}

/** POSTs to /api/auth/signout, which clears the session cookies. Works without JS. */
export async function SignOutButton({ className }: { className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("auth"), getLocale()]);
  return (
    <form action="/api/auth/signout" method="post">
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={cn("btn btn-ghost", className)}>
        <LogOut aria-hidden className="rtl:-scale-x-100" />
        {t("signOut")}
      </button>
    </form>
  );
}

/** The club's pixel blocks (from the logo): a small brand mark on auth cards. */
export function PixelMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid grid-cols-2 gap-0", className)}>
      <i className="size-3 bg-logo-indigo" />
      <i className="size-3" />
      <i className="size-3" />
      <i className="size-3 bg-brand-purple" />
    </span>
  );
}

/**
 * The small purple-and-mono tag from the home hero ("COHORT 02 / 2026-27"): a purple block with the label,
 * then an optional second part. Silkscreen caps for Latin locales; Rubik in Hebrew (no Hebrew pixel font).
 */
export function AuthChip({ locale, children, tail }: { locale: string; children: React.ReactNode; tail?: React.ReactNode }) {
  const pixel = locale !== "he";
  return (
    <p className="flex w-fit items-stretch border border-border-accent text-[0.6875rem] leading-none">
      <span
        className={cn("bg-brand-purple px-2.5 text-on-purple", pixel ? "py-2 font-pixel tracking-[0.18em] uppercase" : "eyebrow-he py-1.5 text-on-purple!")}
      >
        {children}
      </span>
      {tail && <span className="px-2.5 py-2 text-[0.75rem] text-fg-muted">{tail}</span>}
    </p>
  );
}

/**
 * Common frame for the small pages (login, members-only, welcome, coming soon, the speaker form):
 * the home page's logo-grid backdrop and one featured card with stepped, logo-block corners.
 * Server-rendered and visible at first paint; only the text eases in, once per session
 * (CSS .intro, static under reduced motion).
 */
export function AuthPanel({
  eyebrow,
  title,
  children,
  testId,
  icon,
  after,
  wide = false,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
  /** A lucide icon element shown in a tile above the title. */
  icon?: React.ReactNode;
  /** Content below the card (e.g. a follow-us card). */
  after?: React.ReactNode;
  /** Wider card for forms. */
  wide?: boolean;
}) {
  return (
    <div className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[38rem] overflow-hidden">
        <div className="hero-grid absolute inset-0" />
        <div className="hero-glow absolute inset-0" />
        <i className="absolute end-[10%] top-[9rem] size-3.5 bg-brand-purple" />
        <i className="absolute hidden lg:block start-[8%] top-[16rem] size-7 bg-logo-indigo" />
        <i className="absolute hidden lg:block start-[calc(8%+1.75rem)] top-[17.75rem] size-3.5 bg-logo-block" />
      </div>

      <section
        data-testid={testId}
        className={cn("mx-auto grid gap-5 px-4 pt-10 pb-20 sm:px-8 sm:pt-16 lg:pt-20", wide ? "max-w-[46rem]" : "max-w-[36rem]")}
      >
        {/* The border is a 1px frame of the same stepped shape (clip-path would cut a real border at the corners). */}
        <div className="pixel-corners pixel-corners-lg bg-border-accent p-px shadow-[var(--shadow-featured)]">
          <div className="pixel-corners pixel-corners-lg bg-bg-raised p-6 [background-image:var(--card-featured-bg)] sm:p-8">
            <div className="intro flex items-start justify-between gap-4 [--i:0]">
              {icon ? (
                <span className="grid size-12 place-items-center border border-border-accent bg-brand-purple-deeper text-fg [&_svg]:size-6">
                  {icon}
                </span>
              ) : (
                <span />
              )}
              <PixelMark />
            </div>
            {eyebrow && <div className="intro mt-6 [--i:1]">{eyebrow}</div>}
            <h1
              className={cn(
                "intro text-[clamp(1.75rem,6vw,2.375rem)] leading-[1.1] font-extrabold text-balance text-fg [--i:1]",
                eyebrow ? "mt-3" : "mt-6",
              )}
            >
              {title}
              <span aria-hidden className="pixel-caret ms-2 h-[0.7em] w-[0.42em] align-baseline" />
            </h1>
            <div className="intro mt-4 grid gap-5 text-[1.0625rem] leading-relaxed text-fg-muted [--i:2]">{children}</div>
          </div>
        </div>
        {after}
      </section>
    </div>
  );
}

/** "Signed in as …" row, with the email isolated so it doesn't reorder in RTL. */
export function SignedInAs({ label, email }: { label: string; email: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[3px] border border-border bg-bg-deep/45 px-3.5 py-3 text-[0.9375rem]">
      <span className="text-fg-subtle">{label}</span>
      <bdi dir="ltr" className="font-mono text-sm text-fg">
        {email}
      </bdi>
    </p>
  );
}

/** Error line for auth pages: written out in a tinted box, never colour alone. */
export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-3 rounded-[3px] border border-destructive/50 bg-destructive/10 px-3.5 py-3 text-[0.9375rem] text-fg">
      <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0 text-destructive" />
      <span>{children}</span>
    </p>
  );
}
