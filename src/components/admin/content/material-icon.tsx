import { FileKindIcon } from "@/components/content/file-tiles";
import type { MaterialKind } from "@/lib/content/sections";

/**
 * The material kind's pixel icon: the same icons as the members' file tiles (tau-designer, file-tiles.tsx),
 * at 24px by default. aria-hidden: the picker always shows the kind's name next to it.
 */
export function MaterialIcon({ kind, className = "size-6" }: { kind: MaterialKind; className?: string }) {
  return <FileKindIcon kind={kind === "game" ? "lesson" : kind} className={className} />;
}
