import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { linkedinUrl } from "../../src/lib/members/linkedin-url";

// "Connect on LinkedIn" (25.11): /members/linkedin lists the members with a LinkedIn link, for
// signed-in members only. This setup can't reach Supabase, so everyone is a guest here: guests
// are sent to log in and never get the list. The rest is checked on the source and the helper.

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

for (const prefix of ["", "/en"]) {
  test(`guests are sent to log in from ${prefix}/members/linkedin, with no list in the page`, async ({ page }) => {
    const res = await page.goto(`${prefix}/members/linkedin`);
    await expect(page).toHaveURL(new RegExp(`${prefix}/login\\?next=%2Fmembers%2Flinkedin$`));
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByTestId("members-linkedin")).toHaveCount(0);
    await expect(page.getByTestId("linkedin-row")).toHaveCount(0);
  });
}

test.describe("source and helper", () => {
  test.skip(({ isMobile }) => isMobile, "pure check: desktop project only");

  test("only a real LinkedIn address opens from the list", () => {
    expect(linkedinUrl("https://www.linkedin.com/in/someone/")).toBe("https://www.linkedin.com/in/someone/");
    expect(linkedinUrl("http://il.linkedin.com/in/someone")).toBe("https://il.linkedin.com/in/someone");
    expect(linkedinUrl("https://linkedin.com/in/x")).toBe("https://linkedin.com/in/x");
    for (const bad of ["javascript:alert(1)", "https://evil.example/linkedin.com", "https://linkedin.com.evil.example/in/x", "https://notlinkedin.com/in/x", "", null, 42, "x".repeat(400)]) {
      expect(linkedinUrl(bad), String(bad)).toBeNull();
    }
  });

  test("members only, and only what member pages already show: name, photo, year, faculty, the LinkedIn link", () => {
    const page = code("src/app/[locale]/members/linkedin/page.tsx");
    expect(page).toMatch(/await requireMember\("\/members\/linkedin"\)/);
    expect(page).toMatch(/robots: \{ index: false/);
    expect(page).not.toMatch(/service|SERVICE_ROLE|email|phone/);
    const lib = code("src/lib/members/linkedin.ts");
    expect(lib).toMatch(/import "server-only"/);
    expect(lib).toMatch(/getMemberDirectory\(supabase\)/); // active members, members only
    expect(lib).toMatch(/\.from\("profiles"\)\.select\("member_id, linkedin:links->>linkedin"\)/); // the linkedin key only
    expect(lib).not.toMatch(/member_contacts|member_emails|email|phone|github|website/);
    expect(lib).toMatch(/m\.id !== viewerId/); // not yourself
  });

  test("the marks stay in the viewer's browser: nothing is sent or stored on the server", () => {
    const list = code("src/components/members/linkedin-list.tsx");
    expect(list).toMatch(/localStorage\.getItem\(key\)/);
    expect(list).toMatch(/`tau-linkedin-done:\$\{viewerId\}`/);
    expect(list).not.toMatch(/fetch\(|"use server"|supabase|action=/);
    expect(list).toMatch(/target="_blank"\s+rel="noopener noreferrer nofollow"/);
    expect(list).toMatch(/role="progressbar"/);
  });

  test("the way in sits inside the members area, next to the directory, not in the top nav", () => {
    expect(code("src/app/[locale]/members/page.tsx")).toMatch(/<MembersViews current="all" \/>/);
    expect(code("src/app/[locale]/members/linkedin/page.tsx")).toMatch(/<MembersViews current="linkedin" \/>/);
    expect(code("src/components/members/members-views.tsx")).toMatch(/href: "\/members\/linkedin"/);
    expect(read("src/components/site/member-nav.tsx")).not.toMatch(/members\/linkedin/);
    const he = JSON.parse(read("messages/he.json")).directory;
    const en = JSON.parse(read("messages/en.json")).directory;
    expect(he.viewLinkedin).toBe("להתחבר בלינקדאין");
    expect(he.linkedinOpen).toBe("פתיחה");
    for (const k of ["viewsLabel", "viewAll", "viewLinkedin", "linkedinTitle", "linkedinBody", "linkedinProgress", "linkedinProgressLabel", "linkedinOpen", "linkedinOpenSr", "linkedinMark", "linkedinDone", "linkedinEmpty", "linkedinLocalNote"]) {
      expect(he[k], k).toBeTruthy();
      expect(en[k], k).toBeTruthy();
    }
  });
});
