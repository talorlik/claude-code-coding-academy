# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (Turbopack, port 3000)
npm run build        # type-check + i18n lint + Next.js build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint (jsx-a11y enforced)
npm run lint:i18n    # verify en-US.json and he-IL.json are key-identical
npm run format       # Prettier on all .ts/.tsx files
npm run test:e2e     # Playwright E2E suite (responsive, RTL, theme, auth)
npm run seed         # create instructor + student users via Supabase Admin API
npm run setup        # first-time project bootstrap (generates .env.local)
```

E2E tests start their own dev server on port 3100 (configurable via `E2E_PORT`).
They are NOT part of `prebuild`; run them before merging any UI change.

## Architecture

**Stack:** Next.js App Router (Turbopack), React 18, TypeScript strict, Tailwind CSS,
shadcn/ui, Supabase (auth + DB), Vercel AI Gateway.

**Routing split:**

- `app/[locale]/` - all user-facing pages; locale prefix is mandatory
- `app/api/` - API routes (no locale)
- `app/auth/` - Supabase auth callbacks (`/confirm`, `/signout`) (no locale)

`app/layout.tsx` is a pass-through shell. `app/[locale]/layout.tsx` owns
`<html lang dir>` and `NextIntlClientProvider`.

**No `middleware.ts`.** A guard script (`scripts/guard-no-middleware.mjs`) runs in
`predev`/`prebuild`/`pretypecheck` and hard-fails if `middleware.ts` exists.
Locale routing and Supabase session refresh are composed in `lib/proxy.ts`
(a Next.js route handler) instead. Do not create `middleware.ts`.

**Localization** is via next-intl. Message catalogs live in `messages/en-US.json`
and `messages/he-IL.json`. They must stay key-identical; `npm run lint:i18n`
enforces this in `prebuild`. Use `@/i18n/navigation` (re-exports from next-intl)
instead of `next/link`/`next/navigation` inside the app tree.

**Auth** uses Supabase SSR (`@supabase/ssr`). Roles are `instructor` and `student`.
Server-side guards are `requireUser` and `requireInstructor` in `lib/auth/`.
`is_instructor()` requires service-role access; RLS cannot call it directly.
Supabase captcha is disabled.

**AI chat** routes through Vercel AI Gateway (`@ai-sdk/gateway`) via
`app/api/chat/`. The gateway key is `AI_GATEWAY_API_KEY` in `.env.local`.

**PWA:** installable via `app/manifest.ts` + `public/sw.js` (single service worker
with dormant push stub). Install button is hidden on desktop (`sm:flex`).
Offline fallback at `app/[locale]/offline/`.

**Component library:** shadcn/ui (`components.json`). Add components with
`npx shadcn@latest add <name>`. Custom components live in `components/`.

## Localization (English + Hebrew)

Before adding any user-facing UI, read `docs/I18N.md`.

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

Before adding any user-facing UI, read `docs/ACCESSIBILITY.md`.

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

Before adding or changing any user-facing UI, read `docs/RESPONSIVE.md`.

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
