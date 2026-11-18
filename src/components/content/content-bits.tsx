import { getLocale } from "next-intl/server";
import { LockKeyhole } from "lucide-react";
import { loc } from "@/lib/event-format";
import type { Locale } from "@/i18n/routing";
import type { SeasonEvent } from "@/lib/data/types";
import { SpeakerFace, initialsOf } from "@/components/events/speaker-face";
import { SectionHeading } from "@/components/home/section-heading";
import { cn } from "@/lib/utils";

/** Eyebrow: Silkscreen is Latin only, so Hebrew gets Rubik. */
export async function Eyebrow({ he, en }: { he: string; en: string }) {
  const locale = await getLocale();
  return locale === "he" ? (
    <p className="eyebrow-he w-fit border border-border-accent px-2.5 py-1.5 text-sm">{he}</p>
  ) : (
    <p className="eyebrow-pixel w-fit border border-border-accent px-2.5 py-2 text-[0.6875rem]">{en}</p>
  );
}

/** Page intro for the lectures and workshops pages. */
export function ContentIntro({ eyebrow, title, body, locale }: { eyebrow: React.ReactNode; title: string; body: string; locale: Locale }) {
  return (
    <header className="grid gap-4">
      {eyebrow}
      <SectionHeading as="h1" locale={locale} line1={title} />
      <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-fg-muted">{body}</p>
    </header>
  );
}

/** Speakers of an event: face, name, and role/company when known (public fields only). */
export function SpeakerList({ event, locale, size = 56, className }: { event: SeasonEvent; locale: Locale; size?: number; className?: string }) {
  if (!event.event_speakers.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-6 gap-y-3", className)} data-testid="content-speakers">
      {event.event_speakers.map(({ speaker }) => {
        const name = loc(speaker, "name", locale) ?? "";
        const role = [loc(speaker, "role", locale), loc(speaker, "company", locale)].filter(Boolean).join(" · ");
        return (
          <li key={speaker.id} className="flex min-w-0 items-center gap-3">
            <SpeakerFace pixel speaker={{ name, initials: initialsOf(name), photoUrl: speaker.photo_url }} size={size} />
            <span className="grid min-w-0">
              <span className="font-semibold text-fg">{name}</span>
              {role && <span className="text-sm text-fg-muted">{role}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Members only" marker: icon plus text, so it never relies on color. */
export function MembersOnlyMark({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle", className)}>
      <LockKeyhole aria-hidden className="size-3.5 shrink-0" />
      {label}
    </span>
  );
}

/**
 * Stands in for the members-only part while the members area is off (authEnabled() false).
 * Server-rendered and static: no fetch, no sign-in link, and no members-only text.
 */
export function MembersSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid gap-3 rounded-lg border border-border-accent bg-surface p-5 sm:p-6" data-testid="members-soon">
      <p className="flex items-center gap-2 font-semibold text-fg">
        <LockKeyhole aria-hidden className="size-4 shrink-0 text-brand-purple-soft" />
        {title}
      </p>
      <p className="max-w-[60ch] text-fg-muted">{body}</p>
    </div>
  );
}

/**
 * The home page's backdrop for inner pages: the logo grid fading out at the top. Decorative, static.
 * Wrap the page in `relative isolate` and put this first.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[30rem] overflow-hidden">
      <div className="hero-grid absolute inset-0 opacity-40" />
    </div>
  );
}
