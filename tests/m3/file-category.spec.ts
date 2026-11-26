import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FILE_CATEGORIES, MATERIAL_KINDS, defaultMaterial, isMaterialKind, materialMismatch, materialOf } from "../../src/lib/content/sections";

// Event material kinds (DECISIONS 26.11): the uploader picks summary, game, the lecturer's slides or
// resources, each with its icon. Preselected from the file (HTML → game, PDF → summary), so Ido's flow
// needs nothing new. A pick that doesn't fit the file gets a message; nothing is fixed silently.
// The RLS side (admin-only writes, members read, guests nothing) is in scripts/rls-m3-content.mjs.

const ROOT = resolve(__dirname, "../..");
const src = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const MIGRATION = "supabase/migrations/20261126120000_event_file_category.sql";

test.describe("event material kinds", () => {
  test.skip(({ isMobile }) => isMobile, "pure check: desktop project only");

  test("four kinds for the uploader, three stored categories for PDFs", () => {
    expect([...MATERIAL_KINDS]).toEqual(["summary", "game", "slides", "resources"]);
    expect([...FILE_CATEGORIES]).toEqual(["summary", "slides", "resources"]);
    for (const k of MATERIAL_KINDS) expect(isMaterialKind(k)).toBe(true);
    for (const k of ["pdf", "lesson", "", "Game", null, undefined, 1]) expect(isMaterialKind(k)).toBe(false);
  });

  test("default from the chosen file: HTML is a game, a PDF is a summary", () => {
    expect(defaultMaterial("lesson.html")).toBe("game");
    expect(defaultMaterial("LESSON.HTM")).toBe("game");
    expect(defaultMaterial("summary.pdf")).toBe("summary");
    expect(defaultMaterial("")).toBe("summary");
  });

  test("picks that don't fit the file get a message", () => {
    expect(materialMismatch("game", "pdf")).toBe("fileKindMismatchGame");
    for (const k of ["summary", "slides", "resources"] as const) {
      expect(materialMismatch(k, "pdf")).toBeNull();
      expect(materialMismatch(k, "html")).toBe("fileKindMismatchPdf");
    }
    expect(materialMismatch("game", "html")).toBeNull();
  });

  test("a stored file's kind: a lesson is a game, a PDF is its category", () => {
    expect(materialOf({ kind: "lesson", category: "summary" })).toBe("game");
    expect(materialOf({ kind: "pdf", category: "slides" })).toBe("slides");
    expect(materialOf({ kind: "pdf" })).toBe("summary");
  });

  test("migration: default summary, only the three values, only PDFs can be other than summary", () => {
    const sql = src(MIGRATION).replace(/--.*$/gm, "");
    expect(sql).toMatch(/add column category text not null default 'summary'/);
    expect(sql).toMatch(/check \(category in \('summary', 'slides', 'resources'\)\)/);
    expect(sql).toMatch(/check \(category = 'summary' or path ~ '\\\.pdf\$'\)/);
    // No grant or policy change: writes stay admin-only through the existing RLS.
    expect(sql).not.toMatch(/\bgrant\b|\bcreate policy\b|\bsecurity definer\b/i);
  });

  test("upload: no pick means the file's default; a pick that doesn't fit is refused with the message", () => {
    const a = src("src/app/[locale]/admin/content/actions.ts");
    expect(a).toMatch(/const material = isMaterialKind\(picked\) \? picked : defaultMaterial\(`x\.\$\{ext\}`\);/);
    expect(a).toMatch(/const mismatch = materialMismatch\(material, ext\);\s*if \(mismatch\) return \{ ok: false, message: t\(mismatch\) \};/);
    // Checked before anything is stored.
    expect(a.indexOf("materialMismatch(material, ext)")).toBeLessThan(a.indexOf('storage.from("event-files").upload'));
    expect(a).toMatch(/status: "published", category \}/);
  });

  test("changing it later: admin client, checks against the stored file, PDF rows only", () => {
    const a = src("src/app/[locale]/admin/content/actions.ts");
    const fn = a.slice(a.indexOf("export async function setFileCategory"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toMatch(/await adminClient\(\)/);
    expect(body).toMatch(/!isMaterialKind\(material\)/);
    expect(body).toMatch(/materialMismatch\(material, fileFormat\(row\.path\)\)/);
    expect(body).toMatch(/\.update\(\{ category: material \}\)\.eq\("id", id\)\.eq\("kind", "pdf"\)/);
  });

  test("editor: one picker with icons, in the upload form and in each row", () => {
    const picker = src("src/components/admin/content/material-picker.tsx");
    expect(picker).toMatch(/MATERIAL_KINDS\.map/);
    expect(picker).toMatch(/<MaterialIcon kind=\{k\} \/>/);
    expect(picker).toMatch(/type="radio" name="material"/);
    expect(picker).toMatch(/role="alert"[^>]*data-testid="material-mismatch"/);
    const p = src("src/components/admin/content/files-panel.tsx");
    expect(p).toMatch(/setMaterial\(defaultMaterial\(name\)\)/);
    expect(p).toMatch(/\{picked && <MaterialPicker /);
    // The button waits for a pick that fits (the picker says why); the form reset clears the choice.
    expect(p).toMatch(/disabled=\{uploadMismatch !== null \|\| direct\?\.busy === true\}/);
    expect(p).toMatch(/addEventListener\("reset", clear, true\)/);
    expect(p).toMatch(/<ActionForm action=\{setFileCategory\}[\s\S]*?<MaterialPicker/);
    // The tiles' own icons and tab names (tau-designer, file-tiles.tsx), not a second set.
    expect(src("src/components/admin/content/material-icon.tsx")).toMatch(/import \{ FileKindIcon \} from "@\/components\/content\/file-tiles"/);
    expect(picker).toMatch(/summary: "fileTabPdf", game: "fileTabLesson", slides: "fileTabSlides", resources: "fileTabResources"/);
  });

  test("members' pages get each file's category (lecture via the API route, workshop via data.ts)", () => {
    for (const f of ["src/lib/content/data.ts", "src/app/api/events/[slug]/content/route.ts"]) {
      expect(src(f), f).toMatch(/from\("event_files"\)\.select\("id, title_he, title_en, kind, category, path"\)/);
    }
    expect(src("src/app/[locale]/admin/content/[id]/page.tsx")).toMatch(/kind, category/);
  });

  test("labels and messages in both languages", () => {
    const he = JSON.parse(src("messages/he.json")).content;
    const en = JSON.parse(src("messages/en.json")).content;
    expect([he.fileCategory, he.fileTabPdf, he.fileTabLesson, he.fileTabSlides, he.fileTabResources]).toEqual([
      "סוג הקובץ",
      "סיכום",
      "משחק",
      "מצגת המרצה",
      "חומר עזר",
    ]);
    for (const k of ["fileCategory", "fileTabPdf", "fileTabLesson", "fileTabSlides", "fileTabResources", "fileKindMismatchGame", "fileKindMismatchPdf", "fileKindSave", "fileKindChange"]) {
      expect(typeof he[k], k).toBe("string");
      expect(typeof en[k], k).toBe("string");
    }
  });
});
