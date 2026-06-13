# Implementation Log

## Batch 0: Baseline Verification (2026-06-13)

Evidence-based inventory of the template as found on branch
`chore/00-verify-existing`. Nothing was modified; this log records what
exists, how it works, what is broken or missing, and the conventions all
later batches must follow. File paths are relative to the repository root.

### What Already Exists

| Area | Implementation | Key files |
| ---- | -------------- | --------- |
| Framework | Next.js 16.1.7 (App Router, Turbopack), React 19.2.7 installed (declared `^19.2.4`), TypeScript 5.9.3 `strict`, ESM | `package.json`, `tsconfig.json`, `next.config.mjs` |
| Lockfile | npm `package-lock.json` (lockfileVersion 3); Node pinned 22.16.0 | `package-lock.json`, `.nvmrc` |
| UI system | Tailwind CSS 4.3.0 (PostCSS plugin), shadcn 4.3.0 vendored components, Base UI 1.4.0, Lucide, Recharts, sonner, vaul | `components/ui/*` (60+ files), `components.json`, `postcss.config.mjs` |
| Routing | `app/[locale]/` pages: home, `login` (signin+signup tabs), `register` (redirect alias), `forgot-password`, `reset-password`, `dashboard`, `chat`, `offline`; non-localized `app/api/chat/` and `app/auth/{confirm,signout}` | `app/` tree |
| Layout split | `app/layout.tsx` is a pass-through; `app/[locale]/layout.tsx` owns `<html lang dir>`, fonts, providers, header/footer | `app/layout.tsx`, `app/[locale]/layout.tsx` |
| i18n | next-intl 4.13.0; locale prefixes `en`/`he` mapped to tags `en-US`/`he-IL`; `localePrefix: "always"`; catalogs key-identical (88 keys each) | `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`, `messages/*.json` |
| i18n gate | Dotted-key-path parity checker, runs in `prebuild` and as `lint:i18n` | `scripts/check-i18n-sync.mjs` |
| Proxy | Root `proxy.ts` exporting `proxy` (Next.js 16 convention); NO `middleware.ts` anywhere; two guard layers enforce this | `proxy.ts`, `scripts/guard-no-middleware.mjs`, `scripts/hook-block-middleware.mjs`, `.claude/settings.json` |
| Supabase clients | `@supabase/ssr` 0.12.0, `@supabase/supabase-js` 2.108.1; browser (publishable key), server request-scoped, admin (secret key, cookie-isolated), proxy session refresh | `lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `cookie-persistence.ts` |
| Auth guards | `requireUser`, `requireInstructor`, `isInstructor`, `getCurrentUserRole`; roles `instructor`/`student` in `user_roles` | `lib/auth/require-user.ts`, `lib/auth/roles.ts` |
| Auth flows | Sign up, login, logout (POST + CSRF-checked GET), remember me, forgot/reset password; all real `<form>` server actions with allowlisted `?error=`/`?notice=` codes | `app/[locale]/login/actions.ts`, `forgot-password/actions.ts`, `reset-password/actions.ts`, `app/auth/confirm/route.ts`, `app/auth/signout/route.ts`, `lib/auth/resolve-auth-message.ts` |
| AI chat | `ai` 6.0.202, `@ai-sdk/react` 3.0.204, `@ai-sdk/gateway` 3.0.128; `streamText` with model string `openai/gpt-4o-mini` routed via Vercel AI Gateway | `app/api/chat/route.ts`, `app/[locale]/chat/chat-client.tsx` |
| Database | Migrations: `0001_auth_schema.sql` (`app_role` enum, `user_roles`, `profiles`, `is_instructor()` off the RPC surface, RLS policies, `set_updated_at` trigger), `0002_harden_rls_auto_enable.sql` (revoke EXECUTE); `config.toml` pins remote project ref only | `supabase/migrations/*`, `supabase/config.toml` |
| Theme | next-themes 0.4.6 provider + mode toggle | `components/theme-provider.tsx`, `components/mode-toggle.tsx` |
| PWA | Manifest route at `/manifest.webmanifest`, 151-line `sw.js` (precache + offline fallback + dormant push), install prompt (`hidden sm:flex` in header), offline page, icon generator | `app/manifest.ts`, `lib/pwa/*`, `public/sw.js`, `components/install-prompt.tsx`, `app/[locale]/offline/page.tsx` |
| A11y | `main#main-content` on all 7 pages, skip link, sr-only labels in 13 files, full `jsx-a11y` recommended ruleset (scoped to skip vendored `components/ui/**`) | `components/skip-link.tsx`, `eslint.config.mjs` |
| E2E tests | Playwright 1.60.0 only; responsive (390/768/1280, RTL, theme, header collapse) + PWA specs; own dev server on port 3100, reads `.env.local` via dotenv | `playwright.config.ts`, `e2e/responsive.spec.ts`, `e2e/pwa.spec.ts`, `e2e/helpers/auth.ts` |
| Formatting | Prettier 3.8.4: no semicolons, double quotes, 80 cols, Tailwind class sorting | `.prettierrc`, `.prettierignore` |
| Scripts | `setup.mjs` (bootstrap, generates `.env.local`), `seed.mjs` (idempotent instructor+student via Admin API), i18n/proxy guards, PWA icon generator | `scripts/` |

### How It Is Implemented

**Proxy composition** (`proxy.ts`): `/api` and `/auth` paths bypass locale
routing and go straight to `updateSession`. All other paths run next-intl's
locale middleware first; a 3xx locale redirect is returned as-is, while a
pass-through response (carrying the internal `[locale]` rewrite) is handed
to `updateSession` so refreshed auth cookies and locale headers travel on
one response. The matcher excludes `_next` assets, `sw.js`,
`manifest.webmanifest`, and images.

**Session refresh and route protection** (`lib/supabase/middleware.ts`):
`updateSession` creates a request-scoped server client, calls
`auth.getUser()` to refresh, and enforces an allowlist
`PROTECTED_SEGMENTS = ["dashboard", "profile"]` after stripping the locale
prefix. Signed-out hits on protected paths bounce to the localized
`/login?notice=signInToContinue`.

**Remember me** (`lib/supabase/cookie-persistence.ts`): the choice lives in
a separate `remember-me` flag cookie (only the opt-out value `0` is
stored). Every auth-cookie write in the server and proxy clients strips
`maxAge`/`expires` when the flag says session-only, defeating
`@supabase/ssr`'s hard-coded 400-day persistence without logging the user
out. Sign-out deletes the flag.

**Role model**: `user_roles` rows are readable by their owner under RLS;
`lib/auth/roles.ts` resolves instructor status through the request-scoped
client. The SQL `is_instructor()` helper exists for policies but EXECUTE is
revoked from `public`/`anon`/`authenticated`, so it is not a REST RPC.
`requireUser`/`requireInstructor` redirect with the active locale
preserved.

**Auth feedback channel**: server actions never redirect with literal
text. They carry stable codes (`?error=invalidCredentials`,
`?notice=resetLinkSent`) that `resolve-auth-message.ts` checks against an
allowlist before translating via the `AuthMessages` catalog namespace, so
forged query params render nothing. Login/signup/forgot/reset are full
no-JS forms (`<form action={serverAction}>`, `type="submit"`, labeled
fields). The signout GET route rejects cross-origin `Origin` headers;
`safeRedirect` allows only same-site absolute paths.

**AI streaming** (`app/api/chat/route.ts`): `streamText` receives the bare
model string `openai/gpt-4o-mini`; the AI SDK routes it through Vercel AI
Gateway automatically because `AI_GATEWAY_API_KEY` is set server-side. The
response is `toUIMessageStreamResponse()` consumed by `useChat` with
`DefaultChatTransport` in the client component. Swapping models is a
one-string change.

**Middleware prohibition, two layers**: a Claude Code PreToolUse hook
(`scripts/hook-block-middleware.mjs`) blocks Write/Edit of any root or
`src/` `middleware.*` at authoring time; `scripts/guard-no-middleware.mjs`
fails `predev`/`prebuild`/`pretypecheck` deterministically if one appears
by any other vector.

**Service worker** (`public/sw.js`): versioned cache `academy-pwa-v1`,
best-effort precache, fetch handler with offline fallback, and inert
`push`/`notificationclick` handlers awaiting a future push batch. The
manifest is locale-independent at the root; locale entry is via
`start_url`.

### Why It Should Be Preserved

PRD section 2 ("Existing Baseline To Preserve") makes each area above a
hard constraint, not a suggestion:

- Build inside the existing App Router structure; no framework migration.
- Reuse current UI primitives and design tokens; add components only when
  needed.
- Every new student/admin page must be locale-aware under `app/[locale]/`
  with all strings in both catalogs.
- Use the existing Supabase client pattern and session flow; never
  introduce a second auth system.
- Extend the existing `/api/chat` streaming pattern for tutoring; do not
  replace it.
- Preserve responsiveness, accessibility/no-JS behavior, PWA
  installability, and theme-token usage on all new screens.
- Reuse environment variable conventions; never commit secrets.

The guard scripts, parity checker, and allowlisted feedback codes are the
enforcement mechanisms that keep these constraints true as the codebase
grows; weakening any of them silently breaks a PRD commitment.

### Defects And Risks

> [!WARNING]
> Items 1-3 are direct contradictions between the planning docs and the
> actual code. Batch 1 must reconcile them before any feature work.

1. **Vitest is NOT set up.** No `vitest`, `@testing-library/react`, or
   `jsdom` in `package.json` or the lockfile, and no
   `vitest.config.*`/`jest.config.*` exists. `TASK_BREAKDOWN.md` (lines
   78, 192) and `TECHNICAL_REQUIREMENTS.md` section 15.1 assume Vitest is
   configured. Playwright 1.60.0 is the only test runner today.
2. **Cloudflare Turnstile is NOT present.** `@marsidev/react-turnstile`
   is absent from dependencies and the lockfile; zero code references to
   Turnstile exist; no `TURNSTILE_*` env vars are set. PRD section 2
   claims Turnstile is wired with `.env.local` configured - that claim is
   false. PRD-AUTH-004 ("preserve Turnstile where currently used") is
   vacuously satisfiable: it is used nowhere. There are also no Supabase
   captcha references in code or `supabase/config.toml` (consistent with
   captcha being disabled in the dashboard; the dashboard state itself is
   not verifiable from the repo).
3. **Base-URL env var mismatch and missing value.** Code reads
   `NEXT_PUBLIC_SITE_URL` (`app/[locale]/login/actions.ts:113`,
   `app/[locale]/forgot-password/actions.ts:28`) while
   `TECHNICAL_REQUIREMENTS.md:219` specifies `NEXT_PUBLIC_APP_URL`.
   Neither is set in `.env.local`, so email confirmation/reset links
   derive their origin from the request `Host` header - acceptable
   locally, a host-header-injection risk for emailed links in production.
4. **`/api/chat` is unauthenticated.** The route performs no user check,
   `/chat` has no `requireUser`, and `PROTECTED_SEGMENTS` covers only
   `dashboard`/`profile`. Anyone can stream gateway-billed completions.
   The AI tutor batch must gate it.
5. **Phantom `/profile` route.** `PROTECTED_SEGMENTS` and the
   `/auth/confirm` `ALLOWED_NEXT` allowlist both include `/profile`, but
   no `app/[locale]/profile/` page exists; an allowlisted
   `next=/profile` lands on a 404.
6. **No `.env.example`.** Task 0.2 asks to compare against it; the file
   does not exist. `scripts/setup.mjs` generates `.env.local` directly.
   New required vars have no documented template.
7. **Version drift (minor).** PRD pins React 19.2.4; the lockfile has
   19.2.7 (declared `^19.2.4`, semver-compatible). Next.js 16.1.7 and
   TypeScript 5.9.3 match the PRD exactly.
8. **E2E coverage gaps.** The Playwright suite covers responsive/RTL/
   theme/PWA plus one authenticated-header check; there is no e2e for the
   auth flows themselves, and `test:e2e` is not part of `prebuild`.
9. **`supabase/config.toml` is ref-only.** No local-stack configuration;
   all schema state lives in the two committed migrations applied to the
   remote project.

Secrets hygiene is clean: `.gitignore` covers `.env*.local`, `.env`, and
`.mcp.json`; `git ls-files` shows no tracked env, secret, or credential
files.

### Recommended Conventions For New Work

- New pages go under `app/[locale]/<section>/page.tsx`. Only `app/api/*`
  and `app/auth/*` stay non-localized. Never create `middleware.ts`;
  compose request logic into `proxy.ts`.
- Add every user-facing string to BOTH `messages/en-US.json` and
  `messages/he-IL.json` in the same commit; `npm run lint:i18n` fails the
  build otherwise. Import `Link`/`redirect`/`useRouter`/`usePathname`
  from `@/i18n/navigation`, never from `next/link`/`next/navigation`.
- Guard server surfaces with `requireUser`/`requireInstructor` at the top
  of the page or action, and add new protected sections to
  `PROTECTED_SEGMENTS` in `lib/supabase/middleware.ts` so the proxy
  bounces signed-out users before render.
- Data access: request-scoped `createClient` from `lib/supabase/server.ts`
  for user-context reads/writes (RLS applies); `createAdminClient` only
  for privileged server-side work, never with request cookies.
- Forms follow the 3-tier no-JS policy: Tier 1/2 are real `<form>` +
  FormData server actions with `?error=`/`?notice=` feedback; extend the
  code allowlist in `lib/auth/resolve-auth-message.ts` (or a sibling
  resolver) plus the matching catalog namespace - never pass literal text
  in query params. Tier 3 (live chat) keeps semantic markup.
- Accessibility: one `<h1>`, `main#main-content`, labeled landmarks,
  sr-only text on icon-only controls; keep `jsx-a11y` green without
  weakening rules globally.
- Responsive: mobile-first Tailwind with logical (RTL-safe) utilities; no
  horizontal overflow at 390/768/1280 px in both locales; extend
  `e2e/responsive.spec.ts` whenever a page or wide component is added.
- AI features extend `app/api/chat/route.ts`'s `streamText` pattern; the
  model stays a gateway string; keys stay server-side in `.env.local`.
- Testing expectation going forward: Vitest + Testing Library + jsdom must
  be added (Batch 1) for unit coverage; Playwright remains the e2e
  runner via `npm run test:e2e` before merging any UI change.

### Environment Variable Checklist

Names only; values were never read or printed.

| Variable | Status | Notes |
| -------- | ------ | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Present | Used by all Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Present | Browser + server clients |
| `SUPABASE_SECRET_KEY` | Present | Admin client, seed script |
| `AI_GATEWAY_API_KEY` | Present | Implicit gateway routing |
| `E2E_INSTRUCTOR_EMAIL` / `E2E_INSTRUCTOR_PASSWORD` | Present | Seed + e2e |
| `E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD` | Present | Seed + e2e |
| `NEXT_PUBLIC_APP_URL` (spec) / `NEXT_PUBLIC_SITE_URL` (code) | Missing | Name mismatch; Host-header fallback active |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Missing | Turnstile not implemented |
| `TURNSTILE_SECRET_KEY` | Missing | Turnstile not implemented |
| `YOUTUBE_API_KEY` | Missing | Optional until playlist import |

There is no `.env.example` to compare against.

### Verification Commands

All four gates below were run on 2026-06-13 with Node 22.16.0 (`.nvmrc`)
and passed.

```bash
npm run guard:proxy   # no forbidden middleware.* anywhere - PASS
npm run lint:i18n     # en-US/he-IL catalogs key-identical - PASS
npm run typecheck     # tsc --noEmit, strict - PASS
npm run lint          # ESLint incl. jsx-a11y recommended - PASS
npm run build         # prebuild gates + Next.js production build
npm run test:e2e      # Playwright suite (dev server on port 3100)
```

## Batch 1: Test Harness (2026-06-13)

Adds the unit/integration test harness that Batch 0 found missing
(Defects and Risks item 1). No product features; no changes under
`app/`, `lib/`, `messages/`, or `proxy.ts`.

### What Was Added

Dev dependencies (installed with Node 22.16.0, exact versions from the
lockfile):

- `vitest` 4.1.8 (runner; bundles its own Vite, 8.0.16 transitively)
- `@vitejs/plugin-react` 6.0.2 (JSX transform for component tests)
- `jsdom` 29.1.1 (DOM environment)
- `@testing-library/react` 16.3.2
- `@testing-library/jest-dom` 6.9.1 (matchers via the `/vitest` entry)
- `@testing-library/user-event` 14.6.1

Configuration and scripts:

- `vitest.config.ts` - jsdom environment, `globals: true`, setup file
  `tests/setup.ts`, include `tests/**/*.test.{ts,tsx}`, exclude
  `e2e/**` plus Vitest defaults (`node_modules`), and an `@` alias to
  the project root mirroring the tsconfig `@/*` path mapping.
- `tests/setup.ts` - imports `@testing-library/jest-dom/vitest` so DOM
  matchers register on Vitest's `expect`.
- npm scripts: `test` (`vitest run`) and `test:watch` (`vitest`).
  `test:e2e` is untouched and still runs Playwright.

Test scaffolding:

- `tests/factories/sequence.ts` - shared deterministic counter,
  `resetFactorySequence()`, fixed `FACTORY_TIMESTAMP`, per-entity
  uuid codes, and `deterministicUuid()`.
- `tests/factories/course.ts`, `tests/factories/lesson.ts`,
  `tests/factories/user.ts` - `buildCourse` / `buildLesson` /
  `buildUser` with `overrides` support.
- `tests/unit/factories.test.ts` - smoke test proving the harness
  runs: distinct ids per build, determinism across resets, overrides
  winning, shared sequence, example.com emails.
- `tests/integration/` - placeholder (`.gitkeep`) until a later batch
  adds integration suites.

### Decisions

- **Playwright specs stay in the root `e2e/` directory.** The prompt's
  `tests/e2e` layout was not adopted: `playwright.config.ts` already
  points `testDir` at `./e2e`, the suite passes there, and project
  docs (`CLAUDE.md`, `docs/RESPONSIVE.md`) reference
  `e2e/responsive.spec.ts`. Moving specs would churn config and docs
  for zero behavior gain. Vitest excludes `e2e/**` so the two runners
  never pick up each other's files.
- **Factories are deterministic by construction.** No `Math.random`,
  no `Date.now`. Identity comes from a module-level counter
  (1-based, shared across entity types so ids never collide) plus a
  fixed ISO timestamp. `resetFactorySequence()` in `beforeEach` gives
  per-test isolation and reproducible output.
- **Factory types are local until Batch 3.** Domain/database types do
  not exist yet, so each factory file exports a minimal
  `*FactoryRecord` interface shaped after the planned Supabase schema
  (`TECHNICAL_REQUIREMENTS.md` section 6.3: `courses`, `lessons`,
  `profiles`). When Batch 3 lands generated row types, these
  interfaces must be replaced by (or asserted against) them.
- **No tsconfig changes.** The root `include` (`**/*.ts`) already
  covers `tests/**` and `vitest.config.ts`, so `npm run typecheck`
  type-checks the harness as-is. Test files import Vitest APIs
  explicitly (`import { describe, it, expect } from "vitest"`)
  instead of relying on injected globals, which avoids adding a
  `"types"` array (that would disable automatic `@types/*` inclusion
  for the app tree). `globals: true` stays in the Vitest config so
  Testing Library's automatic DOM cleanup works.
- **No real secrets or external services.** Factory emails use the
  reserved `example.com` domain; YouTube ids are synthetic
  11-character strings.

### Known Constraints

- No unit tests existed before this batch; Playwright 1.60 was the
  only runner. Coverage for the section 15.1 helpers starts at zero
  and grows as those helpers are implemented in later batches.
- Vitest must keep excluding `e2e/**`; Playwright specs use
  `@playwright/test` fixtures and fail under Vitest.
- `npm test` is not wired into `prebuild` (matching the existing
  `test:e2e` convention); batches must run it explicitly before merge.

### Open Risks

- Factory shapes are hand-written against the planning doc; if the
  Batch 3 schema diverges, the factories will compile but mislead.
  Mitigation: replace local interfaces with generated row types in
  Batch 3.
- jsdom does not implement `matchMedia`, `IntersectionObserver`, or
  `ResizeObserver`; component tests touching them will need stubs in
  `tests/setup.ts` when first required.
- Vitest 4 manages its own Vite (8.x). A future Next.js/React major
  bump may require revisiting `@vitejs/plugin-react` compatibility.

### Verification Results

All commands run on 2026-06-13 with Node 22.16.0:

```bash
npm run test                # 1 file, 5 tests passed (vitest 4.1.8)
npx playwright test --list  # 18 tests in 2 files, e2e/ only - PASS
npm run lint                # ESLint clean - PASS
npm run typecheck           # guard + tsc --noEmit clean - PASS
npx prettier --check vitest.config.ts "tests/**/*.ts"  # clean
```
