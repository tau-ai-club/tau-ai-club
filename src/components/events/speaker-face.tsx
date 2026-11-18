import Image from "next/image";
import { cn } from "@/lib/utils";

export type FaceSpeaker = { name: string; photoUrl: string | null; initials: string };

/** First letters of the first two words of a name ("עוז" → "ע", "Ori Goshen" → "OG"). */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/**
 * Speaker face: the photo when there is one, else initials on a brand tile
 * (never a broken image). Decorative: the name is always written next to it.
 * Safe in server and client components.
 */
export function SpeakerFace({ speaker, size, className, pixel }: { speaker: FaceSpeaker; size: number; className?: string; pixel?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-brand-purple-deeper font-bold text-fg",
        pixel ? "pixel-corners [--px:3px]" : "rounded-md border border-border-accent",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {speaker.photoUrl ? (
        // alt is the name (the wrapper is aria-hidden because the name is also written next to it).
        <Image src={speaker.photoUrl} alt={speaker.name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        speaker.initials
      )}
    </span>
  );
}
