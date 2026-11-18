import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * The home page's section heading, after the club's posts ("MEET OUR / SPEAKERS"): two lines,
 * the second in brand purple, closed by a small block staircase from the logo.
 * English is set in Silkscreen caps; Hebrew in Rubik 800 (Silkscreen has no Hebrew).
 * Leading comes after the size in each string: tailwind-merge drops a leading-* that precedes a text-* size.
 */
export function SectionHeading({ id, locale, line1, line2, className }: { id: string; locale: Locale; line1: string; line2: string; className?: string }) {
  return (
    <h2
      id={id}
      className={cn(
        "grid text-fg",
        locale === "en"
          ? "font-pixel text-[clamp(2.25rem,7vw,4.25rem)] leading-[0.95] tracking-[0.01em] uppercase"
          : "text-[clamp(2.5rem,8vw,4.5rem)] leading-[1.02] font-extrabold tracking-[-0.015em]",
        className,
      )}
    >
      <span>{line1}</span>
      <span className="flex items-end gap-[0.22em] text-brand-purple-soft">
        {line2}
        <Steps />
      </span>
    </h2>
  );
}

/** Three blocks climbing toward the reading end. Mirrored in RTL. Decorative. */
function Steps() {
  return (
    <svg aria-hidden viewBox="0 0 30 30" className="mb-[0.12em] size-[0.5em] shrink-0 rtl:-scale-x-100">
      <rect x="0" y="20" width="9" height="9" fill="var(--logo-block)" />
      <rect x="10" y="10" width="9" height="9" fill="var(--brand-purple-deeper)" />
      <rect x="20" y="0" width="9" height="9" fill="var(--brand-purple)" />
    </svg>
  );
}
