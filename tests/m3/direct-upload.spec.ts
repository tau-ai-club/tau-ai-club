import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAX_ACTION_BYTES, MAX_DIRECT_BYTES, checkFileBytes, contentTypeFor, isDirectFormat, stagedFormat, stagedPath, storageName } from "../../src/lib/content/upload";

// PDFs and PowerPoint decks up to 25 MB go straight from the admin's browser to Storage (26.11, B):
// an admin-only action issues a one-time signed upload URL for a staged object, the browser PUTs
// the file, then an admin-only action checks the object (name, size, bytes) before storing and
// listing it. HTML lessons keep the 3 MB Server Action. RLS for staged objects: scripts/rls-m3-content.mjs.

const ROOT = resolve(__dirname, "../..");
const src = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const actions = () => src("src/app/[locale]/admin/content/actions.ts");
const fn = (name: string) => {
  const a = actions();
  const rest = a.slice(a.indexOf(`export async function ${name}`));
  return rest.slice(0, rest.indexOf("\n}\n"));
};

test.describe("direct uploads (PDF and PowerPoint, up to 25 MB)", () => {
  test.skip(({ isMobile }) => isMobile, "pure check: desktop project only");

  test("limits: 25 MB direct, 3 MB through the Server Action (next.config agrees)", () => {
    expect(MAX_DIRECT_BYTES).toBe(25 * 1024 * 1024);
    expect(MAX_ACTION_BYTES).toBe(3 * 1024 * 1024);
    expect(src("next.config.ts")).toMatch(/bodySizeLimit: "3mb"/);
    expect(isDirectFormat("pdf")).toBe(true);
    expect(isDirectFormat("pptx")).toBe(true);
    expect(isDirectFormat("html")).toBe(false);
  });

  test("staged paths: only the ones we issue are accepted", () => {
    const id = "0b5f3c1e-8a1d-4c2e-9f3a-1d2e3f4a5b6c";
    expect(stagedPath(id, "pptx")).toBe(`_incoming/${id}.pptx`);
    expect(stagedFormat(`_incoming/${id}.pptx`)).toBe("pptx");
    expect(stagedFormat(`_incoming/${id}.pdf`)).toBe("pdf");
    for (const p of [
      `_incoming/${id}.html`,
      `_incoming/../zero-to-hero-2/${id}.pdf`,
      `zero-to-hero-2/${id}.pdf`,
      `_incoming/${id}.pdf/x`,
      `_incoming/not-a-uuid.pdf`,
      `/_incoming/${id}.pdf`,
    ]) {
      expect(stagedFormat(p), p).toBeNull();
    }
  });

  test("final names and stored types", () => {
    expect(storageName("zero-to-hero-2", "Lecture Deck (final).pptx", "pptx")).toBe("zero-to-hero-2/Lecture-Deck-final.pptx");
    expect(storageName("x", "מצגת.pptx", "pptx")).toBe("x/file.pptx");
    expect(contentTypeFor("pptx")).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(contentTypeFor("pdf")).toBe("application/pdf");
    expect(contentTypeFor("html")).toBe("text/plain"); // a lesson is never stored as a web page
  });

  test("the server checks the bytes, not the name", () => {
    const enc = new TextEncoder();
    expect(checkFileBytes("pdf", enc.encode("%PDF-1.7 ..."))).toEqual({ ok: true });
    expect(checkFileBytes("pdf", enc.encode("MZ..."))).toEqual({ ok: false, reason: "type" });
    expect(checkFileBytes("pptx", enc.encode("%PDF-1.7"))).toEqual({ ok: false, reason: "type" });
  });

  test("start: admin only, checks name, size and kind before issuing a URL for a fresh staged object", () => {
    const body = fn("startDirectUpload");
    expect(body).toMatch(/await adminClient\(\)/);
    expect(body).toMatch(/!isDirectFormat\(ext\)/);
    expect(body).toMatch(/size > MAX_DIRECT_BYTES/);
    expect(body).toMatch(/materialMismatch\(material, ext\)/);
    expect(body).toMatch(/stagedPath\(randomUUID\(\), ext\)/);
    expect(body).toMatch(/createSignedUploadUrl\(staged\)/);
    // No upsert on the staged object, and never a signed URL for a final (members') name.
    expect(body).not.toMatch(/upsert/);
    expect(body.indexOf("materialMismatch")).toBeLessThan(body.indexOf("createSignedUploadUrl"));
  });

  test("finish: admin only, only our staged paths, real size and bytes checked, staged object always removed", () => {
    const body = fn("finishDirectUpload");
    expect(body).toMatch(/await adminClient\(\)/);
    expect(body).toMatch(/const ext = stagedFormat\(staged\);/);
    expect(body).toMatch(/fileFormat\(name\) !== ext/);
    expect(body).toMatch(/blob\.size > MAX_DIRECT_BYTES/);
    expect(body).toMatch(/checkFileBytes\(ext, bytes\)/);
    expect(body).toMatch(/finally \{\s*await drop\(\);/);
    expect(body.indexOf("checkFileBytes")).toBeLessThan(body.indexOf("storeEventFile"));
  });

  test("the browser sends PDFs and decks directly, HTML lessons through the action; progress and limits in words", () => {
    const panel = src("src/components/admin/content/files-panel.tsx");
    expect(panel).toMatch(/if \(!file \|\| !isDirectFormat\(fileFormat\(file\.name\)\)\) return;/);
    expect(panel).toMatch(/addEventListener\("submit", onSubmit, true\)/);
    expect(panel).toMatch(/<bdi dir="ltr">\{direct\.pct\}%<\/bdi>/);
    const up = src("src/components/admin/content/direct-upload.ts");
    expect(up).toMatch(/file\.size > MAX_DIRECT_BYTES/);
    expect(up).toMatch(/x\.open\("PUT", url\)/);
    expect(up).toMatch(/setRequestHeader\("x-upsert", "false"\)/);
    // Never the service role or a secret in the browser: only the public key, as supabase-js sends.
    expect(up).not.toMatch(/SERVICE_ROLE|SECRET/i);
    for (const loc of ["he", "en"]) {
      const c = JSON.parse(src(`messages/${loc}.json`)).content;
      for (const k of ["fileErrorSizeDirect", "fileErrorUpload", "fileUploading"]) expect(typeof c[k], `${loc} ${k}`).toBe("string");
      expect(c.filesBody, loc).toMatch(/25/);
    }
  });

  test("one migration for pptx and 25 MB (the user runs SQL once): the bucket's limit is 25 MB", () => {
    const sql = src("supabase/migrations/20261126180000_event_file_pptx.sql").replace(/--.*$/gm, "");
    expect(sql).toMatch(/file_size_limit = 26214400\s+where id = 'event-files';/);
    expect(26214400).toBe(MAX_DIRECT_BYTES);
    expect(existsSync(resolve(ROOT, "supabase/migrations/20261126190000_event_files_25mb.sql"))).toBe(false);
  });
});
