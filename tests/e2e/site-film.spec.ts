import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// The home page's moving film on every page (25.11). Rendered once, by the layout: home keeps its
// tall film; other pages get a band behind the header and the title area that fades out before the
// content. Everything HeroFilm promised still holds on every page.

const ROOT = resolve(__dirname, "../..");
const code = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
const PAGES = ["/learn", "/en/learn", "/events/cohort-02-opening", "/en/workshops/zero-to-hero-1", "/login"];

test("exactly one film canvas on every page: tall on home, a band elsewhere", async ({ page }) => {
  for (const p of ["/", "/en", ...PAGES]) {
    await page.goto(p);
    const film = page.getByTestId("site-film");
    await expect(film, p).toHaveCount(1);
    await expect(page.locator("canvas"), p).toHaveCount(1);
    await expect(film, p).toHaveAttribute("data-variant", p === "/" || p === "/en" ? "home" : "band");
    await expect(film, p).toHaveAttribute("aria-hidden", "true");
    expect(await film.evaluate((el) => getComputedStyle(el).pointerEvents), p).toBe("none");
    // Behind the header and the title only: the band ends well before the page does.
    if (p !== "/" && p !== "/en") {
      const h = await film.evaluate((el) => el.getBoundingClientRect().height);
      expect(h, p).toBeLessThanOrEqual(32 * 16 + 1);
      expect(await film.evaluate((el) => getComputedStyle(el).maskImage), p).toContain("linear-gradient");
    }
  }
});

test("a pause button on every page; pausing holds across pages (one setting for the site)", async ({ page }) => {
  await page.goto("/learn");
  const toggle = page.locator('[data-testid="film-toggle"]:visible');
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveText("עצירת הרקע");
  const frame = async () => (await page.locator("canvas").screenshot()).toString("base64");
  await toggle.click();
  await expect(toggle).toHaveText("הפעלת הרקע");
  await page.goto("/login");
  await expect(page.locator('[data-testid="film-toggle"]:visible')).toHaveText("הפעלת הרקע");
  const a = await frame();
  await page.waitForTimeout(600);
  expect(await frame()).toBe(a); // paused: the frame doesn't change
  await page.goto("/en");
  await expect(page.locator('[data-testid="film-toggle"]:visible')).toHaveText("Play background");
  await page.locator('[data-testid="film-toggle"]:visible').click(); // back to playing for later tests
});

test("reduced motion: no film and no button on any page", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const p of ["/", ...PAGES]) {
    await page.goto(p);
    await expect(page.getByTestId("site-backdrop"), p).toHaveCount(1); // the static background stays
    await expect(page.locator("canvas"), p).toHaveCount(0);
    await expect(page.locator('[data-testid="film-toggle"]:visible'), p).toHaveCount(0);
  }
  await ctx.close();
});

test("not in the server HTML (no first-paint or LCP cost)", async ({ request }) => {
  for (const p of ["/", "/learn"]) {
    const html = await (await request.get(p)).text();
    expect(html, p).not.toContain("<canvas");
    expect(html, p).not.toContain('data-testid="site-film"');
  }
});

test("source: one film, in the layout; HeroFilm keeps its guards", () => {
  test.skip(test.info().project.name !== "desktop", "source check: once");
  const layout = code("src/app/[locale]/layout.tsx");
  expect(layout.match(/<SiteFilm \/>/g)).toHaveLength(1);
  expect(code("src/app/[locale]/page.tsx")).not.toMatch(/<HeroFilm\b/);
  const film = code("src/components/home/hero-film.tsx");
  expect(film).toMatch(/prefers-reduced-motion: reduce/);
  expect(film).toMatch(/saveData === true/);
  expect(film).toMatch(/new IntersectionObserver/);
  expect(film).toMatch(/visibilitychange/);
  expect(film).toMatch(/localStorage\.getItem\(KEY\)/);
  expect(code("src/app/[locale]/admin/layout.tsx")).toMatch(/<FilmToggleInline \/>/);
});
