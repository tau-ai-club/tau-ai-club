import Image from "next/image";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { initialsOf } from "./speaker-face";
import { LockKeyhole } from "lucide-react";
import { companyLogo } from "@/lib/company-logos";

/*
 * Pieces taken from the club's Instagram posts (design/instagram-pass.md): the eyebrow chip,
 * the DATE / TIME / WHERE tiles, the round speaker photo with a purple ring, the pixel-square
 * cluster and the corner brackets. Server-safe; no motion.
 */

/** "■ COHORT 02 / SESSION 1/3". Silkscreen caps in English; Rubik in Hebrew (no Hebrew pixel font). */
export function FlyerChip({ locale, children, className, id }: { locale: Locale; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p
      id={id}
      className={cn(
        "inline-flex min-h-8 w-fit items-center gap-2.5 rounded-[3px] border-[1.5px] border-brand-purple bg-brand-purple/5 px-3 py-1.5 text-brand-purple-softer",
        locale === "en" ? "font-pixel text-[0.6875rem] leading-none tracking-[0.16em] uppercase" : "text-[0.8125rem] leading-tight font-medium",
        className,
      )}
    >
      <span aria-hidden className="size-2 shrink-0 bg-brand-purple" />
      <span>{children}</span>
    </p>
  );
}

/** The slash between chip parts. */
export function ChipSep() {
  return (
    <span aria-hidden className="mx-1.5 text-fg-subtle">
      /
    </span>
  );
}

/** One flyer info box: a small label, the big value, an optional sub-line. */
export function InfoTile({
  locale,
  label,
  value,
  sub,
  muted,
  compact,
  className,
}: {
  locale: Locale;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  muted?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 content-start gap-1 rounded-md border border-border-strong bg-bg-raised/40 shadow-[var(--highlight-top)]",
        compact ? "px-3.5 py-3" : "px-4 py-3.5",
        className,
      )}
    >
      <dt
        className={cn(
          "text-brand-purple-soft",
          locale === "en" ? "font-pixel text-[0.6875rem] leading-snug tracking-[0.18em] uppercase" : "text-[0.8125rem] leading-snug font-medium",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "leading-tight font-bold [overflow-wrap:anywhere]",
          compact ? "text-[clamp(1.0625rem,2vw,1.25rem)]" : "text-[clamp(1.1875rem,2.4vw,1.5rem)]",
          muted ? "text-fg-muted" : "text-fg",
        )}
      >
        {value}
      </dd>
      {sub && <dd className="text-sm leading-snug text-fg-subtle">{sub}</dd>}
    </div>
  );
}

/**
 * A speaker's round photo with the purple ring and a dark gap, as on the posts. The badge is the
 * company's logo (src/lib/company-logos.ts), or its initial when we have none. Photos are at most 96px source, so `size` stays ≤ 96.
 * Decorative: the name and company are always written next to it.
 */
export function SpeakerAvatar({
  name,
  photoUrl,
  company,
  size,
  muted,
  className,
}: {
  name: string;
  photoUrl: string | null;
  company?: string | null;
  size: number;
  muted?: boolean;
  className?: string;
}) {
  const ring = size >= 64 ? 3 : 2;
  const gap = size >= 64 ? 4 : 3;
  const badge = Math.max(22, Math.round(size * 0.3));
  return (
    <span aria-hidden className={cn("relative block shrink-0", className)} style={{ width: size, height: size }}>
      <span
        className={cn("absolute inset-0 rounded-full bg-bg-deep", muted ? "border-brand-purple-deeper" : "border-brand-purple")}
        style={{ borderWidth: ring, padding: gap - 1 }}
      >
        <span className="relative grid size-full place-items-center overflow-hidden rounded-full bg-brand-purple-deeper font-bold text-fg">
          {photoUrl ? (
            <Image src={photoUrl} alt="" fill sizes={`${size}px`} className={cn("object-cover", muted && "opacity-80")} />
          ) : (
            <span style={{ fontSize: Math.round(size * 0.32) }}>{initialsOf(name)}</span>
          )}
        </span>
      </span>
      {company && size >= 56 && <CompanyBadge company={company} size={badge} />}
    </span>
  );
}

/** Role in the posts' small caps: mono caps in English, Rubik 500 in Hebrew. Accent text colour. */
export function roleCapsClass(locale: Locale) {
  return locale === "en"
    ? "font-mono text-[0.6875rem] leading-snug font-semibold tracking-[0.12em] text-brand-purple-soft uppercase"
    : "text-[0.8125rem] leading-snug font-medium text-brand-purple-soft";
}

/**
 * Title with the flyer's purple part: the words after the first colon. A long tail (a question,
 * a subtitle) becomes a quieter second line instead. One h1 either way; nothing changes in the data.
 */
export function splitTitle(title: string): { head: string; accent: string | null; tail: string | null } {
  const i = title.indexOf(":");
  if (i <= 0 || i === title.length - 1) return { head: title, accent: null, tail: null };
  const head = title.slice(0, i + 1);
  const rest = title.slice(i + 1).trim();
  return rest.length <= 28 ? { head, accent: rest, tail: null } : { head, accent: null, tail: rest };
}

/** The staircase of pixel squares from the flyer corners. Decorative; mirrored in RTL by the caller. */
export function PixelCluster({ className }: { className?: string }) {
  const on = [
    [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
    [6, 1], [7, 1], [8, 1], [9, 1],
    [7, 2], [8, 2], [9, 2],
    [8, 3], [9, 3],
    [9, 4],
  ];
  const dim = [[3, 0], [5, 1], [6, 3], [8, 5]];
  const dimmer = [[4, 2], [7, 4], [9, 7]];
  const squares = (cells: number[][], fill: string) =>
    cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x * 25} y={y * 25} width={23} height={23} fill={fill} />);
  return (
    <svg aria-hidden viewBox="0 0 248 198" className={cn("pointer-events-none", className)}>
      {squares(dimmer, "var(--logo-grid)")}
      {squares(dim, "var(--logo-block)")}
      {squares(on, "var(--brand-purple)")}
    </svg>
  );
}

/** Four L-shaped corner marks (the "Meet our managers" frame). Place inside a `relative` box. */
export function CornerBrackets({ className }: { className?: string }) {
  const base = "absolute size-6 border-border-accent";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-4", className)}>
      <span className={cn(base, "start-0 top-0 border-s-2 border-t-2")} />
      <span className={cn(base, "end-0 top-0 border-e-2 border-t-2")} />
      <span className={cn(base, "start-0 bottom-0 border-s-2 border-b-2")} />
      <span className={cn(base, "end-0 bottom-0 border-e-2 border-b-2")} />
    </span>
  );
}

/** The square badge on a photo's corner: the company's logo on white, else its initial. */
export function CompanyBadge({ company, size }: { company: string; size: number }) {
  const logo = companyLogo(company);
  const box = "absolute -end-[3%] bottom-[2%] grid place-items-center overflow-hidden rounded-[7px] border-2";
  if (logo && "stealth" in logo) {
    return (
      <span className={cn(box, "border-brand-purple bg-bg-deep text-brand-purple")} style={{ width: size, height: size }}>
        <LockKeyhole style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }} strokeWidth={2.5} />
      </span>
    );
  }
  if (logo) {
    return (
      <span className={cn(box, "border-fg bg-white")} style={{ width: size, height: size, padding: logo.bleed ? 0 : Math.round(size * 0.14) }}>
        <span className="relative block size-full">
          <Image src={logo.src} alt="" fill sizes={`${size}px`} className="object-contain" unoptimized={logo.src.endsWith(".svg")} data-company-logo="" />
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(box, "border-fg bg-bg-deep font-mono font-semibold text-fg")}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {company.trim().charAt(0).toUpperCase()}
    </span>
  );
}
