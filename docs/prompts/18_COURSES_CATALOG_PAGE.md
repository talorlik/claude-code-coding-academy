# Prompt: Courses Catalog Page

```text
Build the Udemy-style /courses catalog: category filter, course-level search,
sorts, a "My Courses" filter, star ratings, and an in-card progress bar for
enrolled courses. Replace the old /search page with a redirect to /courses.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md (Batch 18).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Batch 17 added: categories table, courses.category_id, course_reviews,
  the course_ratings and course_popularity views, and regenerated
  lib/supabase/database.types.ts. enrollments and lesson_progress already
  exist and are queried by lib/progress/queries.ts (getCourseProgress,
  getEnrollment). lib/progress/calculate.ts is a PURE percent calculator.
- Courses domain: getPublishedCourses() in lib/courses/queries.ts joins the
  course_lesson_counts view; CourseSummary DTO + toCourseSummary() in
  lib/courses/types.ts. Validation helpers live in lib/validation/* and parse
  through parseWithSchema returning ActionResult.
- The home page renders components/courses/course-catalog.tsx ->
  course-card.tsx. The home card must keep working unchanged.
- An existing /search page (app/[locale]/search/page.tsx) does global ILIKE
  search over search_documents and returns course AND lesson hits. This batch
  replaces it with the catalog; lesson-level search moves to the course detail
  page in the next batch (do NOT build lesson search here).
- Pages are server components (setRequestLocale + getTranslations, one
  <main id="main-content">, one <h1>); links from @/i18n/navigation. New
  strings go in BOTH messages catalogs, key-identical (lint:i18n gate), real
  Hebrew, RTL via logical utilities.

Requirements:
1. Domain (server-only, import "server-only"):
   - lib/catalog/queries.ts#getCatalog({ q, categorySlug, mine, sort, userId })
     returning a CatalogCourse[] DTO. One query over published courses joined
     with course_lesson_counts, course_ratings, course_popularity, and
     categories. Apply: category filter (by slug), course-level ILIKE search on
     title/description for q, My-Courses filter (only courses the given userId
     is enrolled in - inner join enrollments), and sort by one of:
       popular  -> course_popularity.enrollment_count desc
       rated    -> course_ratings.rating_average desc (nulls last)
       newest   -> courses.created_at desc
   - When userId is present, also surface per-course enrollment + progress:
     compute progressPercent via lib/progress/calculate.ts and set isEnrolled.
   - lib/catalog/queries.ts#getCategories() -> the category list (id, slug,
     localized name) for the filter UI.
   - lib/catalog/types.ts: CatalogCourse extends the CourseSummary fields with
     categorySlug, categoryName, ratingAverage (number|null), ratingCount,
     enrollmentCount, progressPercent (number|null), isEnrolled (boolean), via
     a toCatalogCourse mapper.
2. Validation: lib/validation/catalog.ts Zod schema for the query params
   (q: optional string; category: optional slug; sort: enum
   ["popular","rated","newest"] default "popular"; mine: boolean). Parse the
   incoming searchParams through parseWithSchema; invalid values fall back to
   defaults rather than erroring.
3. Page app/[locale]/courses/page.tsx (server component):
   - A category filter (chips or tabs), a search input, a sort control
     (<select> or links), and a "My Courses" toggle.
   - ALL filter state lives in URL query params (?q=&category=&sort=&mine=1)
     so the page is no-JS navigable and shareable. Submitting search and
     toggling filters works without client JS (real form/links that set query
     params); a client island may enhance UX but must degrade gracefully.
   - "My Courses" is hidden or disabled for anonymous users (no enrollment
     context). When mine=1 and signed in, only enrolled courses show.
   - Render the grid of cards mirroring the home catalog layout (1/2/3 cols),
     with loading via Suspense + skeleton and empty/error via
     components/ui/empty.
4. Cards: extend components/courses/course-card.tsx (or add
   components/courses/catalog-course-card.tsx) to show a star-rating display
   (average + count) and, when isEnrolled, an inline progress bar
   (components/ui/progress) bound to progressPercent. The home page card must
   continue to render correctly (no rating/progress required there).
   - Every page and every element (cards, rating stars, progress bar, filter
     bar, category chips, search input, sort control) must be responsive and
     mobile-first: base styles target narrow screens with sm:/md:/lg: overrides
     upward; let flex children shrink (min-w-0), keep fixed controls shrink-0,
     wrap filter/button rows (flex-wrap), break long strings, and use logical
     RTL utilities. No horizontal overflow at 390/768/1280 in EN (LTR) and HE
     (RTL). Follow docs/RESPONSIVE.md.
5. Filter components under components/catalog/ (kebab-case): category filter,
   sort control, my-courses toggle, search box. Prefer server rendering;
   client islands only where interaction needs them, each with a no-JS
   fallback. The filter row must wrap and remain usable on a 390px viewport in
   both LTR and RTL.
6. Replace /search: redirect app/[locale]/search to /courses, preserving an
   incoming ?q= as the catalog search term. Remove the now-unused global
   search page/UI (keep lib/search/* only if still referenced; otherwise note
   its removal/retention in the log). Do not break existing links to /search
   (the redirect handles them).
7. Add EN/HE translations for every new string (a new "Catalog" namespace),
   key-identical. Category display names come from the DB (name_en/name_he);
   the active locale selects which.
8. Add TSDoc for getCatalog, getCategories, the DTO mapper, and the schema.
9. Tests: unit tests for getCatalog filter/sort behavior (mocked Supabase
   builder - use the working { ...builder } pattern with
   then:(resolve:(v:unknown)=>unknown), NOT a strict index signature). Extend
   e2e/catalog.spec.ts: no horizontal overflow at 390/768/1280 in EN+HE on
   /courses, each sort and the category filter change the result set, search
   filters, and My-Courses is gated by auth. Run typecheck to its exit code
   (do not trust a tail of the log).
10. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state
    memory (catalog query shape, /search replacement, lesson-search deferral).

Rules:
- Do not weaken RLS; getCatalog runs through the RLS request client so only
  published courses and permitted reviews are visible. My-Courses must rely on
  enrollments + auth.uid(), never service-role.
- Do not build lesson-level search in this batch; it belongs to the course
  detail page in the next batch.
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs.
- Keep the home page catalog working; do not regress the existing course-card
  usage or the responsive/RTL contract.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm test, and
  npm run test:e2e. All gates must exit 0.
- Worktree is a sibling ../academy-18-courses-catalog, branch
  feature/18-courses-catalog; squash-merge into local main when green. If the
  merge changes package.json/package-lock.json, reconcile deps on main before
  re-running gates; clear a stale .next if routes moved.
```
