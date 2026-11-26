// PowerPoint (.pptx) uploads for the lecturer's slides (DECISIONS 26.11). Pure helpers, shared by the
// upload action and the tests.
//
// An Office file is UNTRUSTED. The site never opens or renders it: it is stored in the private
// bucket with the pptx MIME type, and members only ever get it as a download (a 60-second signed
// URL with Content-Disposition: attachment, /api/files/<id>). On upload we still refuse what makes
// an Office file dangerous rather than just a deck:
//   * it must be a real OOXML presentation: a zip whose entries include [Content_Types].xml and
//     ppt/presentation.xml (a renamed .exe, .ppt or .pptm is not);
//   * no macros (vbaProject.bin, i.e. a .pptm renamed to .pptx);
//   * no ActiveX controls (ppt/activeX/);
//   * no embedded OLE binaries (*.bin under ppt/embeddings/, which can carry packaged programs).
//     Embedded Office files (.xlsx charts) stay fine.
// Entry names are read from the zip's central directory, which stores them uncompressed.

export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type PptxCheck = { ok: true } | { ok: false; reason: "type" | "unsafe" };

/** The entry names in a zip's central directory (empty when it isn't a zip). */
export function zipEntryNames(bytes: Uint8Array): string[] {
  const names: string[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Central directory file headers: signature PK\x01\x02, name length at +28, name at +46.
  for (let i = 0; i + 46 <= bytes.length; i++) {
    if (bytes[i] !== 0x50 || bytes[i + 1] !== 0x4b || bytes[i + 2] !== 0x01 || bytes[i + 3] !== 0x02) continue;
    const len = dv.getUint16(i + 28, true);
    const extra = dv.getUint16(i + 30, true);
    const comment = dv.getUint16(i + 32, true);
    if (i + 46 + len > bytes.length) break;
    names.push(new TextDecoder().decode(bytes.subarray(i + 46, i + 46 + len)));
    i += 45 + len + extra + comment;
  }
  return names;
}

export function checkPptx(bytes: Uint8Array): PptxCheck {
  // A zip starts with a local file header: PK\x03\x04.
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) return { ok: false, reason: "type" };
  const names = zipEntryNames(bytes);
  const lower = names.map((n) => n.toLowerCase());
  if (!lower.includes("[content_types].xml") || !lower.includes("ppt/presentation.xml")) return { ok: false, reason: "type" };
  const unsafe = lower.some(
    (n) => n.endsWith("vbaproject.bin") || n.startsWith("ppt/activex/") || (n.startsWith("ppt/embeddings/") && n.endsWith(".bin")),
  );
  return unsafe ? { ok: false, reason: "unsafe" } : { ok: true };
}
