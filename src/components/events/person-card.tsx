import type { CSSProperties } from "react";
import Image from "next/image";
import type { Locale } from "@/i18n/routing";
import { dbLang } from "@/lib/event-format";
import { cn } from "@/lib/utils";
import { CompanyBadge, roleCapsClass } from "./flyer-bits";
import { initialsOf } from "./speaker-face";
import { SpeakerLinkedIn } from "./speaker-linkedin";

/**
 * One person in a "Meet our ..." grid (season speakers, club founders): a cell of the page's
 * logo grid with a square portrait cut on pixel steps, the company logo badge (docs/DECISIONS.md),
 * name, company and role. Public fields only. Server-rendered, no motion.
 */
export function PersonCard({
  locale,
  name,
  photoUrl,
  company,
  role,
  linkedinUrl,
  testId,
  style,
  ...gridProps
}: {
  locale: Locale;
  name: string;
  photoUrl: string | null;
  company: string | null;
  role: string | null;
  linkedinUrl: string | null;
  testId: string;
  /** Set by PeopleGrid. */
  style?: CSSProperties;
  "data-lead"?: string;
  "data-wide"?: string;
}) {
  return (
    <li data-testid={testId} data-tilt="" style={style} {...gridProps} className="relative flex min-w-0 flex-col p-4 sm:p-5 lg:p-6">
      <div className="flex items-start justify-between gap-2">
        <PixelPortrait name={name} photoUrl={photoUrl} company={company} />
        <SpeakerLinkedIn url={linkedinUrl} name={name} className="-me-2 -mt-2" />
      </div>
      <p {...dbLang(locale)} className="mt-4 leading-tight font-bold text-pretty text-fg lg:text-lg">{name}</p>
      {company && (
        <p {...dbLang(locale)} className="mt-1 text-sm text-fg-muted">
          <bdi>{company}</bdi>
        </p>
      )}
      {role && <p {...dbLang(locale)} className={cn("mt-2 text-pretty", roleCapsClass(locale))}>{role}</p>}
    </li>
  );
}

const SIZE = 88; // source photos are 96px; never upscale past that

/** Square photo inside a purple frame, both cut on pixel steps. Decorative: the name is written next to it. */
function PixelPortrait({ name, photoUrl, company }: { name: string; photoUrl: string | null; company: string | null }) {
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: SIZE, height: SIZE }}>
      <span className="pixel-corners absolute inset-0 bg-brand-purple p-[3px]">
        <span data-portrait="" className="pixel-corners relative grid size-full place-items-center overflow-hidden bg-brand-purple-deeper font-bold text-fg [--px:3px]">
          {photoUrl ? (
            <Image src={photoUrl} alt="" fill sizes={`${SIZE}px`} className="object-cover" />
          ) : (
            <span style={{ fontSize: Math.round(SIZE * 0.32) }}>{initialsOf(name)}</span>
          )}
        </span>
      </span>
      {company && <CompanyBadge company={company} size={28} />}
    </span>
  );
}
