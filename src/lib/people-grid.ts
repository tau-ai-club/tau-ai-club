/**
 * Layout for a grid of n equal cells that never shows an empty cell: rows are full when n
 * divides evenly, otherwise the short last row is centred. Pure, so it can be unit-tested.
 *
 * From lg the grid has `cols * 2` tracks and every cell spans 2, so a last row of `r` cells
 * can start on any half-column and sit centred. On phones there are 2 columns and a lone
 * last cell spans the whole row.
 */
export type PeopleGridLayout = {
  /** Columns from lg. */
  cols: number;
  /** Cells in the last row (1..cols). */
  lastRowCount: number;
  /** Tracks of empty space on each side of a short last row (0 when the last row is full). */
  pad: number;
  /** 1-based row number of the last row. */
  lastRow: number;
  /** Index of the first cell of the last row. */
  leadIndex: number;
  /** 1-based starting track of that first cell, so the last row is centred. */
  leadStart: number;
};

const MAX_COLS = 4;

export function peopleGridLayout(n: number, maxCols: number = MAX_COLS): PeopleGridLayout {
  const max = Math.max(1, Math.min(maxCols, MAX_COLS));
  let cols = Math.max(1, Math.min(n, max));
  if (n > max) {
    // Prefer the column count whose last row is fullest; the widest wins ties.
    const candidates = [4, 3].filter((c) => c <= max);
    let best = 0;
    for (const c of candidates.length ? candidates : [max]) {
      const fill = (n % c || c) / c;
      if (fill > best) {
        best = fill;
        cols = c;
      }
    }
  }
  const lastRowCount = n % cols || cols;
  const pad = cols - lastRowCount;
  return {
    cols,
    lastRowCount,
    pad,
    lastRow: Math.ceil(n / cols),
    leadIndex: n - lastRowCount,
    leadStart: pad + 1,
  };
}
