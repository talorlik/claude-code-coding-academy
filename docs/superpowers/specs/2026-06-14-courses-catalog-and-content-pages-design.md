# Courses Catalog, About, and Contact Pages Design

**Date:** 2026-06-14

**Status:** Approved for planning

**Deliverable:** Four sequential build batches (16-19) as prompt files under
`docs/prompts/`, runnable via `/run-batch NN`, matching the existing batch
00-15 convention.

## Goal

Add three user-facing surfaces to Eyal's Coding Academy:

1. **About** page (`/about`) - content and hero image supplied later; this
   batch builds the structured shell with obvious single-edit-point slots.
2. **Contact** page (`/contact`) - fake Tel-Aviv address and details, plus a
   no-JS contact form.
3. **Courses catalog** (`/courses`) - a Udemy-style browse experience with
   categories, course-level search, filters (including "My Courses"), three
   sorts, star ratings, and an in-card progress bar for enrolled courses.

The catalog is backed by real data throughout: real categories, a real
reviews/ratings table, real enrollment-derived popularity, and real
enrollment/progress for "My Courses" and the progress bar.

## Context And Constraints

The project is a Next.js App Router + Supabase course platform, built in
sequential batches (00-15 complete). Key existing facts this design builds on:

- Courses live in the `courses` table (`id, slug, title, description, level,
  status, language, cover_image_url, created_by, timestamps`). DTO is
  `CourseSummary` (camelCase) via `toCourseSummary()` in `lib/courses/types.ts`.
- `getPublishedCourses()` in `lib/courses/queries.ts` joins the
  `course_lesson_counts` view for `lessonCount` / `totalDurationSeconds`.
- `enrollments` (unique `user_id, course_id`; `completed_at`,
  `last_accessed_lesson_id`) and `lesson_progress` (unique `user_id,
  lesson_id`) already exist and are queried by `lib/progress/queries.ts`
  (`getCourseProgress`, `getEnrollment`). Both tables are currently empty.
- `payments` exists but is simulation-only and empty.
- The home page renders `CourseCatalog` -> `CourseCard` from
  `components/courses/`.
- A `/search` page exists (`app/[locale]/search/page.tsx`) doing ILIKE search
  over the `search_documents` view, returning course AND lesson hits.
- No `category` column on `courses`; no reviews/ratings table anywhere.
- Roles are in `user_roles` (instructor|student); admin gate is
  `private.is_admin()`. Anon + authenticated may SELECT published
  courses/lessons. `profiles` PK is `user_id`.
- Migrations are sequential `000N_*.sql`; next is `0004`. Generated types at
  `lib/supabase/database.types.ts` (regen via Supabase MCP).

Non-negotiables enforced by gates (apply to every batch):

- EN + HE message catalogs stay key-identical (`npm run lint:i18n`). Real
  Hebrew, RTL via Tailwind logical utilities.
- Every page: `<main id="main-content">`, semantic landmarks, exactly one
  `<h1>`. Links from `@/i18n/navigation`.
- Tier-2 forms are full no-JS: real `<form>` + `type="submit"` +
  `<label for>`, `FormData` server action, `?error=`/`?notice=` query-param
  feedback channel resolved to a localized banner.
- Every page and every element on it (heroes, cards, rating stars, progress
  bars, filter bars, category chips, search inputs, sort controls, forms, and
  the contact/map blocks) is responsive and mobile-first: base styles target
  narrow screens with `sm:`/`md:`/`lg:` overrides upward; flex children shrink
  (`min-w-0`), fixed controls stay `shrink-0`, button/filter rows wrap
  (`flex-wrap`), long strings break, and layout uses logical RTL utilities.
  The measurable contract: no horizontal overflow at 390 / 768 / 1280 px in
  EN (LTR) and HE (RTL). Follow `docs/RESPONSIVE.md`.
- RLS, admin guards, and secret handling must not be weakened. Server-only
  modules carry `import "server-only"`.
- Full gate run per batch: `lint`, `lint:i18n`, `typecheck`, `test`,
  `test:e2e`.

## Decisions

- **Ratings/categories are real schema** (not seeded columns): a `categories`
  table + `courses.category_id`, and a `course_reviews` table with a write
  path for enrolled students.
- **My Courses + progress bar use real tables** (`enrollments`,
  `lesson_progress`).
- **`/courses` replaces `/search`**: `/search` redirects to `/courses`.
- **Sorts:** Most popular (enrollment count), Highest rated (avg rating),
  Newest (created_at). "Most purchased" was considered and dropped as
  redundant with Most popular; `course_popularity` exposes only
  `enrollment_count` (no `paid_count`).
- **Lesson-level search is scoped to a single course**: it lives on the course
  detail page (`/courses/[slug]`), not in the global catalog. The catalog
  searches courses only. This supersedes the lesson hits that `/search`
  previously returned globally.
- **Review write path is included** (Tier-2 no-JS form on the course detail
  page), gated to enrolled students.

## Batch Decomposition

Split smallest-blast-radius first; schema isolated in its own batch (mirrors
how batch 02 isolated schema). Each batch is independently releasable.

### Batch 16 - About + Contact content pages

No DB. Two new server-component routes under `app/[locale]/`.

- `app/[locale]/about/page.tsx` - hero region with a clearly marked
  placeholder image slot and placeholder copy (real content/hero supplied
  later); semantic structure, one `<h1>`, `About` i18n namespace.
- `app/[locale]/contact/page.tsx` - fake Tel-Aviv contact block (address on
  Rothschild Blvd, Israeli-format phone, email, hours), a static map image
  placeholder, and a Tier-2 no-JS contact form.
- Contact form server action: `lib/contact/actions.ts#submitContactMessage`
  (validated via a new Zod schema in `lib/validation/contact.ts`;
  `?notice=`/`?error=` feedback). No email send required - log/queue the
  message server-side (consistent with how reminders queued before a provider
  existed); the message body is validated and acknowledged. If reuse of the
  existing `lib/email/transport.ts` is trivial it may forward the message, but
  that is optional and must not block the batch.
- Header + footer: add `About`, `Contact`, `Courses` nav links in
  `components/site-header.tsx` (textLinks + drawerLinks) and the footer.
- New `About` + `Contact` i18n namespaces in both catalogs. New e2e coverage
  for the two routes (no-overflow + RTL + form-present).

### Batch 17 - Catalog schema: categories + reviews + aggregate views + seed

DB only. Migration `0004_catalog_categories_and_reviews.sql`.

- `categories` (`id` uuid PK, `slug` text unique, `name_en` text, `name_he`
  text, `sort_order` int, timestamps).
- `courses.category_id` uuid NULL REFERENCES `categories(id)` ON DELETE SET
  NULL. Indexed.
- `course_reviews` (`id` uuid PK, `course_id` uuid FK -> courses ON DELETE
  CASCADE, `user_id` uuid FK -> profiles(user_id) ON DELETE CASCADE, `rating`
  smallint CHECK 1..5, `body` text NULL, `created_at`, `updated_at`, UNIQUE
  (`course_id`, `user_id`)).
- View `course_ratings` (`course_id`, `rating_average` numeric,
  `rating_count` int), `security_invoker = true`, aggregating published-course
  reviews.
- View `course_popularity` (`course_id`, `enrollment_count` int),
  `security_invoker = true`, derived from `enrollments`. No `paid_count`.
- RLS: `categories` SELECT for anon + authenticated. `course_reviews` SELECT
  for anon + authenticated (public ratings); INSERT/UPDATE own-row only
  (`user_id = auth.uid()`) AND only when an `enrollments` row exists for that
  `(user_id, course_id)`; admins (`private.is_admin()`) full access.
- Seed: create a small set of categories (e.g. Web Development, JavaScript,
  Frontend, Fundamentals); assign `category_id` to the 2 existing seeded
  courses; seed a realistic spread of `course_reviews`; seed enough
  `enrollments` rows that "Most popular" is non-degenerate. Seed is idempotent
  (ON CONFLICT / guarded inserts) and references existing seeded user ids.
- Regenerate `lib/supabase/database.types.ts`. No UI.

### Batch 18 - `/courses` catalog page + domain

The core batch.

- Domain: `lib/catalog/queries.ts#getCatalog({ q, categorySlug, mine, sort,
  userId })` (server-only) - one query joining `courses` (published) +
  `course_lesson_counts` + `course_ratings` + `course_popularity` +
  `categories`; applies category filter, ILIKE course search, My-Courses
  filter (inner-join `enrollments` for `userId`), and sort (popular | rated |
  newest). When `userId` is present, left-join enrollment + compute progress
  percent per enrolled course (reuse `lib/progress/calculate.ts`).
  `lib/catalog/queries.ts#getCategories()` returns the category list for the
  filter UI.
- DTO: extend or wrap `CourseSummary` into a `CatalogCourse` adding
  `categorySlug`, `categoryName`, `ratingAverage`, `ratingCount`,
  `enrollmentCount`, and optional `progressPercent` / `isEnrolled`. Mapper in
  `lib/catalog/types.ts`.
- Validation: `lib/validation/catalog.ts` Zod schema for the query params
  (`q` string, `category` slug, `sort` enum, `mine` boolean) parsed via
  `parseWithSchema`.
- Page `app/[locale]/courses/page.tsx` (server component): category
  chips/tabs, a search input, a sort `<select>`, and a "My Courses" toggle.
  All state in URL query params (`?q=&category=&sort=&mine=1`) so it is no-JS
  navigable and shareable. Anonymous users: "My Courses" hidden or disabled
  (no enrollment context).
- `components/courses/course-card.tsx` (and/or a `catalog-course-card`): add a
  star-rating display (average + count) and, when enrolled, an inline
  `<Progress>` bar showing `progressPercent`. Must keep the home-page usage
  working (home renders the simpler card).
- `components/catalog/` filter components (category filter, sort control,
  my-courses toggle, search box) - kebab-case, server-rendered where possible;
  client islands only where interaction requires it, with no-JS fallback via
  the form/links.
- Redirect: `/search` -> `/courses` (preserve `?q=` as the catalog search
  term). Remove or fold the old search page; note the lesson-search reduction
  (now in-course only, batch 19) in the implementation log.
- i18n: new `Catalog` namespace (filters, sorts, ratings, my-courses, empty,
  category names fall back to `name_en`/`name_he` from DB).
- Tests: unit for `getCatalog` filter/sort logic (mocked Supabase), e2e
  extending `e2e/catalog.spec.ts` for no-overflow/RTL + each filter/sort +
  My-Courses gating.

### Batch 19 - Course-detail: review write path + in-course lesson search

Both touch `app/[locale]/courses/[courseSlug]/page.tsx`.

- Review write path: `lib/courses/actions.ts#submitReview` (server action;
  auth + enrollment gated, validated via `lib/validation/course.ts` review
  schema, idempotent upsert on unique `(course_id, user_id)`, `?notice=`/
  `?error=` feedback). A review form + review list component under
  `components/courses/` shown on the course detail page; the form renders only
  for enrolled students, the list is public.
- In-course lesson search: a search box on the course detail page that filters
  that course's lessons by title/description (client-side filter over the
  already-loaded lesson list is acceptable since a course's lessons are
  bounded and already fetched; if server search is preferred, a scoped
  `lib/courses/queries.ts` helper filtered by `course_id`). This replaces the
  global lesson search that `/search` used to provide.
- i18n: new keys under `Course` (reviews, lesson-search) in both catalogs.
- Tests: unit/integration for `submitReview` gating (anon -> fail, enrolled ->
  upsert, non-enrolled -> fail) and the lesson-search filter; e2e for the form
  presence + gating and the lesson-search box.

## File Structure (created / modified)

Batch 16:

- Create `app/[locale]/about/page.tsx`, `app/[locale]/contact/page.tsx`,
  `lib/contact/actions.ts`, `lib/validation/contact.ts`,
  `components/contact/contact-form.tsx`.
- Modify `components/site-header.tsx`, `components/site-footer.tsx`,
  `messages/en-US.json`, `messages/he-IL.json`, `e2e/*`.

Batch 17:

- Create `supabase/migrations/0004_catalog_categories_and_reviews.sql`.
- Modify `lib/supabase/database.types.ts` (regenerated).

Batch 18:

- Create `lib/catalog/queries.ts`, `lib/catalog/types.ts`,
  `lib/validation/catalog.ts`, `app/[locale]/courses/page.tsx`,
  `components/catalog/*` (filters), possibly
  `components/courses/catalog-course-card.tsx`.
- Modify `components/courses/course-card.tsx`,
  `app/[locale]/search/page.tsx` (-> redirect), `lib/proxy.ts` or route as
  needed for the redirect, `messages/*`, `e2e/catalog.spec.ts`.

Batch 19:

- Create `components/courses/review-form.tsx`,
  `components/courses/review-list.tsx`,
  `components/courses/lesson-search.tsx`.
- Modify `lib/courses/actions.ts`, `lib/validation/course.ts`,
  `app/[locale]/courses/[courseSlug]/page.tsx`, `messages/*`, `e2e/*`.

## Cross-Cutting Per-Batch Footer

Every prompt ends with the same operational rules: append to
`docs/planning/IMPLEMENTATION_LOG.md` (schema/product decisions), keep EN+HE
key-identical, preserve RLS/guards/secrets, server-only boundaries, run the
full gate set, and update the `academy-build-state` memory. Worktrees are
siblings `../academy-NN-<slug>`, branch `<prefix>/NN-<slug>`, squash-merge to
local `main`, push authorized for this build run.

## Coverage Check

| Requirement | Batch |
| --- | --- |
| About page (content/hero deferred, structured shell) | 16 |
| Contact page, fake Tel-Aviv details | 16 |
| Contact no-JS form | 16 |
| Nav links for new pages | 16 |
| Courses page showing catalog like home | 18 |
| Categories | 17 (data) + 18 (UI) |
| Course-level search | 18 |
| Filters incl. My Courses | 18 |
| In-card progress bar for enrolled courses | 17 (data) + 18 (UI) |
| Ratings (popularity = enrollments, highest rated, newest) | 17 (data) + 18 (sorts) |
| Review write path | 19 |
| Lesson-level search within a course | 19 |
| EN+HE, RTL, a11y, responsive, RLS, tests | all |

## Out Of Scope / Deferred

- Real About copy and hero image (user supplies later; batch 16 leaves
  single-edit-point slots).
- Real email delivery of contact messages (queue/log only, like early
  reminders).
- Pagination / infinite scroll of the catalog (current course count is tiny;
  add when the catalog grows).
- Per-category landing pages and review moderation UI.
