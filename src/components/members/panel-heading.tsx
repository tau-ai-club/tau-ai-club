import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Section title for the personal area and member pages, in the home page's pixel language:
 * a small block staircase from the logo, then the title (Silkscreen caps in English, Rubik 800 in
 * Hebrew, since Silkscreen has no Hebrew). The staircase climbs toward the reading end and mirrors in RTL.
 */
export function PanelHeading({
  locale,
  id,
  as: Tag = "h2",
  children,
  className,
}: {
  locale: Locale;
  id?: string;
  as?: "h2" | "h3";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "flex items-center gap-2.5 text-fg",
        locale === "he" ? "text-lg leading-tight font-extrabold" : "font-pixel text-[0.9375rem] leading-tight tracking-[0.06em] uppercase",
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 30 30" shapeRendering="crispEdges" className="size-[0.95em] shrink-0 rtl:-scale-x-100">
        <rect x="0" y="20" width="9" height="9" fill="var(--logo-block)" />
        <rect x="10" y="10" width="9" height="9" fill="var(--brand-purple-deeper)" />
        <rect x="20" y="0" width="9" height="9" fill="var(--brand-purple)" />
      </svg>
      <span>{children}</span>
    </Tag>
  );
}
