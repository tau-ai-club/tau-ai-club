# Project skills

Third-party design and review skills, copied in unchanged (vendored) so everyone on the team gets the same version. Claude Code loads them automatically from this folder.

| Skill | What it does | Source | Version | License |
|---|---|---|---|---|
| `web-design-guidelines` | Reviews UI code against Vercel's Web Interface Guidelines and lists problems as `file:line`. It downloads the latest rules on every run | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | `1a2c79d` (2026-10-27) | MIT |
| `react-best-practices` | Vercel's React / Next.js performance rules (waterfalls, bundle size, rendering) for writing and reviewing code | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | `1a2c79d` (2026-10-27) | MIT |
| `baseline-ui` | Quick cleanup pass: spacing, hierarchy, typography, small layout issues | [ibelick/ui-skills](https://github.com/ibelick/ui-skills) | `347d318` (2026-11-18) | MIT |
| `fixing-accessibility` | Accessibility audit and fixes (ARIA, keyboard, focus, contrast, form errors) | ibelick/ui-skills | `347d318` | MIT |
| `fixing-motion-performance` | Animation performance audit (compositor properties, layout thrashing, blur) | ibelick/ui-skills | `347d318` | MIT |
| `fixing-metadata` | Titles, descriptions, canonical URLs, Open Graph, JSON-LD, robots | ibelick/ui-skills | `347d318` | MIT |

Impeccable (`.impeccable/`, `PRODUCT.md`) stays the main design skill. These skills sit next to it.

## Which rules win

These skills are general-purpose, written for English, left-to-right sites. If one of them disagrees with this project's rules, the project wins, in this order: `docs/DECISIONS.md` → `CLAUDE.md` → `brand/` → the skill. Known clashes:

- **Brand colour and motion** (`baseline-ui`): "no purple", "no custom easing", "≤200ms" and "never change letter-spacing" don't apply to the brand. Purple `#8A2BFF` is the CTA colour. Motion is ease-out-quint at 400–600ms. Silkscreen eyebrows use tracking.
- **Copy in Hebrew** (`web-design-guidelines`): Title Case, curly `“”` quotes and "avoid first person" are English rules. Hebrew uses ״ and ׳, and the voice is casual plural "you".
- **RTL:** none of these skills knows about right-to-left. The logical-properties and `<bdi>` rules in `CLAUDE.md` still apply.

## Updating

Copy the folder again from the source repo, update the version column, and check the clashes above again.
