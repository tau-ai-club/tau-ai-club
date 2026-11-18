import { cn } from "@/lib/utils";

/*
 * The hero's mosaic: a stack of logo blocks rising toward the end of the line, with a few
 * blocks still being placed above it. Built from the logo's own colours (tokens only).
 * Decorative. The caller mirrors it in RTL so it always rises toward the reading end.
 * Each block carries --d (its place in the laying order) for the one-time intro in globals.css.
 */

const COLS = 10;
const ROWS = 9;
/** Column heights, in blocks: a staircase that climbs, with one dip so it reads as built, not drawn. */
const HEIGHTS = [1, 2, 2, 3, 4, 3, 5, 6, 7, 8];
/** Blocks still in the air: [col, row from the bottom, fill]. */
const LOOSE: [number, number, string][] = [
  [5, 5, "var(--brand-purple)"],
  [7, 8, "var(--brand-lilac)"],
  [3, 6, "var(--logo-block)"],
];

const CELL = 24;
const GAP = 3;

function fillFor(col: number, row: number, height: number) {
  if (row === height - 1) return col >= COLS - 3 ? "var(--brand-purple)" : "var(--brand-purple-deeper)";
  return (col + row) % 2 === 0 ? "var(--logo-block)" : "var(--logo-indigo)";
}

export function PixelMosaic({ className }: { className?: string }) {
  const blocks: { x: number; y: number; fill: string; d: number }[] = [];
  HEIGHTS.forEach((h, col) => {
    for (let row = 0; row < h; row++) {
      blocks.push({ x: col, y: ROWS - 1 - row, fill: fillFor(col, row, h), d: row * 2 + col * 0.7 });
    }
  });
  LOOSE.forEach(([col, row, fill], i) => blocks.push({ x: col, y: ROWS - 1 - row, fill, d: 22 + i * 2 }));

  const size = (n: number) => n * CELL + (n - 1) * GAP;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${size(COLS)} ${size(ROWS)}`}
      className={cn("pointer-events-none block h-auto", className)}
    >
      {/* The empty grid the blocks sit on: the logo's backdrop. */}
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <rect
          key={`g${i}`}
          x={(i % COLS) * (CELL + GAP)}
          y={Math.floor(i / COLS) * (CELL + GAP)}
          width={CELL}
          height={CELL}
          fill="none"
          stroke="var(--logo-grid)"
          strokeWidth={1}
        />
      ))}
      {blocks.map((b) => (
        <rect
          key={`${b.x}-${b.y}`}
          className="mosaic-block [transform-box:fill-box]"
          style={{ "--d": b.d } as React.CSSProperties}
          x={b.x * (CELL + GAP)}
          y={b.y * (CELL + GAP)}
          width={CELL}
          height={CELL}
          fill={b.fill}
        />
      ))}
    </svg>
  );
}
