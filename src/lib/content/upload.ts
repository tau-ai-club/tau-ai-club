// Event file uploads (pure helpers, shared by the upload actions, the files editor and the tests).
//
// Two paths into the private `event-files` bucket:
//   * HTML lessons (≤ 3 MB) go through the uploadEventFile Server Action, which rewrites them
//     (src/lib/content/lesson.ts). The Server Action body limit is 3 MB (next.config.ts).
//   * PDFs and PowerPoint decks (≤ 25 MB, 26.11) go straight from the admin's browser to Storage:
//       1. startDirectUpload (admin only) issues a one-time signed upload URL for a fresh STAGED
//          object, _incoming/<uuid>.<pdf|pptx>. No event_files row points at it, so no member can
//          ever read it (Storage RLS), and a failed or abandoned upload never touches a published file.
//       2. The browser PUTs the file there. Storage enforces the bucket's MIME types and size limit.
//       3. finishDirectUpload (admin only) downloads the staged object and checks it again on the
//          server: its name, its real size, its bytes (a real PDF / a plain presentation). Only then
//          is it stored under its final name and listed for members. The staged object is removed
//          either way; leftovers older than a day are swept on the next upload.
import { checkPptx, PPTX_MIME } from "./pptx";
import type { FileFormat } from "./sections";

/** PDFs and decks: the bucket's limit too (migration 20261126190000). */
export const MAX_DIRECT_BYTES = 25 * 1024 * 1024;
/** HTML lessons, through the Server Action. */
export const MAX_ACTION_BYTES = 3 * 1024 * 1024;

export type DirectFormat = Extract<FileFormat, "pdf" | "pptx">;
export const isDirectFormat = (f: FileFormat): f is DirectFormat => f === "pdf" || f === "pptx";

export const STAGED_PREFIX = "_incoming/";
const STAGED = /^_incoming\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|pptx)$/;
export const stagedPath = (uuid: string, ext: DirectFormat) => `${STAGED_PREFIX}${uuid}.${ext}`;
/** A staged object's format, or null when the path isn't one we issued. */
export const stagedFormat = (path: string): DirectFormat | null => {
  const m = STAGED.exec(path);
  return m ? (m[1] as DirectFormat) : null;
};

export const contentTypeFor = (ext: FileFormat) => (ext === "pdf" ? "application/pdf" : ext === "pptx" ? PPTX_MIME : "text/plain");

/** The object name members' rows point at: <event slug>/<cleaned file name>.<ext>. */
export function storageName(slug: string, fileName: string, ext: FileFormat): string {
  const base =
    fileName
      .replace(/\.(pdf|html?|pptx)$/i, "")
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^[-._]+|[-._]+$/g, "")
      .slice(0, 80) || (ext === "html" ? "lesson" : "file");
  return `${slug}/${base}.${ext}`;
}

/** What the bytes really are, whatever the name or the browser said. */
export function checkFileBytes(ext: DirectFormat, bytes: Uint8Array): { ok: true } | { ok: false; reason: "type" | "unsafe" } {
  if (ext === "pdf") return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-" ? { ok: true } : { ok: false, reason: "type" };
  return checkPptx(bytes);
}
