# Technical Debt Backlog

Accumulated cleanup items deferred from the build batches (00-13). Each item
states its scope and acceptance check. Cleared items move to **Done** with a
date. This file is the canonical work-list for the tech-debt batch.

## Open Items

- [ ] **DESIGN.md danger-pill pairing fails WCAG AA as solid fill+text.**
  (logged 2026-06-15, Batch 22) The DESIGN.md `--color-danger-text` on
  `--color-danger-bg` pairing, used as a solid status pill (admin reminders
  "failed" pill, `app/[locale]/admin/reminders/page.tsx`), measures **2.97:1**
  in light (Burnt Orange `#be400f` on Rose Blush `#f9aea9`) and **2.56:1** in
  dark (Fault Red `#ff2056` on Crimson Depth `#8b0836`). Both are below the
  4.5:1 normal-text AA floor and the dark case is below the 3:1 UI floor too.
  Batch 22 kept the DESIGN.md values verbatim per the prompt ("do NOT silently
  alter the palette; log the miss"). The spec designed these tokens as a
  background-tint + accent-text combo, not a solid fill+text pill. Acceptance:
  either DESIGN.md gains an AA-passing on-danger text token (e.g. ice/cream on
  the danger bg) and the pill adopts it, or the failed pill switches to a
  tint+strong-text idiom (`bg-[var(--color-danger-bg)]/15` +
  `text-[var(--color-danger-text)]`) that clears 4.5:1. Verify both themes with
  a contrast tool before closing.

- [ ] **Light success pill label is below AA for small text.** (logged
  2026-06-15, Batch 22) The Batch-20 success passthrough (Forest `#165424` on
  Success Green `#62b06d`) measures **3.42:1** - fine for large text / UI (>=3:1)
  but under 4.5:1 for the `text-xs` (12px) / `text-sm` pill and banner labels it
  now backs (admin groups/reminders success banners, the reminders "sent" pill,
  contact + review success notices). Dark is fine (8.11:1). Acceptance: bump the
  light on-success text toward a darker forest, or raise the pill/banner label to
  a large-text size, so it clears 4.5:1 in light. Do not alter the palette
  unilaterally; coordinate with DESIGN.md.

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
