import { Link } from "@/i18n/navigation";
import { FileTiles as Tiles, type T, type TileFile } from "./file-tiles";

export type { FileCategory, FileKey } from "./file-tiles";

/**
 * The member files on a lecture or workshop page, as tiles with a tab (see file-tiles.tsx). An
 * interactive lesson opens through the locale-aware Link (/lessons/<id>, or /en/lessons/<id>).
 */
export function FileTiles(props: { files: readonly TileFile[]; locale: string; t: T }) {
  return <Tiles {...props} LessonLink={Link} />;
}
