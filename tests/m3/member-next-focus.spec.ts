// The home page's member slot (MemberNextEvent) must not drop keyboard focus when its check
// settles. With the member hint it asks the server for the Next event card; a guest gets no card,
// and the guest content (the hero's "meet the speakers" link) stays. It used to be remounted at
// that moment, so a keyboard user who had tabbed onto the link lost focus to <body> (this made
// qa-guest's keyboard walk flaky once the film's pause button was gone, 26.11).
import { expect, test } from "@playwright/test";

test("focus on the hero's speakers link survives the member check settling", async ({ page, context, baseURL, isMobile }) => {
  test.skip(!!isMobile, "desktop");
  await context.addCookies([{ name: "tau_member", value: "1", url: baseURL ?? "http://localhost" }]);
  // Hold the server action's answer, so it settles while the link has focus.
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  let asked = 0;
  await page.route("**/*", async (r) => {
    if (r.request().method() === "POST" && r.request().headers()["next-action"]) {
      asked++;
      await held;
    }
    await r.continue();
  });
  await page.goto("/en");
  // While pending, the guest content is hidden: let it show (as giveBack does) and focus the link.
  await page.evaluate(() => delete document.documentElement.dataset.memberHint);
  const link = page.getByRole("link", { name: /Meet this season/ });
  await expect.poll(() => asked).toBe(1); // the check is out, and held
  await link.focus();
  await expect(link).toBeFocused();
  release();
  // The answer arrives: no card, so the guest view stays, and so does the focus.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  await expect(link).toBeFocused();
});
