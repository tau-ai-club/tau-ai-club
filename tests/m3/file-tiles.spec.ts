import { expect, test, type Page } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import en from "../../messages/en.json";
import he from "../../messages/he.json";
import { FileTiles, type FileKey, type TileFile } from "../../src/components/content/file-tiles";

// The member files as tiles with a tab (DECISIONS 25.11, files-look option A; four kinds, DECISIONS
// 26.11). Lecture and workshop pages need a signed-in member, which this suite has no Supabase for,
// so the tiles are rendered on their own and placed into a real page of the production build: its
// real CSS and fonts, at phone and desktop width, with the page's scripts blocked. The real pages
// pass the locale-aware Link (file-link.tsx).

const FILES: TileFile[] = [
  { id: "11111111-1111-4111-8111-111111111111", title_he: "סיכום הרצאה", title_en: "Talk summary", kind: "pdf" },
  { id: "22222222-2222-4222-8222-222222222222", title_he: "בוחן אינטראקטיבי", title_en: "Interactive quiz", kind: "lesson" },
];

// All four kinds, in upload order that isn't the page order. The summary has no category (Ido's
// uploads and older rows), and the game says "slides" by mistake: HTML is always a game.
const KINDS: TileFile[] = [
  { id: "44444444-4444-4444-8444-444444444444", title_he: "רשימת קריאה וכלים", title_en: "Reading list and tools", kind: "pdf", category: "resources" },
  { id: "33333333-3333-4333-8333-333333333333", title_he: "המצגת של המרצה", title_en: "The lecturer's slides", kind: "pdf", category: "slides" },
  { id: "22222222-2222-4222-8222-222222222222", title_he: "בוחן אינטראקטיבי", title_en: "Interactive quiz", kind: "lesson", category: "slides" },
  { id: "11111111-1111-4111-8111-111111111111", title_he: "סיכום הרצאה", title_en: "Talk summary", kind: "pdf" },
];

function markup(locale: "he" | "en", files: TileFile[]) {
  const m = (locale === "he" ? he : en).content as Record<string, string>;
  const t = (k: FileKey, v?: { title: string }) => m[k].replace("{title}", v?.title ?? "");
  // A plain <a> stands in for the locale-aware Link (that one needs Next's router).
  return renderToStaticMarkup(createElement(FileTiles, { files, locale, t, LessonLink: "a" }));
}

async function place(page: Page, locale: "he" | "en", files: TileFile[]) {
  // No scripts: React never hydrates, so nothing can redraw <main> over the injected tiles (that
  // race made this spec flaky). The server HTML still brings the real CSS and fonts.
  await page.route("**/*", (r) => (r.request().resourceType() === "script" ? r.abort() : r.continue()));
  await page.goto(locale === "he" ? "/" : "/en");
  await expect(page.locator("main")).toBeAttached();
  await page.evaluate((html) => {
    const main = document.querySelector("main")!;
    main.innerHTML = `<section style="padding:2rem 1rem;max-width:52rem;margin:auto">${html}</section>`;
  }, markup(locale, files));
  return page.getByTestId("file-tiles");
}

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const locale of ["he", "en"] as const) {
  test(`${locale}: a summary to download and a game to play, each a single link with a tab`, async ({ page }) => {
    const tiles = await place(page, locale, FILES);
    const pdf = tiles.getByTestId("file-download");
    const lesson = tiles.getByTestId("lesson-open");

    // One link each, named by the full sentence a screen reader should hear.
    await expect(pdf).toHaveAttribute("href", `/api/files/${FILES[0].id}`);
    await expect(lesson).toHaveAttribute("href", new RegExp(`/lessons/${FILES[1].id}$`));
    await expect(pdf).toHaveAccessibleName(locale === "he" ? "הורדת סיכום הרצאה" : "Download Talk summary");
    await expect(lesson).toHaveAccessibleName(locale === "he" ? "שיעור אינטראקטיבי: בוחן אינטראקטיבי" : "Interactive lesson: Interactive quiz");

    // What each one is, said in words (not only by colour): the tab, the line and the button.
    await expect(pdf).toContainText(locale === "he" ? "סיכום" : "Summary");
    await expect(pdf).toContainText(locale === "he" ? "להורדה" : "Download");
    await expect(lesson).toContainText(locale === "he" ? "משחק" : "Play");
    await expect(lesson).toContainText(locale === "he" ? "לשחק עכשיו" : "Play now");

    // The tab is drawn above the tile, on its start corner, and is fully on screen.
    const tab = pdf.locator("span").first();
    const [tb, pb] = [await tab.boundingBox(), await pdf.boundingBox()];
    expect(tb!.y + tb!.height).toBeLessThanOrEqual(pb!.y + 3);
    if (locale === "he") expect(Math.abs(tb!.x + tb!.width - (pb!.x + pb!.width))).toBeLessThan(3);
    else expect(Math.abs(tb!.x - pb!.x)).toBeLessThan(3);

    // The game stands out: a solid purple button; the summary's is an outline.
    const bg = (l: typeof pdf) => l.locator("span").last().evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(await bg(lesson)).not.toBe(await bg(pdf));

    // No sideways scroll, phone or desktop.
    expect(await noSidewaysScroll(page)).toBe(true);
  });

  test(`${locale}: four kinds in a fixed order, each told apart by its tab, icon and name`, async ({ page }, info) => {
    const tiles = await place(page, locale, KINDS);
    const items = tiles.locator(":scope > li");

    // Summary, game, slides, resources, whatever order they were uploaded in. A missing category
    // reads as a summary; an HTML file is a game even if its category says otherwise.
    await expect(items).toHaveCount(4);
    expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")))).toEqual(["summary", "lesson", "slides", "resources"]);

    const he_ = locale === "he";
    const want = [
      { href: `/api/files/${KINDS[3].id}`, tab: he_ ? "סיכום" : "Summary", name: he_ ? "הורדת סיכום הרצאה" : "Download Talk summary" },
      { href: `/lessons/${KINDS[2].id}`, tab: he_ ? "משחק" : "Play", name: he_ ? "שיעור אינטראקטיבי: בוחן אינטראקטיבי" : "Interactive lesson: Interactive quiz" },
      { href: `/api/files/${KINDS[1].id}`, tab: he_ ? "מצגת המרצה" : "Slides", name: he_ ? "הורדת המצגת: המצגת של המרצה" : "Download slides: The lecturer's slides" },
      { href: `/api/files/${KINDS[0].id}`, tab: he_ ? "חומר עזר" : "Resources", name: he_ ? "הורדת חומר עזר: רשימת קריאה וכלים" : "Download resource: Reading list and tools" },
    ];
    const icons: string[] = [];
    for (const [i, w] of want.entries()) {
      const link = items.nth(i).getByRole("link");
      await expect(link).toHaveAttribute("href", w.href);
      await expect(link).toHaveAccessibleName(w.name);
      await expect(link.locator("span").first()).toHaveText(w.tab); // the tab
      icons.push(await link.locator("svg").first().innerHTML());
    }
    // Four different icons.
    expect(new Set(icons).size).toBe(4);

    // Only the game is purple: the three PDF buttons are the same outline, the game's is solid.
    const bg = (i: number) => items.nth(i).locator("a > span").last().evaluate((e) => getComputedStyle(e).backgroundColor);
    const [s, g, sl, r] = [await bg(0), await bg(1), await bg(2), await bg(3)];
    expect(g).not.toBe(s);
    expect(sl).toBe(s);
    expect(r).toBe(s);

    // 2×2 on desktop, stacked on the phone; no sideways scroll either way.
    const boxes = await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
    if (info.project.name === "mobile") {
      for (let i = 1; i < 4; i++) expect(boxes[i].top).toBeGreaterThan(boxes[i - 1].bottom);
    } else {
      expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThan(2);
      expect(Math.abs(boxes[2].top - boxes[3].top)).toBeLessThan(2);
      expect(boxes[2].top).toBeGreaterThan(boxes[0].bottom);
      // Hebrew reads right to left: the first tile of a row sits on the right.
      if (he_) expect(boxes[0].left).toBeGreaterThan(boxes[1].left);
      else expect(boxes[0].left).toBeLessThan(boxes[1].left);
    }
    expect(await noSidewaysScroll(page)).toBe(true);
  });
}

for (const locale of ["he", "en"] as const) {
  test(`${locale}: a PowerPoint deck is the slides tile, says PowerPoint, and downloads`, async ({ page }) => {
    const he_ = locale === "he";
    // A .pptx: kind pdf (it downloads), category slides. Even with no category it reads as slides.
    const PPTX: TileFile = { id: "55555555-5555-4555-8555-555555555555", title_he: "המצגת של המרצה", title_en: "The lecturer's deck", kind: "pdf", format: "pptx" };
    const tiles = await place(page, locale, [PPTX, KINDS[3]]);
    const items = tiles.locator(":scope > li");
    expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")))).toEqual(["summary", "slides"]);
    const link = items.nth(1).getByRole("link");
    await expect(link).toHaveAttribute("href", `/api/files/${PPTX.id}`);
    await expect(link).toHaveAccessibleName(he_ ? "הורדת המצגת (PowerPoint): המצגת של המרצה" : "Download slides (PowerPoint): The lecturer's deck");
    await expect(link.locator("span").first()).toHaveText(he_ ? "מצגת המרצה" : "Slides");
    await expect(link).toContainText(he_ ? "PowerPoint · להורדה" : "PowerPoint · download");
    await expect(link).not.toContainText("PDF");
    await expect(link).toContainText(he_ ? "להורדה" : "Download");
    expect(await noSidewaysScroll(page)).toBe(true);
  });
}

// A file uploaded with no title shows its file name: one long word with no spaces (prod, lesson 1,
// iPhone at 390). It must wrap inside its tile, not run off the screen. Two files of one kind
// (zero-to-hero-2 has two summaries) are two tiles, both shown.
const LONG: TileFile[] = [
  { id: "66666666-6666-4666-8666-666666666666", title_he: "AI_Past_and_Future_Shay_Yahal.pdf", title_en: "AI_Past_and_Future_Shay_Yahal.pdf", kind: "pdf", category: "summary" },
  { id: "77777777-7777-4777-8777-777777777777", title_he: "Averyveryverylongfilenamewithnobreakchanceatallanywhere2026.pdf", title_en: "Averyveryverylongfilenamewithnobreakchanceatallanywhere2026.pdf", kind: "pdf", category: "summary" },
  { id: "88888888-8888-4888-8888-888888888888", title_he: "סיכום ההרצאה", title_en: "Talk summary", kind: "pdf" },
];
for (const locale of ["he", "en"] as const) {
  for (const width of [360, 390]) {
    test(`${locale} ${width}: a long file name with no spaces wraps inside its tile; every summary shows`, async ({ page }, info) => {
      test.skip(info.project.name !== "mobile", "phone widths only");
      await page.setViewportSize({ width, height: 844 });
      const tiles = await place(page, locale, LONG);
      const items = tiles.locator(":scope > li");
      await expect(items).toHaveCount(3);
      expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")))).toEqual(["summary", "summary", "summary"]);
      for (let i = 0; i < 3; i++) {
        const link = items.nth(i).getByRole("link");
        // The whole name is still there, to read and to hear.
        await expect(link).toContainText((locale === "he" ? LONG[i].title_he : LONG[i].title_en).slice(-12));
        // Nothing inside the tile reaches past its edges, and the tile fits the screen.
        const out = await link.evaluate((a) => {
          const r = a.getBoundingClientRect();
          const bad = [...a.querySelectorAll("span")].filter((s) => {
            const b = s.getBoundingClientRect();
            return b.width > 0 && !s.matches("[aria-hidden]") && (b.left < r.left - 1 || b.right > r.right + 1);
          });
          return { bad: bad.length, left: r.left, right: r.right, vw: window.innerWidth };
        });
        expect(out.bad).toBe(0);
        expect(out.left).toBeGreaterThanOrEqual(0);
        expect(out.right).toBeLessThanOrEqual(out.vw);
      }
      expect(await noSidewaysScroll(page)).toBe(true);
    });
  }
}
