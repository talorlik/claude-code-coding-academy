# Project Conventions

## Localization (English + Hebrew)

This project fully supports English and Hebrew and that support must be carried
through all future work. Before adding any user-facing UI, read `docs/I18N.md`.

Non-negotiables:

- New pages live under `app/[locale]/` (not `app/` root). `app/api/*` and
  `app/auth/*` are the only non-localized trees.
- No hardcoded user-facing strings. Use `getTranslations`/`useTranslations` and
  add every key to BOTH `messages/en-US.json` and `messages/he-IL.json`.
- Catalogs must stay key-identical; `npm run lint:i18n` (run in `prebuild`)
  fails the build otherwise.
- Use the `@/i18n/navigation` helpers instead of `next/link` /
  `next/navigation` inside the app tree.
- Hebrew is RTL: prefer Tailwind logical utilities so layout mirrors correctly.

## Accessibility and Progressive Enhancement

Accessibility and no-JavaScript resilience are non-negotiable and must be carried
through all future work. Before adding any user-facing UI, read
`docs/ACCESSIBILITY.md`.

Non-negotiables:

- Every page exposes a `<main id="main-content">`; use semantic landmarks
  (`<header>`, `<nav aria-label>`, `<footer>`) and exactly one `<h1>`.
- Forms follow the 3-tier no-JS policy: real `<form>` + `type="submit"` +
  `<label for>` fields. Tier 1 (auth) and Tier 2 (simple data forms) are full
  no-JS via `FormData` server actions with query-param feedback; Tier 3
  (live chat, realtime APIs) is semantic markup only.
- Feedback flows through the `?error=`/`?notice=` query-param channel resolved
  to a localized banner, never JS-only inline state.
- Icon-only controls carry `sr-only` text; decorative images use `aria-hidden`/
  `alt=""`; focus stays visible; motion respects `prefers-reduced-motion`.
- `npm run lint` enforces `eslint-plugin-jsx-a11y`; keep it green. Resolve a
  false positive with a scoped, commented `eslint-disable-next-line`, never by
  weakening the rule globally.

## Responsive and Mobile

The site must be fully responsive and mobile-friendly, carried through all
future work. Before adding or changing any user-facing UI, read
`docs/RESPONSIVE.md`.

Non-negotiables:

- No horizontal overflow at 390 / 768 / 1280 px, in English (LTR) and Hebrew
  (RTL). The rule is `scrollWidth - clientWidth <= 1`.
- Mobile-first Tailwind: base styles for narrow screens, `sm:`/`md:`/`lg:`
  overrides upward. The header nav collapses into the `Sheet` drawer below `md`.
- Let flex children shrink (`min-w-0`), keep fixed controls `shrink-0`, wrap
  button rows (`flex-wrap`), break long strings, and use logical RTL utilities.
- `npm run test:e2e` (Playwright) enforces the no-overflow + RTL + theme +
  header-collapse contract. It is NOT in `prebuild`; run it before merging any
  UI change, and extend `e2e/responsive.spec.ts` when you add pages or wide
  components.

## Git

Per-branch worktree off clean `main` -> gates pass -> squash-merge into local
`main` -> remove worktree. NEVER push `main` (a push triggers the production
Vercel deploy); feature branches may be pushed. See the global
`~/.claude/CLAUDE.md` for the full worktree model.

Dependency reconcile after squash-merge: immediately after squash-merging a
worktree into local `main`, check whether the squash changed `package.json` or
`package-lock.json` (e.g. `git diff --name-only HEAD~1 HEAD -- package.json
package-lock.json`). If either changed, run `npm install` in the primary `main`
checkout before running any gate. The worktree installs its deps in isolation,
so a new or upgraded package exists only in the worktree's `node_modules` until
this step; skipping it leaves `main` with a manifest that references packages
that are not installed, and the next `typecheck`/`build` fails with
"Cannot find module ...". `node_modules` is gitignored, so this never affects a
commit. Also clear a stale `.next/` (`rm -rf .next`) before re-running gates if
routes moved, since cached route types can reference deleted paths.
