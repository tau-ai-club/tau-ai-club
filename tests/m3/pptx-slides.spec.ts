import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PPTX_MIME, checkPptx, zipEntryNames } from "../../src/lib/content/pptx";
import { defaultMaterial, fileFormat, materialMismatch, withFormat } from "../../src/lib/content/sections";

// The lecturer's slides may be PowerPoint (DECISIONS 26.11): a .pptx goes up only as מצגת המרצה,
// members only download it, and the upload refuses anything that isn't a plain presentation.
// The DB side (path, category by format, bucket MIME types) is in scripts/rls-m3-content.mjs.

const ROOT = resolve(__dirname, "../..");
const src = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

/** A minimal zip (stored, no compression) with these entry names, enough for the central directory. */
function zip(names: string[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const n of names) {
    const name = enc.encode(n);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const end = new Uint8Array(22);
  new DataView(end.buffer).setUint32(0, 0x06054b50, true);
  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) out.set(p, (at += p.length) - p.length);
  return out;
}
const DECK = ["[Content_Types].xml", "_rels/.rels", "ppt/presentation.xml", "ppt/slides/slide1.xml"];

test.describe("PowerPoint slides", () => {
  test.skip(({ isMobile }) => isMobile, "pure check: desktop project only");

  test("a plain deck passes, including an embedded Excel chart", () => {
    expect(zipEntryNames(zip(DECK))).toEqual(DECK);
    expect(checkPptx(zip(DECK))).toEqual({ ok: true });
    expect(checkPptx(zip([...DECK, "ppt/embeddings/Microsoft_Excel_Worksheet.xlsx"]))).toEqual({ ok: true });
  });

  test("not a presentation: refused as the wrong type", () => {
    expect(checkPptx(new TextEncoder().encode("%PDF-1.4 hello"))).toEqual({ ok: false, reason: "type" });
    expect(checkPptx(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toEqual({ ok: false, reason: "type" }); // an .exe
    expect(checkPptx(zip(["[Content_Types].xml", "word/document.xml"]))).toEqual({ ok: false, reason: "type" }); // a .docx
    expect(checkPptx(new Uint8Array())).toEqual({ ok: false, reason: "type" });
  });

  test("macros, ActiveX and embedded OLE programs: refused as unsafe", () => {
    expect(checkPptx(zip([...DECK, "ppt/vbaProject.bin"]))).toEqual({ ok: false, reason: "unsafe" });
    expect(checkPptx(zip([...DECK, "ppt/activeX/activeX1.xml"]))).toEqual({ ok: false, reason: "unsafe" });
    expect(checkPptx(zip([...DECK, "ppt/embeddings/oleObject1.bin"]))).toEqual({ ok: false, reason: "unsafe" });
  });

  test("a .pptx is the lecturer's slides only: preselected, and anything else gets a message", () => {
    expect(fileFormat("Deck.PPTX")).toBe("pptx");
    expect(defaultMaterial("deck.pptx")).toBe("slides");
    expect(materialMismatch("slides", "pptx")).toBeNull();
    for (const k of ["summary", "game", "resources"] as const) expect(materialMismatch(k, "pptx")).toBe("fileKindMismatchPptx");
    // PDFs and lessons as before.
    expect(materialMismatch("slides", "pdf")).toBeNull();
    expect(materialMismatch("game", "pdf")).toBe("fileKindMismatchGame");
  });

  test("members get the format, never the path", () => {
    const f = withFormat({ id: "1", title_he: "x", title_en: "x", kind: "pdf" as const, category: "slides" as const, path: "e/deck.pptx" });
    expect(f).toEqual({ id: "1", title_he: "x", title_en: "x", kind: "pdf", category: "slides", format: "pptx" });
    expect("path" in f).toBe(false);
    for (const p of ["src/lib/content/data.ts", "src/app/api/events/[slug]/content/route.ts"]) {
      expect(src(p), p).toMatch(/\.map\(withFormat\)/);
    }
  });

  test("upload: checked before it's stored, saved with the pptx type; the editor accepts .pptx", () => {
    const a = src("src/app/[locale]/admin/content/actions.ts");
    const check = a.indexOf("checkPptx(bytes)");
    expect(check).toBeGreaterThan(0);
    expect(check).toBeLessThan(a.indexOf('storage.from("event-files").upload'));
    expect(a).toMatch(/ext === "pptx" \? PPTX_MIME/);
    expect(PPTX_MIME).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(src("src/components/admin/content/files-panel.tsx")).toMatch(/accept="[^"]*\.pptx"/);
    // Members download it through the same members-only signed URL, as an attachment.
    expect(src("src/app/api/files/[id]/route.ts")).toMatch(/createSignedUrl\(file\.path, 60, \{ download: name \}\)/);
  });

  test("migration: .pptx paths, slides only, bucket type; the applied category migration is untouched", () => {
    const sql = src("supabase/migrations/20261126180000_event_file_pptx.sql").replace(/--.*$/gm, "");
    expect(sql).toMatch(/\\\.\(pdf\|html\|pptx\)\$/);
    expect(sql).toMatch(/when path ~ '\\\.pptx\$' then category = 'slides'/);
    expect(sql).toMatch(/drop constraint if exists event_files_category_pdf_only/);
    expect(sql).toMatch(/'application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation'/);
    expect(sql).not.toMatch(/file_size_limit|\bgrant\b|\bcreate policy\b|security definer/i);
  });

  test("messages in both languages", () => {
    for (const loc of ["he", "en"]) {
      const c = JSON.parse(src(`messages/${loc}.json`)).content;
      for (const k of ["fileKindMismatchPptx", "fileErrorPptxUnsafe"]) expect(typeof c[k], `${loc} ${k}`).toBe("string");
      expect(c.fileChoose, loc).toContain("PowerPoint");
    }
  });
});
