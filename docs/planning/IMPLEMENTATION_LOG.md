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


## Batch 2: Database Schema (2026-06-13)

Implements the full course-platform schema on the remote Supabase project via
a single atomic migration `0003_course_platform_core.sql`. RLS policies,
views, seed data, and generated TypeScript types are included.

### Reconciliation Decisions

The spec in `TECHNICAL_REQUIREMENTS.md` sections 6 and 7 was written against
a clean-slate schema. The existing migrations (`0001`, `0002`) predated it and
diverged in three ways. The following decisions resolve the conflicts without
altering the existing tables or breaking auth.

**Profiles - extend, not replace**

The existing `public.profiles` table uses `user_id uuid primary key` (not
`id`). The spec table calls the PK column `id`. Because `0001` is committed
and already applied, the table is NOT recreated. Instead `0003` extends it
with three new columns via `ALTER TABLE`:

- `email text` (nullable; denormalized for admin display)
- `avatar_url text` (nullable)
- `locale text not null default 'en' check (locale in ('en','he'))`

The spec column `role user_role` is NOT added. Roles live in the separate
`public.user_roles` table with the `app_role` enum (`instructor`, `student`).
Adding a redundant `role` column would create a second source of truth.

All foreign keys that the spec writes as `references profiles(id)` are
written here as `references profiles(user_id)`, because that is the actual
primary key.

**instructor == admin; private.is_admin() helper**

The existing project uses the role value `'instructor'` for the privileged
account. The spec's `'admin'` role is mapped to `'instructor'` throughout.
The spec's `public.is_admin()` function (which queries a `role` column on
`profiles`) cannot be used as written. Instead a new `private.is_admin()`
function is created:

- Schema `private` is created if absent; PostgREST does not expose it as
  REST RPCs.
- The function is `security definer`, `stable`, `set search_path = public`,
  and checks `user_roles.role = 'instructor'` for `auth.uid()`.
- `EXECUTE` is revoked from `public`/`anon`; `authenticated` retains it
  because RLS policies (which run as the invoker) call it.
- Policies use `(select private.is_admin())` (wrapped in a subselect) for
  initplan caching - one lookup per statement instead of one per row.

This approach keeps the admin helper off the REST surface while making it
callable from within RLS, and it avoids conflicting with the existing
`public.is_instructor()` (which is service_role-only).

**Naming convention deviation**

The prompt's `TASK_BREAKDOWN.md` specifies timestamp-prefixed migration
filenames (e.g. `20240613000000_...`). The existing convention (established
by `0001` and `0002`) uses sequential four-digit prefixes. The sequential
convention wins because changing it would break the applied-migration order
tracking in the Supabase dashboard. This deviation is noted here.

**Enums created**

The following enums are created (they do not conflict with existing types):

- `course_level` ('beginner', 'intermediate', 'advanced')
- `course_status` ('draft', 'published', 'archived')
- `tutor_message_role` ('user', 'assistant', 'system')
- `payment_status` ('pending', 'paid', 'failed', 'refunded')
- `reminder_status` ('queued', 'sent', 'failed', 'skipped')

The spec's `user_role` enum ('student', 'admin') is NOT created because
`public.app_role` ('instructor', 'student') already exists and serves the
same purpose.

### Tables Created

All 12 new tables plus 3 `ALTER TABLE` columns on profiles:

- `courses` - course catalog with status, level, language, slug
- `lessons` - YouTube-backed video lessons per course
- `enrollments` - student enrollment per course with completion tracking
- `lesson_progress` - per-lesson watch record with course/lesson trigger
- `ai_tutor_conversations` - AI tutor session per user/course/lesson
- `ai_tutor_messages` - messages within a conversation
- `certificates` - completion certificate per user/course
- `class_groups` - named student groups with slug
- `class_group_members` - group membership
- `reminder_events` - queued/sent reminder queue
- `course_prices` - simulation-only pricing per course
- `payments` - simulation-only payment records

### RLS Strategy

Every new table has RLS enabled. Policies follow the matrix in section 7.2
with the instructor-as-admin mapping:

- Courses and lessons: anon and authenticated may SELECT rows where
  `status = 'published'` (lessons: where the parent course is published).
  This powers the public SEO catalog without requiring a login. Admin has
  full CRUD.
- Student-private tables (enrollments, lesson_progress, certificates,
  payments, ai_tutor_conversations, ai_tutor_messages,
  class_group_members): students see and write only their own rows.
- Admin-only tables (reminder_events): no student access.
- course_prices: anon and authenticated may read active prices for published
  courses; admin has full CRUD.
- profiles: the existing own-row policies from 0001 are preserved; a new
  admin-read-all SELECT policy is added so admin dashboards can list
  students.

All policies that check admin status use `(select private.is_admin())` for
initplan caching, following the Supabase best practice of avoiding per-row
re-evaluation of stable security definer functions.

### Anon Read Scope

Anonymous (not logged in) users can SELECT published courses, their lessons,
and active course prices. This enables the public course catalog and SEO
pages. Anon cannot enroll, track progress, or access any student-private
data. Enrollment gates are enforced by the INSERT policy (authenticated only)
and the application layer.

### Views Created

Five security-invoker views are created. They inherit RLS from underlying
tables, so they never leak rows the caller could not read directly:

- `course_lesson_counts` - count + total duration per course
- `student_course_progress` - watched/total/percent per user per course
- `admin_stuck_students` - enrollment rows with no progress in 7+ days
- `group_progress_summary` - aggregate completion per group per course
- `search_documents` - published course + lesson text for full-text search

`admin_common_tutor_questions` is SKIPPED. A normalized question aggregate
requires either a separate NLP step or a GROUP BY on free-text content, which
is not cleanly derivable from the current schema. Forcing it would produce
misleading output. This is a follow-up for a later batch.

### RLS Verification

Results observed via `mcp__supabase__execute_sql` with SET LOCAL role:

```
anon   -> courses SELECT           : 2  (both seeded courses are published)
anon   -> enrollments SELECT       : 0  (no anon policy - correct)
auth (random uuid) -> enrollments  : 0  (own-row isolation - correct)
anon   -> lessons SELECT           : 6  (3 per course * 2 published courses)
anon   -> course_prices SELECT     : 1  (JS course active price)
auth (random uuid) -> class_groups : 0  (not a member - correct)
```

Full repeatable checks saved to `supabase/tests/RLS_CHECKS.sql`.

### Files Written

- `supabase/migrations/0003_course_platform_core.sql` - schema + RLS +
  views
- `supabase/seed.sql` - idempotent seed: 2 courses, 3 lessons each, 1
  class group, 1 course_prices row
- `supabase/tests/RLS_CHECKS.sql` - repeatable RLS isolation checks
- `lib/supabase/database.types.ts` - generated TypeScript types
- `tests/unit/database-types.test.ts` - type-level assertions

### Follow-Ups For Later Batches

- `admin_common_tutor_questions` view: implement once tutor messages
  accumulate; requires a normalization strategy for free-text questions.
- `profiles.role` absence: the application must resolve admin status via
  `user_roles.role = 'instructor'`; any admin-facing UI that wants to
  display a role label should use that join, not a profiles column.
- Anon read scope: the catalog is intentionally public; if a future batch
  adds gated previews or paywall-before-view, the SELECT policy on courses
  must add a price/enrollment check.
- `enrollments.last_accessed_lesson_id` consistency trigger: skipped as
  noted in prompt (only trivial to do for lesson_progress course/lesson
  check, which IS implemented). The enrollment FK is enforced by DB
  constraints at insert time; application logic in Batch 6 must set it
  correctly.
- `profiles.email` population: the column exists but is not auto-populated
  on signup. Batch 3 or the auth trigger should backfill it from
  `auth.users.email`.

## Batch 3: Domain Layer (2026-06-13)

Implements the full shared TypeScript domain layer: DTO types with mappers,
Zod validation schemas, server-only course query functions, and pure progress
calculation utilities. Tasks 3.1, 3.2, 3.4, 3.5 from `TASK_BREAKDOWN.md`.

### Zod Adoption

Zod v4.4.3 installed as a production dependency (`npm install zod`). The
`lib/auth/validation.ts` hand-rolled regex validator is unchanged (the prompt
prohibits rewriting it). All new input validation uses Zod schemas. Section
8.2 of `TECHNICAL_REQUIREMENTS.md` explicitly permits adding Zod when no
convention exists.

Zod v4 API notes: `z.string().url()` and `z.string().uuid()` work as in v3.
`error.flatten().fieldErrors` returns `Record<string, string[]>` (arrays, not
strings). `lib/validation/parse.ts` maps the first message per field to match
`ActionResult`'s `Record<string, string>` shape.

### DTO And Mapper Convention

All domain DTOs use camelCase field names mapped from snake_case DB columns.
Mapper functions (`toCourseSummary`, `toLessonSummary`, `toCourseDetail`,
etc.) accept raw Supabase row types from `database.types.ts` and return typed
DTOs. The `created_by` field on `courses` is excluded from all public DTOs
because instructor identity is not exposed in catalog reads.

Enum types are re-exported from the generated `Database` type rather than
redeclared as string literal unions:

```ts
export type CourseLevel = Database["public"]["Enums"]["course_level"]
```

This ensures the DTO types and the DB schema cannot diverge silently.

### Progress Calculation Decisions

**Zero lessons:** A course with no lessons returns `{ percent: 0, isComplete:
false, nextLessonId: null }`. Treating an empty course as complete would
incorrectly award certificates before any content exists.

**Integer percent:** `percent = Math.round(completed / total * 100)`, clamped
to `[0, 100]`. Integer rounding avoids floating-point display noise (e.g.
"66.666...%"). This matches the view's `progress_percent` column convention.

**`nextLessonId`:** First lesson by ascending `sortOrder` not in
`completedLessonIds`. Null when all lessons are complete, the course is empty,
or no lesson stubs are supplied.

**`lastWatchedAt`:** Caller-supplied parameter (from `student_course_progress`
view or a `MAX(watched_at)` aggregate). The pure function has no DB access.

### Validation Coverage

All schemas listed in section 8.2 are implemented:

- `lib/validation/course.ts` - `createCourseSchema`, `updateCourseSchema`,
  `enrollmentSchema`, `markWatchedSchema`
- `lib/validation/lesson.ts` - `createLessonSchema`, `updateLessonSchema`,
  `reorderLessonsSchema`
- `lib/validation/tutor.ts` - `tutorMessageSchema`, `createConversationSchema`
- `lib/validation/group.ts` - `createGroupSchema`, `groupMembershipSchema`
- `lib/validation/reminder.ts` - `reminderActionSchema`
- `lib/validation/payment.ts` - `checkoutSchema`, `confirmPaymentSchema`
- `lib/validation/search.ts` - `searchQuerySchema`
- `lib/validation/certificate.ts` - `certificateSchema`
- `lib/validation/parse.ts` - `parseWithSchema` helper bridging Zod ->
  `ActionResult`

Each schema exports an inferred `z.infer<>` type alongside the schema object.

### Server-Only Queries Note

`lib/courses/queries.ts` uses `createClient()` from `lib/supabase/server.ts`
(the request-scoped RLS client). The `server-only` package is not installed;
the module is implicitly server-only because `createClient()` calls
`cookies()` from `next/headers`, which throws in the client bundle. All
queries filter `status = 'published'` explicitly as a defense-in-depth measure
on top of RLS. The `course_lesson_counts` view is used for efficient
lesson-count joins without loading all lesson rows.

### Factory Re-Pointing Outcome

The factories in `tests/factories/course.ts` and `tests/factories/lesson.ts`
declare local `CourseFactoryRecord` and `LessonFactoryRecord` interfaces that
predate the generated DB types. These are **left unchanged**. The local
interfaces match the generated `courses.Row` and `lessons.Row` shapes exactly,
so `tests/unit/factories.test.ts` continues to pass without modification.
Replacing them with `Database[...][...]["Row"]` aliases is a cosmetic change
that could be done as tech debt but carries churn risk for a working test.

### Tests Added

- `tests/unit/progress.test.ts` - 34 tests covering zero/partial/full
  completion, `nextLessonId` selection, percent rounding, and `lastWatchedAt`
  forwarding
- `tests/unit/validation.test.ts` - 47 tests covering `parseWithSchema`
  helper and all schemas (course, lesson, tutor, payment, search, group,
  reminder, certificate) with valid + invalid cases and `fieldErrors` shape
  assertions
- `tests/integration/courses-queries.test.ts` - 11 tests mocking the
  Supabase client to assert `getPublishedCourses` filters by `status =
  'published'`, `getCourseDetailBySlug` orders lessons by `sort_order ASC`,
  and both return null/empty on errors or missing rows

Total test count after batch: 107 tests in 5 files (all pass).

### Deferred To Later Batches

- `lib/auth/guards.ts` - section 8.1 aspirational module; `requireUser` and
  `requireInstructor` in `lib/auth/require-user.ts` are the live guards; no
  alias file is needed until a caller requires it.
- Server actions (`lib/courses/actions.ts`, `lib/progress/actions.ts`, etc.) -
  batch 04+ implements mutation actions on top of the schemas defined here.
- YouTube URL parser (`lib/youtube/parser.ts`) - batch 04 per the prompt map.
- `lib/progress/queries.ts` - DB-reading progress queries; the pure
  `calculateCourseProgress` function is ready for batch 06 to wire against
  real `lesson_progress` rows.

### Gate Results

All commands run on 2026-06-13 with Node 22.16.0:

```
npm run lint       - PASS (0 errors, 0 warnings)
npm run typecheck  - PASS (tsc --noEmit clean)
npm run test       - PASS (107 tests in 5 files, 1.05s)
npm run build      - PASS (23 static pages, Turbopack)
```

## Batch 4: YouTube Parser And Metadata (2026-06-13)

### Files Created

- `lib/youtube/types.ts` - shared types: `ParsedYouTubeUrl`, `VideoMetadata`,
  `LessonDraft` (all importable from client and server)
- `lib/youtube/parser.ts` - pure parser, no network, no env
- `lib/youtube/metadata.ts` - server-only metadata helpers
- `tests/unit/youtube-parser.test.ts` - exhaustive parser + iso8601 tests
- `tests/unit/youtube-metadata.test.ts` - fetch-mocked metadata tests

### Parser URL Shapes Supported

`extractVideoId` accepts all of the following host families:
`www.youtube.com`, `youtube.com`, `m.youtube.com`, `music.youtube.com`,
`youtu.be` - with `http://` or `https://` only (no protocol-relative).

Path patterns handled:

- `/watch?v=ID` - standard watch
- `youtu.be/ID` - short link
- `/embed/ID` - embed player
- `/shorts/ID` - YouTube Shorts
- `/v/ID` - legacy player

Video id shape: exactly 11 chars from `[A-Za-z0-9_-]` validated by
`/^[A-Za-z0-9_-]{11}$/`.

`extractPlaylistId` captures the `list=` query param from any YouTube URL.
Playlist id shape: `/^[A-Za-z0-9_-]{13,}$/` (minimum 13 chars, no upper
bound). This covers `PL`, `UU`, `LL`, `FL`, `RD`, `OL` prefixed IDs and
accommodates future YouTube ID length increases.

### parseYouTubeUrl Precedence

When a URL carries both a video id and a playlist id (`watch?v=ID&list=PL`),
`kind` is `"video"` and both `videoId` and `playlistId` are populated. A URL
with only a playlist id (`/playlist?list=PL`) returns `kind: "playlist"`.

### oEmbed: No Duration

YouTube's oEmbed endpoint does not return duration. `fetchVideoOEmbed` leaves
`durationSeconds` undefined on the returned `VideoMetadata`. Callers that need
duration must either call `videos.list?part=contentDetails` (requires
`YOUTUBE_API_KEY`) or accept the field as missing.

### Playlist Import: Missing Key Behavior

`fetchPlaylistItems` checks `process.env["YOUTUBE_API_KEY"]` at call time.
When absent or empty, it returns immediately with:

```
Playlist import requires a server-side YOUTUBE_API_KEY. Add the key to your
.env.local file and restart the server.
```

This exact string is exported as `MISSING_API_KEY_MESSAGE` so test assertions
and any future UI copy reference the same source of truth.

### Server-Only Boundary

`lib/youtube/metadata.ts` accesses `process.env["YOUTUBE_API_KEY"]` (no
`NEXT_PUBLIC_` prefix). The file is documented as server-only in its module
docblock. The `server-only` npm package is not installed; the boundary is
enforced by convention and code review rather than a compile-time hard stop.

### Result Type

`ActionResult<T>` from `lib/types/action-result.ts` is reused directly. Both
`fetchVideoOEmbed` and `fetchPlaylistItems` return
`Promise<ActionResult<T>>`. This composes with existing server actions that
already use `ok()`/`fail()`.

### Pagination and Duration Cap

- `playlistItems.list` paginates via `pageToken` up to 200 items (4 pages of
  50). Controlled by `MAX_PLAYLIST_ITEMS = 200`.
- Duration enrichment calls `videos.list?part=contentDetails` in batches of
  50 ids. If any batch call fails (non-200 or network error), enrichment is
  abandoned and remaining drafts return without `durationSeconds` - the full
  import still succeeds.

### Abort/Timeout Error Detection

`DOMException` with `name === "AbortError"` does not pass `instanceof Error`
in jsdom test environments. Both catch blocks check
`(err instanceof Error || err instanceof DOMException) && err.name === "AbortError"`
to remain correct in all environments.

### Tests Added

- `tests/unit/youtube-parser.test.ts` - 69 tests: valid watch/youtu.be/
  embed/shorts/v/ URLs, m./music. hosts, extra query params, playlist URLs,
  rejections (vimeo, garbage, wrong-length ids, bare ids, protocol-relative,
  javascript: scheme), `parseYouTubeUrl` precedence, `buildWatchUrl`,
  `buildThumbnailUrl`, `iso8601DurationToSeconds` (7 duration cases including
  `P0D`, bare `PT`, empty string, garbage)
- `tests/unit/youtube-metadata.test.ts` - 18 tests: `fetchVideoOEmbed` happy
  path (bare id and full URL), 404/401/500/network/timeout/bad-JSON fail
  cases; `fetchPlaylistItems` missing-key, full happy path with duration
  enrichment, degraded without duration, 403/404/network fail cases, empty
  playlist

Total test count after batch: 187 tests in 7 files (all pass).

### Deferred To Later Batches

- Admin import UI and save-to-Supabase server action (batch 07).
- `youtubeUrlSchema` Zod refine in `lib/validation/lesson.ts` using the
  parser is deferred; the existing `z.string().url()` + separate parser call
  is sufficient for batch 07.
- Pagination beyond page 1 is implemented but untested for multi-page
  playlists (no integration test fixture set up).

### Gate Results

All commands run on 2026-06-13 with Node 22.16.0:

```
npm run lint       - PASS (0 errors, 0 warnings)
npm run typecheck  - PASS (tsc --noEmit clean)
npm run test       - PASS (187 tests in 7 files, 1.50s)
npm run build      - PASS (23 static pages, Turbopack)
```

## Batch 5: Home Page And Catalog (2026-06-13)

### Component Naming Choice

All new components use kebab-case filenames to match the existing
`components/ui/` convention (`card.tsx`, `button.tsx`, etc.):

- `components/courses/course-card.tsx`
- `components/courses/course-catalog.tsx`
- `components/courses/course-catalog-skeleton.tsx`
- `components/courses/enrollment-button.tsx`

### Suspense / Loading Approach

The home page extracts an async `CatalogSection` server component that
fetches `getPublishedCourses()` and the user's enrolled course IDs in
parallel. The outer `<Suspense fallback={<CourseCatalogSkeleton />}>` shows
three skeleton cards while the async fetch resolves. This keeps the hero
section instantly visible on all connections.

### Empty And Error Handling

`CatalogSection` wraps `getPublishedCourses()` in a try/catch. A null
return triggers a localized error Empty state (`Courses.error.*`). A zero-
length array triggers a localized empty Empty state (`Courses.empty.*`).
Both use the existing `Empty`/`EmptyHeader`/`EmptyTitle`/`EmptyDescription`
component system from `components/ui/empty.tsx`.

### Enroll Action Auth And Idempotency

`lib/courses/actions.ts` (new file, `"use server"` module):

- Auth: calls `createClient().auth.getUser()`. Returns `fail("signInRequired")`
  rather than server-redirecting, so the client `EnrollmentButton` can route
  to `/login` without a Next.js redirect response.
- Idempotency: uses `supabase.from("enrollments").upsert(..., { onConflict:
  "user_id,course_id", ignoreDuplicates: true })`. The unique constraint
  makes a duplicate a silent no-op; the action always returns `ok`.
- RLS: the publishable-key client passes the signed-in user JWT so the DB
  enforces `user_id = auth.uid()` on insert.
- After success `revalidatePath("/", "layout")` invalidates the entire
  layout so enrollment state reflects on next navigation.

### /courses/[slug] Forward Reference To Batch 06

`CourseCard` and `EnrollmentButton` link to `/courses/<slug>` which will 404
until batch 06 adds the course detail route. This is intentional and
expected; the link target is correct.

### SEO Metadata Approach And Base URL Fallback

`generateMetadata` in `app/[locale]/page.tsx` uses `getTranslations` for
title, description, and openGraph. `alternates.canonical` is only added when
`NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL` is defined, so the page
never crashes in environments where neither variable is set.

### New I18n Namespaces

Added namespace `Courses` with keys:

- `level.{beginner,intermediate,advanced}` - localized level labels
- `lessonCount` - ICU plural (`{count, plural, one {...} other {...}}`)
- `enroll`, `continue`, `viewCourse`, `enrolled`
- `empty.{title,body}`, `error.{title,body}`, `loading`
- `enrollError.{signInRequired,courseNotFound,generic}`

Extended `Home` namespace with:

- `hero.{headline,subhead,ctaBrowse,ctaStart}`
- `benefits.heading`, `benefits.{structured,video,practical,community}.{title,body}`
- `catalog.{heading,subhead}`

Extended `Metadata.home` with updated title and description.

Hebrew translations are real RTL Hebrew (not English placeholders).

### Tests Added

- `tests/unit/course-card.test.tsx` (13 cases): renders title, description,
  level badge (all three levels), lesson count (plural + singular), cover
  image, anonymous/enrolled/unenrolled CTA states, and catalog empty state.
  Wraps components in `NextIntlClientProvider` with en-US.json messages.

- `tests/integration/enroll-action.test.ts` (6 cases): asserts
  `enrollInCourse` returns `fail("signInRequired")` when unauthenticated,
  validates bad UUID input, returns `fail("courseNotFound")` when course is
  missing, returns `ok(EnrollResult)` with `targetLessonId` on success, is
  idempotent (upsert no-op still returns ok), and returns fail on DB error.
  All Supabase calls mocked via vi.mock.

- `e2e/catalog.spec.ts` (6 cases): smoke tests that home page renders hero
  h1 and catalog section in EN and HE, no horizontal overflow at 390/768/
  1280px in EN, and catalog loads without crashing (shows cards or empty
  state). Does not require authentication.

### Gate Results


All gates run on 2026-06-13 with Node 22.16.0:

```
npm run lint       - PASS (0 errors, 0 warnings)
npm run lint:i18n  - PASS (119 keys in sync)
npm run typecheck  - PASS (tsc --noEmit clean)
npm run test       - PASS (207 tests in 9 files, 2.05s)
npm run build      - PASS (dynamic app pages, Turbopack)
npm run test:e2e   - PASS (25 tests, 17.9s; 6 new catalog specs all pass)
```

### Deferred To Later Batches

- `/courses/[slug]` course detail route (batch 06) - enrollment CTA links
  here correctly, will 404 until batch 06.
- Enrollment E2E full flow (batch 12) - enrollment button UI tested via unit
  tests; the full sign-in + enroll + route flow deferred to batch 12 where
  auth seeding is stable.
- Toast/error notification on enroll failure (batch 12) - the button returns
  to idle silently on server error; a toast layer will surface this in the
  final UX.

## Batch 6: Course Page And Progress (2026-06-13)

### Route Decision

Route: `app/[locale]/courses/[courseSlug]/page.tsx` with `?lesson=<slug>`
search param for lesson selection.

Why search param instead of nested segment: The batch-05 catalog links to
`/courses/<slug>` (one URL per course). A nested segment
`/courses/[courseSlug]/[lessonSlug]` would require a redirect from
`/courses/[courseSlug]` to the first lesson, adding latency and complexity.
The search-param approach keeps a single canonical course URL while letting
lesson selection change without a hard navigation. The URL updates via
`router.push` from `MarkWatchedButton` after each lesson is watched.

### Per-Lesson Preview Gating

The page is public (no `requireUser` at page top). Gating is per-lesson:

- Preview lessons (`is_preview = true`) are watchable by anyone.
- Non-preview lessons: the YouTube iframe renders only for authed + enrolled
  users. Anon or unenrolled users see a localized locked state with an
  `EnrollmentButton` CTA.

This design supports SEO (the page title, description, and lesson list are
always server-rendered) while keeping course content behind enrollment.

### YouTube Privacy-Enhanced Embed

Uses `https://www.youtube-nocookie.com/embed/<id>` to minimize cross-site
tracking. The video id comes directly from the trusted DB row
(`youtube_video_id` column). An 11-char `[A-Za-z0-9_-]` regex validates it
before rendering; invalid or missing ids show a localized placeholder.
Autoplay is intentionally disabled (no `autoplay=1` param). The iframe is
`loading="lazy"` and uses the `aspect-video` Tailwind class for responsive
16:9 sizing.

### Mark-Watched Action: Idempotency And Completion

`markLessonWatched` in `lib/progress/actions.ts`:

- Auth: `createClient().auth.getUser()` - never trusts a client-supplied id.
- Enrollment check: queries `enrollments` for (user, course); returns
  `fail("notEnrolled")` if absent. No auto-enrollment.
- Idempotency: upserts `lesson_progress` with
  `onConflict("user_id,lesson_id") ignoreDuplicates`. Re-marking a watched
  lesson is a no-op at the DB level; the action recomputes progress and
  returns an accurate state regardless.
- Completion: after the upsert, all `lesson_progress` rows for the user +
  course are fetched, `calculateCourseProgress` is called with the full
  lesson list. When `isComplete = true` and `enrollments.completed_at` is
  null, `completed_at` is set to `now()`. If `completed_at` was already set
  (a previous call already completed the course), `courseCompleted` is still
  returned as `true`.
- `last_accessed_lesson_id` is updated on every successful mark-watched call.
- `revalidatePath` is called with the course path so the server component
  re-renders fresh progress on the next page load.

### Auto Next-Lesson Navigation

`MarkWatchedButton` (client component) calls `markLessonWatched` via
`useTransition`. On success:

- If `data.courseCompleted` or no next lesson: calls `router.refresh()` so
  the server re-renders the completion panel.
- Otherwise: calls `router.push(/courses/<slug>?lesson=<nextSlug>)` to
  navigate to the next incomplete lesson.

### Mobile Sidebar Sheet

`LessonSidebarMobile` wraps `LessonSidebar` in a Base UI Sheet/drawer. The
trigger button (`md:hidden`) is visible only below the `md` breakpoint. On
desktop, the sidebar is a persistent `w-72` column via `hidden md:block`.
Clicking any lesson link closes the sheet by setting `open = false` via an
`onClick` wrapper div.

### New Course i18n Namespace

A new `"Course"` namespace was added to both `messages/en-US.json` and
`messages/he-IL.json` (key-identical, real Hebrew translations). Keys cover:
lesson list label, preview badge, completed label, no-lessons states, back
links, mark-watched states (markWatched, markingWatched, watched, nextLesson),
progress bar (progressLabel, progressLessons ICU plural), completion panel
(completionTitle, completionBody), gated lesson (lockedTitle, lockedBody),
videoUnavailable, metadata fallback, and error states.

### Certificate/Dashboard Forward-Refs

`CourseCompletionState` links to `/dashboard` as a placeholder. Certificates
are planned for batch 11. The component documents this with a code comment.

### Files Created

- `lib/progress/queries.ts` - `getCourseProgress`, `getEnrollment`
- `lib/progress/actions.ts` - `markLessonWatched` server action
- `components/courses/course-progress-bar.tsx` - server component
- `components/courses/lesson-sidebar.tsx` - server component (nav landmark)
- `components/courses/lesson-sidebar-mobile.tsx` - client Sheet wrapper
- `components/youtube/youtube-player.tsx` - server iframe component
- `components/courses/mark-watched-button.tsx` - client component
- `app/[locale]/courses/[courseSlug]/page.tsx` - course learning page
- `app/[locale]/courses/[courseSlug]/loading.tsx` - Suspense skeleton
- `tests/integration/mark-watched.test.ts` - 6 integration tests
- `tests/unit/lesson-sidebar.test.tsx` - 8 unit tests
- `tests/unit/youtube-player.test.tsx` - 8 unit tests
- `e2e/course-progress.spec.ts` - guest + authenticated smoke tests

### Gate Results

```
npm run lint       - PASS (0 errors, 0 warnings)
npm run lint:i18n  - PASS (141 keys in sync, up from 119)
npm run typecheck  - PASS (tsc --noEmit clean)
npm run test       - PASS (232 tests in 12 files, 2.87s; +25 new tests)
npm run build      - PASS (/[locale]/courses/[courseSlug] registered as dynamic)
npm run test:e2e   - PASS (32 tests, 28.9s; 7 new course-progress specs all pass)
```

### Deferred To Later Batches

- Certificates (batch 11) - `CourseCompletionState` links to `/dashboard`
  as a placeholder with a forward-ref comment in the code.
- Full enroll->watch->complete E2E with authenticated student (batch 12) -
  seeded student is set in .env.local but student is not enrolled in the test
  course; the authenticated tests assert page structure and lesson content
  render correctly for a logged-in non-enrolled user viewing a preview lesson.
- Toast/error notifications on mark-watched failure (batch 12) - the
  MarkWatchedButton logs errors to the console silently; a toast layer will
  surface these in the final UX.

## Batch 07: Admin Course Management and YouTube Import (2026-06-13)

Implements the full instructor admin surface: course CRUD, lesson management,
YouTube playlist import, and drag-free lesson reorder. All guarded behind
`requireInstructor()` at both layout and action level.

### What Was Built

| Area | Implementation | Key files |
| ---- | -------------- | --------- |
| Admin guard | `requireAdmin()` thin alias of `requireInstructor()`; `getIsAdmin()` non-redirecting boolean for UI gating | `lib/auth/guards.ts` |
| Admin layout | Server layout calls `requireInstructor()` before rendering; renders nav landmark with courses link; `<main id="main-content">` for child content | `app/[locale]/admin/layout.tsx` |
| Admin queries | `listAllCourses()` returns all statuses with `lessonCount + createdAt`; `getCourseForEdit()`; `listLessonsForCourse()` | `lib/admin/queries.ts` |
| Course actions | `createCourse` (validates, handles 23505 duplicate-slug), `updateCourse`, `deleteCourse` (fetches slug before delete for revalidation); all re-check `requireAdmin()` | `lib/admin/course-actions.ts` |
| Lesson actions | `addLessonFromUrl` (extracts video id, fetches oEmbed with graceful degradation, computes MAX sort_order+1, inserts); `updateLesson`; `deleteLesson` | `lib/admin/lesson-actions.ts` |
| Lesson reorder | Two-phase update strategy: Phase 1 offsets all sort_order values by `+10_000` (avoids unique-constraint collision on non-deferrable constraint); Phase 2 sets final values | `lib/admin/reorder-lessons.ts` |
| YouTube playlist import | `importPlaylist` (extractPlaylistId → fetchPlaylistItems → bulk insert with sequential sort_order); `previewPlaylist`; propagates `MISSING_API_KEY_MESSAGE` to UI | `lib/youtube/playlist.ts` |
| Admin pages | Course list, new course, edit course, lesson list pages | `app/[locale]/admin/courses/{page,new/page,[courseId]/edit/page,[courseId]/lessons/page}.tsx` |
| Admin components | `AdminCourseTable` (responsive, table-fixed layout, columns hidden at mobile), `AdminCourseForm`, `AdminLessonList`, `AdminLessonForm`, `AddLessonForm`, `YouTubePlaylistImport` | `components/admin/` |
| i18n | Admin namespace added to both catalogs (264 total keys, key-identical); covers nav, course/lesson CRUD, status badges, playlist import, reorder | `messages/en-US.json`, `messages/he-IL.json` |
| Integration tests | Guards (getIsAdmin/requireAdmin roles), course-actions (validate/insert/23505/delete), lesson-actions (addFromUrl/update/delete), playlist-import (missing-key/import/preview), reorder-lessons (two-phase verification) | `tests/integration/` |
| Unit tests | AdminCourseForm (renders fields, field errors, mode buttons) | `tests/unit/admin-course-form.test.tsx` |
| E2E tests | Anonymous redirect to login (EN+HE); instructor access + no horizontal overflow at 390px | `e2e/admin.spec.ts` |

### Key Decisions

**admin == instructor**: No separate admin role is introduced. `requireAdmin()`
is a thin alias of `requireInstructor()` and `getIsAdmin()` checks
`isInstructor` from `getCurrentUserRole()`. The `user_roles` table has a single
`app_role` enum (`instructor | student`); RLS policy `private.is_admin()`
already maps to instructor.

**Two-phase reorder over SQL function**: The lessons table has a non-deferrable
`UNIQUE(course_id, sort_order)` constraint. A naive single-pass update would
transiently collide. The TypeScript two-phase approach (offset all by +10_000,
then set finals) avoids adding a migration for deferability and keeps all logic
in the application layer.

**Request-scoped client for writes**: `createClient()` (RLS enforced) is used
for all admin writes. Instructor RLS policies grant full CRUD on courses and
lessons without needing `createAdminClient()`.

**oEmbed graceful degradation**: If the YouTube oEmbed fetch fails (private
video, rate-limit, etc.), `addLessonFromUrl` still creates the lesson with a
title derived from the video ID. The instructor can edit it afterward.

**Responsive table without min-width**: `AdminCourseTable` uses `table-fixed`
with `colgroup` widths and responsive column hiding (`sm:`, `md:`, `lg:`)
instead of `min-w-[640px]`. This keeps `document.documentElement.scrollWidth`
within viewport at 390px (Chromium's `scrollWidth` includes content inside
`overflow:auto` children, so clipping alone is insufficient).

**Vitest UUID strictness**: Zod v4's UUID validator enforces RFC 4122 variant
bits (variant nibble must be `[89abAB]`). Zero-padded sequential IDs like
`000000000001` fail. All test UUIDs use real v4 format.

**vi.mock hoisting and MISSING_API_KEY_MESSAGE**: Vitest hoists `vi.mock()`
factory calls above imports. Referencing an imported constant inside a factory
causes a ReferenceError at hoist time. The constant is inlined as a string
literal in the test file, and `vi.fn()` without factory is used for modules
whose return values are controlled via `vi.mocked()` in `beforeEach`.

**Body overflow-x-hidden + table-fixed**: Added `overflow-x-hidden` to `<body>`
and `min-w-0` to the children flex wrapper in the locale layout as defensive
mobile hygiene. The actual overflow fix is the `table-fixed` column layout in
the course table.

### Gate Results

```
npm run lint       - PASS (0 errors, 16 warnings - unused mock params in test files)
npm run lint:i18n  - PASS (264 keys in sync, up from 141)
npm run typecheck  - PASS (tsc --noEmit clean)
npm run test       - PASS (266 tests in 18 files; +34 new tests across 6 new test files)
npm run build      - PASS (5 admin routes registered as dynamic ƒ)
npm run test:e2e   - PASS (36 tests; 2 new admin guard specs + 2 new responsive specs)
```

### Deferred To Later Batches

- Drag-and-drop reorder UI (current implementation uses up/down buttons).
- Playlist import preview UI beyond the basic form (thumbnails, duration).
- Bulk lesson operations (select-all delete, bulk status change).

## Batch 8: AI Tutor (2026-06-13)

Implements the AI tutor chat panel for the course page. Students can ask
questions about the current lesson and receive streamed AI responses that
are persisted in Supabase with RLS isolation.

### Route Decision: Dedicated /api/tutor

A dedicated `app/api/tutor/route.ts` was created instead of extending the
existing `/api/chat`. Rationale:

- `/api/chat` is an unauthenticated demo route (tech-debt noted in batch 00;
  not fixed here - left for a separate chore).
- The tutor route requires auth (401), enrollment gating (403), course+lesson
  context injection, Supabase persistence, and own-conversation isolation -
  none of which belong in the generic demo endpoint.
- Keeping them separate preserves the demo for testing and avoids coupling the
  tutor's auth/gating logic to a route that intentionally has none.

### Persistence Flow

1. Parse and validate body (`tutorMessageSchema`): `courseId`, `lessonId?`,
   `conversationId?`, and the latest user message text (extracted from the
   `UIMessage[]` array).
2. Authenticate via `supabase.auth.getUser()` - 401 if not authenticated.
3. Load course row by UUID (direct query, not by slug).
4. Load lesson row if `lessonId` provided; check `is_preview`.
5. Enrollment gate: if lesson is not a preview, call `getEnrollment()` - 403
   if not enrolled.
6. `getOrCreateConversation()`: load the conversation (verifying `course_id`
   match on top of RLS) or insert a new one.
7. Load recent message history via `getConversationMessages(cap=20)`.
8. **`saveUserMessage()` is called BEFORE the stream starts** so the user's
   message is persisted even if the stream fails mid-way.
9. Build system prompt via `buildTutorSystemPrompt()`.
10. Convert history + new user turn to model messages via
    `convertToModelMessages()`.
11. `streamText()` with `onFinish` callback that calls
    `saveAssistantMessage()` with the full response text after streaming
    completes.
12. Return `toUIMessageStreamResponse()` wrapped with an
    `x-conversation-id` response header so the client can resume.

### Enrollment / Preview Gating

- A lesson with `is_preview = true` is accessible without enrollment (free
  preview). The tutor panel renders for preview lessons even when the user
  is not enrolled.
- Non-preview lessons require an active enrollment row (`getEnrollment()`).
- When neither condition is met the route returns 403 with a safe JSON
  message (no stack, no secret).
- The course page applies the same `canWatch` logic to decide which tutor
  panel variant to render: `TutorChat` (authed + access), `TutorSignInCta`
  (no user), or `TutorEnrollCta` (authed, not enrolled, not preview).

### RLS Own-Conversation Isolation

- All Supabase calls use the request-scoped client (`createClient()`) so
  `auth.uid()` governs every read/write - no service-role bypass.
- `getOrCreateConversation()` performs a belt-and-suspenders check: after
  RLS filters by user ownership, the application layer additionally asserts
  `conversation.course_id === courseId` to prevent cross-course context
  leakage if a client supplies a mismatched `conversationId`.
- Message inserts reference the conversation ID; RLS on `ai_tutor_messages`
  grants access via the owning conversation's `user_id`.
- `NEVER trust a client-supplied user_id` - the user ID comes exclusively
  from `auth.getUser()`.

### How Course/Lesson IDs Reach the Route

The `useChat` hook in `TutorChat` uses `DefaultChatTransport` with a
`prepareSendMessagesRequest` callback that merges `courseId`, `lessonId`,
`conversationId`, and `locale` into the JSON body alongside the standard
`messages` array. The server reads all fields from `req.json()`.

The `conversationId` is initialized from a server-prefetched value
(`initialConversationId` prop) and updated on each response from the
`x-conversation-id` header (captured in the `fetch` wrapper on the
transport) so that subsequent turns in the same session resume the correct
DB conversation row.

### System Prompt Guardrails

`buildTutorSystemPrompt()` (pure, no side effects) includes:

- Language instruction: answer in the active locale (`en` or `he`) unless
  the student explicitly switches.
- Course and lesson context block (name, description, lesson title,
  description, YouTube URL for reference only).
- A "Critical Limitations" section that explicitly instructs the model:
  - It has NOT watched the video - only metadata is available.
  - Do NOT claim to have seen timestamps, segments, or spoken words.
  - Do NOT fabricate transcript content.
  - If asked about a specific video moment, acknowledge the limitation and
    offer to help based on the described concept.
- One clarifying question when the question is ambiguous.
- Suggest a small exercise when helpful.

### Tutor i18n Namespace

A new `"Tutor"` namespace was added to both `messages/en-US.json` and
`messages/he-IL.json` (key-identical, real Hebrew). Keys: `heading`,
`inputPlaceholder`, `inputLabel`, `send`, `thinking`, `empty`, `error`,
`retry`, `enrollToAsk`, `signInToAsk`, `you`, `assistant`. `npm run
lint:i18n` confirmed 276 keys in sync.

### /api/chat Tech-Debt Note

`/api/chat` remains an unauthenticated demo route. This is tracked as a
separate tech-debt item and was NOT fixed in this batch - the prompt
explicitly called it out as out of scope.

### Files Created / Changed

Created:

- `lib/tutor/prompt.ts` - pure prompt builder + `capHistory` helper
- `lib/tutor/queries.ts` - `getOrCreateConversation`, `getConversationMessages`,
  `listConversationsForCourse`
- `lib/tutor/persistence.ts` - `saveUserMessage`, `saveAssistantMessage`
- `app/api/tutor/route.ts` - authenticated, gated, persisting streaming route
- `components/tutor/tutor-chat.tsx` - `TutorChat`, `TutorSignInCta`,
  `TutorEnrollCta` client components
- `tests/unit/tutor-prompt.test.ts` - 17 unit tests for prompt builder
- `tests/integration/tutor-route.test.ts` - 9 integration tests for the route
- `e2e/tutor.spec.ts` - 9 e2e smoke tests (8 run, 1 skipped: live AI)

Changed:

- `app/[locale]/courses/[courseSlug]/page.tsx` - prefetches tutor history,
  mounts `TutorChat` / `TutorSignInCta` / `TutorEnrollCta` below lesson
- `messages/en-US.json` - added `"Tutor"` namespace (13 keys)
- `messages/he-IL.json` - added `"Tutor"` namespace (13 keys, real Hebrew)

### Gates

- `npm run lint` - 0 errors, warnings are pre-existing patterns from other
  test files (unused `_`-prefixed params in mock builders).
- `npm run lint:i18n` - passed: 276 keys in sync.
- `npm run typecheck` - passed clean.
- `npm run test` - 298 tests, 20 test files, all passed.
- `npm run build` - passed; `/api/tutor` route appears in the build manifest.
- `npm run test:e2e` - 45 passed, 1 skipped (live AI gateway test guarded
  behind `E2E_REAL_AI=true`; skipped in CI because the real gateway is not
  called). All tutor-specific specs pass.

### Follow-Ups

- `/api/chat` unauthenticated demo route - tech-debt, separate chore.
- Conversation resume UI (conversation list / picker) - deferred; the DB
  layer (`listConversationsForCourse`) is in place.
- Conversation title auto-generation (currently null) - deferred.
- Rate limiting on `/api/tutor` - deferred.

## Batch 9: Dashboards (2026-06-13)

### Data Access Strategy

**Student dashboard** uses the `student_course_progress` view (batch 02,
`security_invoker=true`, RLS-scoped) to get per-course progress metrics.
Enrollments and courses are joined directly. `lesson_progress` is queried
directly for weekly summary and recently-watched lists. All queries use the
request-scoped client; RLS enforces `auth.uid()` scoping, with explicit
`user_id` filter as defense in depth.

**Admin dashboard** uses the `admin_stuck_students` view (batch 02) for
inactive-student detection. Common AI tutor questions aggregate
`ai_tutor_messages` directly (no view - deferred in batch 02); normalization
is lowercase+trim before counting. No `admin_common_tutor_questions` view
exists. Enrollment/completion stats aggregate from `enrollments` directly.
Recent activity merges enrollment and `lesson_progress` feeds server-side.

### Badge Logic

Badge computation lives in `lib/dashboard/badges.ts` as a pure function
`computeAchievementBadges(enrollments, weeklyCount)`. It takes already-fetched
data and returns earned/locked state with no I/O. The query module
(`lib/dashboard/student-queries.ts`) fetches and calls it. This makes unit
testing trivial (no mocking required).

### Admin Guard

Admin dashboard page calls `requireAdmin()` (from `lib/auth/guards.ts`)
even though the admin layout already called `requireInstructor()`. This is
belt-and-suspenders: the layout guard protects the route tree, the page guard
protects the aggregate analytics. Both delegate to the same underlying
`requireInstructor` logic.

### Charts

A Recharts bar chart (`WeeklyProgressChart`) is used for weekly lesson
activity only when 2+ distinct active days exist - otherwise a stat line is
sufficient and the chart is skipped. The chart uses `hsl(var(--primary))` and
`hsl(var(--border))` CSS custom properties so it renders correctly in both
light and dark mode without hard-coded colors. The chart is a client island;
all data is fetched server-side and passed as props.

Admin completion rates are rendered as a table with inline progress bars, not
a chart, since a small set of courses is clearer in tabular form.

### i18n

Two new namespaces added to both catalogs (key-identical, real Hebrew):

- `DashboardStudent` - greeting, enrolled courses, badges, weekly progress,
  recently watched, empty states, badge names+descriptions.
- `DashboardAdmin` - overview stat labels, completion table, stuck students,
  common questions, activity feed, error states.

`Admin.nav.dashboard` key added to both catalogs. `npm run lint:i18n` passes.

### Request Client and RLS

All queries use `createClient()` from `lib/supabase/server` (request-scoped,
RLS-enforced). No service-role access anywhere in this batch.

### Files Created / Changed

Created:

- `lib/dashboard/badges.ts` - pure badge computation, no I/O
- `lib/dashboard/student-queries.ts` - `getEnrolledCoursesWithProgress`,
  `getWeeklyProgressSummary`, `getRecentlyWatchedLessons`, `getAchievementBadges`
- `lib/dashboard/admin-queries.ts` - `getAdminOverviewStats`,
  `getCourseCompletionRates`, `getStuckStudents`, `getCommonTutorQuestions`,
  `getRecentCourseActivity`
- `components/dashboard/enrolled-course-row.tsx`
- `components/dashboard/achievement-badge.tsx`
- `components/dashboard/recently-watched-list.tsx`
- `components/dashboard/weekly-progress-chart.tsx` (client island, Recharts)
- `components/dashboard/admin-stat-cards.tsx`
- `components/dashboard/admin-completion-table.tsx`
- `components/dashboard/admin-stuck-students.tsx`
- `components/dashboard/admin-common-questions.tsx`
- `components/dashboard/admin-activity-feed.tsx`
- `app/[locale]/admin/dashboard/page.tsx` - admin analytics dashboard
- `tests/unit/badges.test.ts` - 10 unit tests for pure badge function
- `tests/integration/student-dashboard-queries.test.ts` - 9 integration tests
- `tests/integration/admin-dashboard-queries.test.ts` - 16 integration tests
- `e2e/dashboard.spec.ts` - redirect + smoke tests

Changed:

- `app/[locale]/dashboard/page.tsx` - full student dashboard (kept requireUser)
- `app/[locale]/admin/layout.tsx` - added Dashboard nav link
- `messages/en-US.json` - `DashboardStudent`, `DashboardAdmin`, `Admin.nav.dashboard`
- `messages/he-IL.json` - same keys, real Hebrew


## Batch 10: Localization, SEO, Accessibility Polish (2026-06-13)

### Audit Findings

**i18n / Hardcoded Strings**

- Already OK: 335 keys, catalogs key-identical, `npm run lint:i18n` green.
- Already OK: Hebrew values are real Hebrew in all batch 05-09 namespaces.
- Fixed: `components/admin/admin-course-form.tsx` - "Intermediate" (line 218)
  and "Advanced" (line 220) were hardcoded English; "beginner" used the broken
  `t("courseForm.fields.level", { fallback: "beginner" })` pattern (which is
  not a valid next-intl call). All three now use `tCourses("level.*")` from
  the existing `Courses.level` namespace which already has correct Hebrew.
- Fixed: `components/admin/admin-course-table.tsx` - `{course.level}` was
  rendered raw with Tailwind `capitalize`. Now uses
  `tCourses("level.${course.level}")` for proper localization.

**SEO / Noindex**

- Fixed: `app/[locale]/admin/layout.tsx` - added `export const metadata` with
  `robots: { index: false, follow: false }`. Next.js merges layout metadata
  into all child pages, so this single export covers all five admin pages
  (`/admin/dashboard`, `/admin/courses`, `/admin/courses/new`,
  `/admin/courses/[id]/edit`, `/admin/courses/[id]/lessons`). No per-page
  changes needed.
- Fixed: `app/[locale]/dashboard/page.tsx` - `generateMetadata` now includes
  `robots: { index: false, follow: false }`.
- Already OK: `app/[locale]/chat/page.tsx` - already had noindex.
- Already OK: Home and course detail pages have good `generateMetadata` with
  title, description, openGraph, and conditional `alternates` when
  `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` is set.
- Added: `app/sitemap.ts` - dynamic sitemap listing EN+HE home and all
  published courses. Falls back gracefully when base URL env is unset.
- Added: `app/robots.ts` - allows all crawlers on public pages, disallows
  `/*dashboard*`, `/*admin*`, `/api/`, `/auth/`, `/*chat*`, password-reset
  flows. Sitemap URL included when base URL env is set.

**Accessibility**

- Already OK: every page has exactly one `<h1>` and `<main id="main-content">`.
- Already OK: `YouTubePlayer` sets `title={title}` (lesson title) on the
  iframe.
- Already OK: form fields in `AdminCourseForm` use `<label htmlFor>`,
  `aria-invalid`, `aria-describedby` for errors; no a11y regressions found.
- Already OK: `jsx-a11y` ESLint rule is enforced (full recommended ruleset,
  scoped to non-ui-vendored JSX/TSX).

**PWA Cache Safety**

- Already OK: `public/sw.js` is safe. The fetch handler intercepts only failed
  navigations (network error path) and serves a cached offline page. All other
  requests - including API calls, Supabase, authenticated routes - pass through
  to the network untouched. No private data is ever written to Cache Storage
  beyond the offline shell and manifest assets.

**Secrets in Client**

- Already OK: `YOUTUBE_API_KEY`, `AI_GATEWAY_API_KEY`, `SUPABASE_SERVICE_ROLE`
  are not referenced anywhere in `components/` or `app/[locale]/`. Server-only.

**Lint Warnings**

- Before: 21 warnings (0 errors) - all `@typescript-eslint/no-unused-vars` on
  underscore-prefixed mock params in integration test files, plus two unused
  imports in app pages.
- Fixed unused imports: removed `getOrCreateConversation` from
  `app/[locale]/courses/[courseSlug]/page.tsx` and `getCourseDetailBySlug`
  from `app/api/tutor/route.ts`.
- Fixed `table` -> `_table` in `tests/integration/lesson-actions.test.ts`.
- Configured `@typescript-eslint/no-unused-vars` in `eslint.config.mjs` with
  `argsIgnorePattern: "^_"` so underscore-prefixed mock callback params are
  correctly ignored (industry-standard convention).
- After: 0 warnings, 0 errors.

### Tests Added

Unit tests (`tests/unit/seo-metadata.test.ts`, 5 tests):

- Admin layout static `metadata` has `robots.index === false`.
- Dashboard `generateMetadata` has `robots.index === false`.
- Chat `generateMetadata` has `robots.index === false`.
- Home `generateMetadata` does NOT set `robots.index === false`.
- Course page `generateMetadata` does NOT set `robots.index === false`.

E2E tests (`e2e/seo-a11y.spec.ts`, 7 tests):

- `/en` html lang starts with "en", dir=ltr.
- `/he` html lang starts with "he", dir=rtl.
- `/en` home has `<main id="main-content">` and exactly one `<h1>`.
- `/en/login` has `<main id="main-content">` and exactly one `<h1>`.
- `/he` home has `<main id="main-content">` and exactly one `<h1>`.
- Unauthenticated `/en/dashboard` redirects to login.
- Unauthenticated `/en/admin/courses` redirects to login.

### Gates

- `npm run lint` - 0 errors, 0 warnings (was 21 warnings before).
- `npm run lint:i18n` - 335 keys in sync.
- `npm run typecheck` - clean.
- `npm run test` - 338 passed (333 prior + 5 new).
- `npm run build` - clean; `/robots.txt` static, `/sitemap.xml` dynamic.
- `npm run test:e2e` - 61 passed, 1 skipped (E2E_REAL_AI gate), 0 failed.

### Files Changed

Created:

- `app/sitemap.ts` - dynamic sitemap for public pages + published courses
- `app/robots.ts` - robots.txt allowing public, disallowing private routes
- `tests/unit/seo-metadata.test.ts` - SEO noindex unit tests (5 tests)
- `e2e/seo-a11y.spec.ts` - lang/dir, h1, landmark, auth-redirect e2e (7 tests)

Changed:

- `app/[locale]/admin/layout.tsx` - added `export const metadata` with noindex
- `app/[locale]/dashboard/page.tsx` - added robots noindex to generateMetadata
- `app/api/tutor/route.ts` - removed unused `getCourseDetailBySlug` import
- `app/[locale]/courses/[courseSlug]/page.tsx` - removed unused
  `getOrCreateConversation` import
- `components/admin/admin-course-form.tsx` - fixed hardcoded "Intermediate" /
  "Advanced" / broken beginner key to use `tCourses("level.*")`
- `components/admin/admin-course-table.tsx` - fixed raw `course.level` display
  to use `tCourses("level.*")`
- `tests/integration/lesson-actions.test.ts` - `table` -> `_table`
- `eslint.config.mjs` - added `argsIgnorePattern: "^_"` to
  `@typescript-eslint/no-unused-vars` rule

---

## Batch 11 - Required Extended Features

**Date:** 2026-06-13
**Branch:** `feature/11-extended-features`
**Worktree:** `/Users/talo/www/academy-11-features`

### Features Delivered

**Feature A - Certificates**

- `lib/certificates/queries.ts` - isEligibleForCertificate (checks
  enrollments.completed_at IS NOT NULL via maybeSingle), getMyCertificates
  (RLS-scoped list), getCertificateByCourse, getCertificateById.
- `lib/certificates/actions.ts` - issueCertificate: requireUser +
  eligibility check + upsert(onConflict=user_id,course_id,
  ignoreDuplicates) + read-back; stores metadata={courseTitle, courseSlug,
  studentName, issuedDate, academyName}; calls revalidatePath.
- `app/[locale]/certificates/page.tsx` - student certificate list;
  requireUser; links to /certificates/[courseSlug].
- `app/[locale]/certificates/[courseSlug]/page.tsx` - printable
  certificate; getCertificateByCourse then issueCertificate; print CSS
  (@media print + @page A4 landscape); no PDF library.
- `components/certificates/print-button.tsx` - "use client" island;
  window.print() on click; lucide Printer icon.
- Updated `app/[locale]/courses/[courseSlug]/page.tsx` - CourseCompletionState
  links to /certificates/[courseSlug] instead of /dashboard; added
  getCertificate i18n key.
- Updated `app/[locale]/dashboard/page.tsx` - added "My Certificates"
  section with getMyCertificates.

**Feature B - Smart Search**

- `lib/search/queries.ts` - searchPublished: blank/whitespace guard
  returns empty; queries search_documents view with
  .or("title.ilike.%q%,body.ilike.%q%"); two-pass title-first ranking;
  resolves lesson courseSlug via courses lookup; returns {courses,
  lessons}; cap 20 results.
- `lib/search/types.ts` - changed SearchResults from flat array to
  {courses, lessons} partitioned shape; added courseId field.
- `app/[locale]/search/page.tsx` - public GET form (?q=); no auth;
  searchQuerySchema.safeParse; grouped results; empty/no-results states.
- Updated `components/site-header.tsx` - search link always in nav
  (authenticated and anonymous); hamburger always shown with
  conditional sign-in/sign-out.

**Feature C - Class Groups**

- `lib/groups/queries.ts` - Admin: listGroups, listGroupMembers,
  getGroupProgress (group_progress_summary view). Student: getMyGroups
  (queries class_group_members then class_groups by IDs),
  getMyGroupProgress.
- `lib/groups/actions.ts` - createGroup: requireAdmin +
  createGroupSchema + insert; 23505 -> fieldError on slug. addMember:
  requireAdmin + groupMembershipSchema + verify group exists + upsert
  (ignoreDuplicates) + read-back. removeMember: requireAdmin + delete.
- `app/[locale]/admin/groups/page.tsx` - create form + GroupCard server
  component per group (member list, remove buttons, add-member form,
  progress summary); inline "use server" actions with redirect.
- `app/[locale]/groups/page.tsx` - student groups page; requireUser +
  getMyGroups + getMyGroupProgress; empty state + groups list.
- Updated `app/[locale]/admin/layout.tsx` - Groups and Reminders nav
  links added.

**Feature D - Reminders**

- `lib/reminders/queries.ts` - identifyInactiveStudents (admin_stuck_students
  view); listReminderEvents (admin, ordered by created_at desc).
- `lib/reminders/actions.ts` - queueReminder: requireAdmin + 24h dedup
  window (maybeSingle existing queued reminder for same user+course+reason
  within 24h) + insert with status='queued', metadata={provider:"none"};
  markReminderStatus: requireAdmin + update; sets sent_at when
  status='sent'. No email provider - status stays 'queued'.
- `app/[locale]/admin/reminders/page.tsx` - inactive students table
  with Queue Reminder form per row + reminder queue table; provider
  notice banner (role="note", yellow) stating no EMAIL_PROVIDER_API_KEY;
  notice/error searchParam feedback.

**Feature E - Payments (Simulation Only)**

- `lib/payments/checkout.ts` - getActiveCoursePrice (maybeSingle on
  course_prices where is_active=true). hasPaidAccess: admin bypass ->
  free course (no price) -> paid payment check. createCheckoutSession:
  requireUser + hasPaidAccess guard + getActiveCoursePrice + randomUUID()
  for both checkoutSessionId and simulationEventId + insert pending
  payments row; returns CheckoutSessionResult (no card fields).
  confirmSimulatedPayment: requireUser + find by simulationEventId +
  idempotency check (already paid -> return) + update to paid +
  enrollInCourse(); provider='simulation' throughout.
- `app/[locale]/courses/[courseSlug]/checkout/page.tsx` - requireUser +
  getCourseDetailBySlug + hasPaidAccess (redirect if access) +
  getActiveCoursePrice + createCheckoutSession; mandatory ShieldCheck
  banner "Simulated payment - no real charge will occur"; NO card input
  fields; single "Pay (Simulated)" confirm button; handleConfirmPayment
  server action -> confirmSimulatedPayment -> redirect to course.
- Updated `components/courses/enrollment-button.tsx` - checkoutHref prop:
  if set, renders Link to checkout instead of calling enrollInCourse
  (paid course path); original path now serves free courses only.
- Updated `app/[locale]/courses/[courseSlug]/page.tsx` - loads
  getActiveCoursePrice; computes checkoutHref after enrollment state
  determined; passes to GatedLesson -> EnrollmentButton.

**Cross-cutting**

- `messages/en-US.json` + `messages/he-IL.json` - 5 new namespaces:
  Certificates, Search, Groups, Reminders, Payments; Nav.search;
  Course.getCertificate; Admin.nav.groups/reminders;
  DashboardStudent certificate keys. 453 keys in sync (up from 335).

**Tests**

- `tests/integration/certificates.test.ts` - 6 tests: isEligibleForCertificate
  (false/true), getMyCertificates (empty, DTO mapping), issueCertificate
  (courseNotComplete fail, idempotent success).
- `tests/integration/search.test.ts` - 5 tests: empty/whitespace guard,
  search_documents view target, ILIKE filter captured, partition into
  courses/lessons, empty results.
- `tests/integration/groups.test.ts` - 8 tests: createGroup (name fail,
  slug fail, 23505 slug error, success), addMember (UUID validation,
  success), getMyGroups (empty, array type).
- `tests/integration/reminders.test.ts` - 4 tests: identifyInactiveStudents,
  queueReminder creates queued status, queueReminder idempotent (returns
  existing within dedup window), fails on empty userId.
- `tests/integration/payments.test.ts` - 9 tests: hasPaidAccess (admin
  bypass, free course, paid payment, no payment), createCheckoutSession
  (creates pending SIMULATION-ONLY row with UUID keys, no card fields;
  alreadyPaid guard; free course path), confirmSimulatedPayment (sets
  paid+enrolls, idempotent on simulationEventId, empty id fails, not
  found fails).
- `e2e/extended-features.spec.ts` - 14 tests (3 skipped needing seeded
  DB): search page form + GET ?q= + empty results + HE RTL; checkout
  unauthenticated redirect + no card fields assertion; certificates/groups
  unauthenticated gating; admin reminders/groups unauthenticated redirect;
  nav search link present EN+HE.

### Bug Fixes During Implementation

- Test UUID format: Zod v4 enforces RFC 4122 UUID spec (version nibble
  1-8, variant 8-b). Test UUIDs using `0000` 3rd segment rejected. Fixed
  by using proper v4 UUIDs (`*-*-4xxx-8xxx-*`).
- `next/cache` mock missing: `revalidatePath` in `"use server"` modules
  throws "static generation store missing" in vitest. Fixed by adding
  `vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))` to each
  affected test file (certificates, groups, reminders).
- `getMyCertificates` returned `[]` in tests: makeBuilder in
  `certificates.test.ts` lacked a `then` trap for direct-await of the
  builder (list queries ending in `.order()`). Added `then` trap
  resolving from `mockResults[table]`.
- SearchResults type mismatch: existing `lib/search/types.ts` defined
  flat `{query, results[], total}`. Implementation needed `{courses,
  lessons}` partition. Fixed type file to match.
- ESLint: unused `locale` prop in GroupCard. Removed from interface and
  call site.
- `checkoutHref` computed before `isEnrolled` set: moved computation
  after the enrollment state block in the course page.
- Hamburger drawer: search nav link added for all users (anonymous too),
  so drawer always visible; added conditional sign-in/sign-out inside
  drawer.

### Gate Results

- `npm run lint` - 0 errors, 0 warnings.
- `npm run lint:i18n` - 453 keys in sync.
- `npm run typecheck` - clean.
- `npm run test` - 372 passed (0 failed).
- `npm run build` - clean; 42 routes generated including all 5 new
  feature routes.
- `npm run test:e2e` - 72 passed, 4 skipped (3 need seeded DB,
  1 E2E_REAL_AI gate), 0 failed.
