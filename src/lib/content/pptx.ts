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
// Entry names are stored uncompressed in every local file header and central directory header.
// We read the name of EVERY such header anywhere in the file and never skip ahead by a header's own
// lengths, so a crafted header can't jump over (and hide) an entry. A crafted file can only end up
// refused, never let through (tau-security, 26.11).

export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type PptxCheck = { ok: true } | { ok: false; reason: "type" | "unsafe" };

/** Every entry name in a zip's headers, local and central, de-duplicated (empty when it isn't a zip). */
export function zipEntryNames(bytes: Uint8Array): string[] {
  const names = new Set<string>();
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  for (let i = 0; i + 4 <= bytes.length; i++) {
    if (bytes[i] !== 0x50 || bytes[i + 1] !== 0x4b) continue;
    // Local file header PK\x03\x04: name length at +26, name at +30.
    // Central directory header PK\x01\x02: name length at +28, name at +46.
    const local = bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04;
    const central = bytes[i + 2] === 0x01 && bytes[i + 3] === 0x02;
    if (!local && !central) continue;
    const [lenAt, nameAt] = local ? [26, 30] : [28, 46];
    if (i + nameAt > bytes.length) continue;
    const len = dv.getUint16(i + lenAt, true);
    if (len === 0 || i + nameAt + len > bytes.length) continue;
    names.add(dec.decode(bytes.subarray(i + nameAt, i + nameAt + len)));
  }
  return [...names];
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
