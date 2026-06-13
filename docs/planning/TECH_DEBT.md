# Technical Debt Backlog

Accumulated cleanup items deferred from the build batches (00-13). Each item
states its scope and acceptance check. Cleared items move to **Done** with a
date. This file is the canonical work-list for the tech-debt batch.

## Open Items

(none)

## Done

- [x] **Declare and apply `server-only` consistently.** (2026-06-13)
  Installed `server-only` as an explicit `package.json` dependency. Added
  `import "server-only"` to 20 modules: `lib/courses/queries.ts`,
  `lib/courses/actions.ts`, `lib/progress/queries.ts`, `lib/progress/actions.ts`,
  `lib/youtube/metadata.ts`, `lib/youtube/playlist.ts`, `lib/admin/queries.ts`,
  `lib/admin/course-actions.ts`, `lib/admin/lesson-actions.ts`,
  `lib/admin/reorder-lessons.ts`, `lib/tutor/queries.ts`,
  `lib/tutor/persistence.ts`, `lib/certificates/queries.ts`,
  `lib/certificates/actions.ts`, `lib/groups/queries.ts`, `lib/groups/actions.ts`,
  `lib/reminders/queries.ts`, `lib/reminders/actions.ts`,
  `lib/payments/checkout.ts`, `lib/search/queries.ts`. No client component
  imports these modules at the runtime level (all client-component imports of
  action files are server-boundary calls, which is safe). Gates: lint, i18n,
  typecheck, build, test all green.

- [x] **Resolve the `NEXT_PUBLIC_SITE_URL` vs `NEXT_PUBLIC_APP_URL` naming
  split.** (2026-06-13) Created `lib/utils/site-url.ts` exporting `getSiteUrl()`
  (prefers `NEXT_PUBLIC_APP_URL`, falls back to `NEXT_PUBLIC_SITE_URL`, then
  `http://localhost:3000`). Updated all 6 readers:
  `app/robots.ts`, `app/sitemap.ts`, `app/[locale]/page.tsx`,
  `app/[locale]/courses/[courseSlug]/page.tsx`,
  `app/[locale]/forgot-password/actions.ts`,
  `app/[locale]/login/actions.ts`. Removed the now-unused `headers` import from
  both action files. Updated `.env.example` to document only
  `NEXT_PUBLIC_APP_URL` (deprecated alias commented out). Added unit test
  `tests/unit/site-url.test.ts`.

- [x] **Remove the unauthenticated `/api/chat` + `/chat` demo.** (2026-06-13)
  Deleted `app/api/chat/route.ts`, `app/[locale]/chat/page.tsx`,
  `app/[locale]/chat/chat-client.tsx`. Removed the `Chat` i18n namespace from
  both `messages/en-US.json` and `messages/he-IL.json`. Removed `Nav.chat` key
  from both catalogs. Removed the `/chat` nav link from
  `components/site-header.tsx`. Removed the stale chat test case from
  `tests/unit/seo-metadata.test.ts`. Removed `/*chat*` from `robots.ts`
  disallow list. Updated stale comment in `app/api/tutor/route.ts`.
  lint:i18n remains in sync (444 keys). All gates green.

- [x] **Remove the phantom `/profile` route reference.** (2026-06-13)
  Removed `"profile"` from `PROTECTED_SEGMENTS` in
  `lib/supabase/middleware.ts` (the actual location of this constant - not
  `proxy.ts` as the item stated). Removed `"/profile"` from `ALLOWED_NEXT` in
  `app/auth/confirm/route.ts`. Changed the defensive no-user fallback in that
  handler from `"/profile"` to `"/dashboard"`. No profile page was created.
  Gates green.

- [x] **Re-point test factories at the real domain types.** (2026-06-13)
  `tests/factories/course.ts`: replaced local `CourseFactoryRecord` interface
  with `Database["public"]["Tables"]["courses"]["Row"]`. Re-exported
  `CourseLevel` and `CourseStatus` from the generated enums.
  `tests/factories/lesson.ts`: replaced local `LessonFactoryRecord` with
  `Database["public"]["Tables"]["lessons"]["Row"]` (exact field match).
  `tests/factories/user.ts`: kept local `UserFactoryRecord` - the `profiles`
  Row uses `user_id` (not `id`), has no `role` column, and `email`/`full_name`
  are `string | null` in the DB but always strings in the factory. Divergences
  are documented in the interface JSDoc. Typecheck and test green (399 tests).
