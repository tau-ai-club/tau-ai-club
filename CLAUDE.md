# TAU AI Club website: project rules

The official site of the TAU AI Club (Tel Aviv University), Cohort 02, 2026–27.
Plan and scope: `docs/PLAN.md`. Hosting: `docs/hosting-options.md`. Handover: `HANDOVER.md`.

**Before any task, read `docs/DECISIONS.md`.** It lists what the user already approved (designs, copy, behaviour). Don't change or replace any of it without asking the user first. If a doc elsewhere (HANDOVER, PLAN, a mockup) disagrees with DECISIONS.md, DECISIONS.md wins; say so in your report.

@AGENTS.md

## Stack
- Next.js 16 (App Router, Turbopack), TypeScript strict, React 19.
- Tailwind CSS 4 + shadcn/ui (`base-nova` style on Base UI, RTL enabled). Icons: lucide-react.
- next-intl 4: Hebrew (default, RTL) and English (LTR).
- Supabase: Postgres + RLS, Auth from Milestone 2. Access through `@supabase/ssr`.
- Hosting: Vercel Hobby. Production: `https://tauaiclub.com` (www redirects to apex), fallback `tau-ai-club.vercel.app`; site URL comes from `NEXT_PUBLIC_SITE_URL`. Package manager: **pnpm** (`packageManager` is pinned in package.json).

Next 16 differs from older versions. Read `node_modules/next/dist/docs/` before using an API you're unsure of. `middleware.ts` is now `src/proxy.ts`.

## Commands
| | |
|---|---|
| `pnpm dev` | dev server (needs `.env.local`; see `.env.example`) |
| `pnpm dev:fixtures` | dev server on seed fixtures, no Supabase needed |
| `pnpm build` / `pnpm start` | production build / serve (use these for QA, not `dev`) |
| `pnpm lint` · `pnpm typecheck` · `pnpm check` | ESLint · `next typegen && tsc` · both |
| `pnpm db:check` | apply migrations + seed to in-memory Postgres (PGlite) and run RLS checks as `anon` |
| `pnpm db:fixtures` | same, and regenerate `src/lib/data/fixtures.json` |

On this Windows machine pnpm lives in `%LOCALAPPDATA%\pnpm-cli` (corepack can't write to Program Files). `npx pnpm@12.18.0 …` also works.

A `.claude/settings.json` hook runs ESLint on the edited file plus `tsc --noEmit` after every Edit/Write and blocks on errors.

## Folders
```
src/app/[locale]/         routes (layout sets <html lang dir>; every page calls setRequestLocale)
src/app/tokens.css        brand tokens: the ONLY place brand values live in code
src/app/globals.css       maps tokens onto Tailwind + shadcn names (no raw values here)
src/components/ui/        shadcn primitives (generated; restyle via tokens, not by forking)
src/components/site/      header, footer, language switch
src/components/events/    Next event card, timeline, event bits
src/i18n/                 routing (locales, TIME_ZONE), request config, navigation helpers
src/lib/events.ts         data layer: getSeason / getNextEvent / getEventBySlug
src/lib/event-format.ts   localized fields, dates (Asia/Jerusalem), Google Calendar URL
src/lib/supabase/         public.ts (cookie-less, for ISR pages) · server.ts (cookie-aware, M2+)
src/config/site.ts        configuration constants (site URL, social links, revalidate)
messages/{he,en}.json     UI microcopy only (labels, buttons, empty states)
supabase/migrations/      SQL migrations, timestamped, never edited after they're applied to prod
supabase/seed.sql         season seed (`-- REVIEW` marks unconfirmed facts/spellings)
scripts/check-db.mjs      PGlite SQL + RLS check, fixture export
brand/  design/           OWNED BY THE DESIGNER. Builder doesn't edit these.
docs/  qa/                plan, hosting note · QA test plan (owned by QA)
```

## Content
- **All content (events, speakers, venues, cohort taglines) lives in Supabase.** Never hardcode it in components or messages.
- `messages/*.json` holds only interface microcopy, in both languages, with the same keys.
- Bilingual columns are `<field>_he` / `<field>_en`. Read them with `loc(row, "field", locale)`, which falls back to the other language.
- Fixtures (`USE_FIXTURES=1`) are generated from `seed.sql`, never edited by hand, and are ignored in production.

## i18n and RTL
- Hebrew is the default at `/`. English is at `/en/...` (`localePrefix: "as-needed"`). `/he/...` redirects to `/...`.
- `<html lang dir>` is set per locale in `src/app/[locale]/layout.tsx`.
- **Logical properties only:** `ms-/me-/ps-/pe-/start-/end-/border-s/text-start`. Never `ml-/mr-/pl-/pr-/left-/right-/text-left`.
- Directional icons (arrows, chevrons) are swapped per locale. The logo is never mirrored.
- Numbers, dates, times, URLs and codes inside Hebrew text go in `<bdi>` (and `dir="ltr"` where order matters), so they don't reorder.
- Silkscreen (`.eyebrow-pixel`) is Latin only. Hebrew eyebrows use `.eyebrow-he` (Rubik 500, no letter-spacing).
- Times are always Israel time (`TIME_ZONE = "Asia/Jerusalem"`), whatever the viewer's timezone. Use the helpers in `event-format.ts`.

## Data and caching
- Public pages use ISR: `export const revalidate = 300` with the cookie-less client in `lib/supabase/public.ts`. Calling `cookies()`/`headers()` on a public page makes it dynamic, so don't.
- **Cache Components is deliberately off** (`cacheComponents: false`). next-intl's static rendering is proven on the classic model. Revisit once next-intl's `next/root-params` support is stable.
- **Next event** = the first published event with `ends_at > now`. It is "live" while it's running and switches at 20:00 (it can lag by up to 300s). `classifyEvents()` in `lib/events.ts` is pure; test against it.
- `DEBUG_NOW=<ISO>` pins "now" outside production (for QA boundary tests).

## Security (RLS first)
- RLS is on for every table. The UI is never the security boundary.
- The anon role can only SELECT published content. In M1, writes go through the service role only. M2 adds `is_admin()` policies.
- **Speaker contact data (email, phone, private LinkedIn) never reaches public responses, page source, `generateMetadata`, OG tags or client components.** It will live in `speaker_contacts` (M2), readable only through security-definer RPCs.
- Secrets live only in env vars (Vercel / `.env.local`). Never commit `.env*` other than `.env.example`. The service-role key never goes in `NEXT_PUBLIC_*` or client code.
- Every migration must pass `pnpm db:check` (add a check for each new policy).
- There are two separate Supabase projects: `tau-ai-club-dev` (local + Vercel Preview) and `tau-ai-club-prod` (Vercel Production only).

## Design and motion
- Dark, near-black indigo (`--bg #0B0A1F`, never `#000`). Purple `#8A2BFF` only for CTAs, focus and highlights. Accent text uses `--brand-purple-soft`. Body text is `--fg-muted`, at 60–75ch.
- Use tokens through Tailwind (`bg-bg`, `text-fg-muted`, `border-border-accent`, `text-brand-purple-soft`, `rounded-lg`, `font-pixel`, `font-mono`). No raw hex in components.
- Motion (motion.dev, added by the designer): fade plus an 8–12px slide, ease-out-quint, 400–600ms, nothing bouncy. `prefers-reduced-motion` means static.
- **The Next event card is server-rendered, visible at first paint and never animated in.** Keep it a server component with no entrance animation.
- WCAG AA contrast, visible focus (2px purple outline), real labels, and states shown with text as well as color.

## Skills (`.claude/skills/`)
Vendored third-party review skills: `web-design-guidelines`, `react-best-practices`, `baseline-ui`, `fixing-accessibility`, `fixing-motion-performance`, `fixing-metadata`. Sources and versions are in `.claude/skills/README.md`.
- They're generic, and written for English LTR sites. When one disagrees with `docs/DECISIONS.md`, this file or `brand/`, the project wins. Report the clash rather than "fixing" approved design or copy.
- Ignore their brand-colour, easing and duration, letter-spacing and English-copy rules (Title Case, curly quotes, first person). The rules above set those.
- Treat their findings as suggestions. Approved designs still need the user's OK before they change.

## Git
- Branch from `main`: `feat/…`, `fix/…`, `chore/…`. Keep commits small, with an imperative subject line.
- Before committing, run `pnpm check`. After touching SQL, also run `pnpm db:check`.
- `main` → Vercel Production. Every other branch gets a Preview deployment.
- Never commit secrets, `.env.local` or real member data.

## Agents (`.claude/agents/`)
| Agent | Owns | Doesn't touch |
|---|---|---|
| `builder` | app code, schema, migrations, RLS, data layer, deploy config, `CLAUDE.md`, `HANDOVER.md` | `brand/`, `design/`, approved tokens |
| `designer` | `brand/`, `design/`, `src/app/tokens.css` values, visual pass on components, motion, copy tone | schema, RLS, data logic |
| `qa` | `qa/`, Playwright specs, reports (pass/fail with repro steps) | app code (reports only, never fixes) |

Build only the approved milestone. Hand finished work to `qa` before calling it done.
