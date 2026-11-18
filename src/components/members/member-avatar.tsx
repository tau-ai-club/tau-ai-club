import { initialsOf } from "@/components/events/speaker-face";
import { cn } from "@/lib/utils";

/**
 * A member's photo (a short-lived signed URL) or their initials, in the pixel portrait of the
 * home page's people: a purple frame and a square photo, both cut on pixel steps. A plain <img>,
 * not next/image: member photos are private and must not land in the shared image cache.
 * Decorative, since the name is always written next to it.
 */
export function MemberAvatar({
  name,
  src,
  size,
  className,
}: {
  name: string;
  src: string | null;
  size: number;
  className?: string;
}) {
  const px = size >= 100 ? 4 : 3;
  return (
    <span
      aria-hidden
      className={cn("pixel-corners relative block shrink-0 bg-brand-purple p-[3px]", className)}
      style={{ width: size, height: size, "--px": `${px}px` } as React.CSSProperties}
    >
      <span
        className="pixel-corners relative grid size-full place-items-center overflow-hidden bg-brand-purple-deeper font-bold text-fg"
        style={{ fontSize: size * 0.36 }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" width={size} height={size} className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initialsOf(name)
        )}
      </span>
    </span>
  );
}
