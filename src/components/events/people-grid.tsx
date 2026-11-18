import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { peopleGridLayout } from "@/lib/people-grid";

type Placeable = { style?: CSSProperties; "data-lead"?: string; "data-wide"?: string };

/**
 * The logo-grid (`.cell-grid`) for a list of equal cells with no empty cells: full rows, and a
 * short last row centred (see `peopleGridLayout`). Children must be `<li>` elements that accept
 * `style` and `data-lead`. `stack` keeps one column on phones (wide cards); `maxCols` caps desktop columns. Layout lives in `.people-grid` in globals.css.
 */
export function PeopleGrid({ children, stack = false, maxCols }: { children: ReactNode; stack?: boolean; maxCols?: number }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<Placeable>[];
  const n = items.length;
  if (n === 0) return null;
  const { cols, pad, lastRow, leadIndex, leadStart } = peopleGridLayout(n, maxCols);
  const vars = { "--cols": cols, "--pad": pad, "--row": lastRow, "--lead": leadStart } as CSSProperties;

  return (
    <ul data-build="" className="cell-grid people-grid mt-10" style={vars} data-stack={stack ? "" : undefined}>
      {items.map((el, i) => {
        const extra: Placeable = {};
        if (pad > 0 && i === leadIndex) extra["data-lead"] = "";
        if (n % 2 === 1 && i === n - 1) extra["data-wide"] = ""; // below lg: a lone last cell spans the row (harmless in the 1-column stack)
        return Object.keys(extra).length ? cloneElement(el, extra) : el;
      })}
      {/* Masks the grid-line colour beside a centred short row; hidden on phones. */}
      {pad > 0 && <li aria-hidden data-pad="start" />}
      {pad > 0 && <li aria-hidden data-pad="end" />}
    </ul>
  );
}
