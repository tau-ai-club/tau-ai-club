import { cn } from "@/lib/utils";

/*
 * Pixel glyphs (9 rows) for the "about" cells, drawn on the logo's grid. "#" is a lit pixel
 * (brand purple), "+" a dim one (logo block). Decorative: each sits next to its written title.
 */
const GLYPHS = {
  // A wall calendar with Wednesday lit: the weekly meetup.
  week: [
    ".#.....#.",
    "#########",
    "#.......#",
    "#+.+.+.+#",
    "#.......#",
    "#+.#.+.+#",
    "#.......#",
    "#########",
    ".........",
  ],
  // A laptop with a prompt: the hands-on workshops.
  build: [
    ".........",
    ".#######.",
    ".#.....#.",
    ".#+....#.",
    ".#.+...#.",
    ".#+.##.#.",
    ".#######.",
    "#########",
    ".........",
  ],
  // Three people, the middle one lit: the community.
  people: [
    "...........",
    "....###....",
    ".++.###.++.",
    ".++.....++.",
    "...#####...",
    "+++#####+++",
    "+++#####+++",
    "+++#####+++",
    "...........",
  ],
} as const;

export type PixelGlyph = keyof typeof GLYPHS;

export function PixelIcon({ glyph, className }: { glyph: PixelGlyph; className?: string }) {
  const rows = GLYPHS[glyph];
  return (
    <svg aria-hidden viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" className={cn("block", className)}>
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c === "#" ? "var(--brand-purple)" : "var(--logo-block)"} />
          ),
        ),
      )}
    </svg>
  );
}
