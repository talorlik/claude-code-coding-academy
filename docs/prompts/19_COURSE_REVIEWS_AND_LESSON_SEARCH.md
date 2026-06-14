# Prompt: Course Reviews And In-Course Lesson Search

```text
On the course detail page, add a review write path for enrolled students and a
lesson-level search scoped to the current course.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md (Batch 19).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Batch 17 created course_reviews (UNIQUE course_id,user_id; rating 1-5; body
  nullable) with RLS that allows INSERT/UPDATE only on the own row AND only
  when an enrollments row exists for that (user_id, course_id). Public SELECT
  is allowed. The course_ratings view aggregates these.
- The course detail page is app/[locale]/courses/[courseSlug]/page.tsx (public,
  ?lesson=<slug> selection). It already loads the course and its full lesson
  list. lib/progress/queries.ts exposes getEnrollment; enrollment gating is an
  established pattern from batch 06.
- Server actions validate through parseWithSchema and return ActionResult; the
  ?notice=/?error= query-param channel surfaces localized feedback (Tier-2
  no-JS form pattern). lib/courses/actions.ts already holds enrollInCourse.
- New strings go in BOTH messages catalogs, key-identical (lint:i18n), real
  Hebrew, RTL via logical utilities. The course detail page uses the "Course"
  i18n namespace.

Requirements:
1. Review write path:
   - lib/validation/course.ts: add a review schema (rating int 1-5 required;
     body optional string with a sane max length; course id).
   - lib/courses/actions.ts#submitReview: server action, auth-gated (anon ->
     fail "signInRequired"), enrollment-gated (must have an enrollments row for
     the course -> else fail), validated via parseWithSchema, performing an
     idempotent upsert on the unique (course_id, user_id) so a student can edit
     their existing review. Return success/failure through ?notice=/?error=.
     Use the RLS request client (the DB policy already enforces enrolled +
     own-row); never service-role.
   - components/courses/review-form.tsx: a Tier-2 no-JS form (real <form>,
     <label for> rating control and message field, type="submit") rendered on
     the course detail page ONLY for signed-in, enrolled students. Pre-fill the
     student's existing review when present (edit mode).
   - components/courses/review-list.tsx: a public list of the course's reviews
     (rating + optional body + reviewer display where available), with an
     average + count summary. Reads via an RLS-safe query helper (add to
     lib/courses/queries.ts if needed, e.g. getCourseReviews(courseId)).
2. In-course lesson search:
   - components/courses/lesson-search.tsx: a search box on the course detail
     page that filters THIS course's lessons by title (and description if
     available). The course's lessons are already loaded and bounded, so a
     client-side filter over the in-memory lesson list is acceptable; it must
     degrade to showing the full lesson list with no JS. If you prefer a
     server round-trip, add a course-scoped helper to lib/courses/queries.ts
     filtered by course_id - do not reintroduce a global cross-course search.
   - This replaces the lesson hits that the old global /search returned.
3. Add EN/HE translations for every new string (reviews + lesson-search keys
   under the "Course" namespace), key-identical.
4. Add TSDoc for submitReview, the review schema, and any new query helper.
5. Tests:
   - Unit/integration for submitReview gating: anon -> fail; signed-in but not
     enrolled -> fail; enrolled -> upsert succeeds and is idempotent on the
     unique constraint. Use the working mocked Supabase builder pattern
     ({ ...builder } with then:(resolve:(v:unknown)=>unknown), not a strict
     index signature).
   - Unit for the lesson-search filter (matches title/description, empty query
     shows all).
   - e2e: review form is present and gated (enrolled vs not), and the
     in-course lesson-search box filters the lesson list. No horizontal
     overflow at 390/768/1280 in EN+HE.
   - Run typecheck to its exit code; do not trust a tail of the log.
6. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state
   memory (review write path + enrollment gating, lesson-search relocation).

Rules:
- Do not weaken RLS or the enrollment gate; submitReview relies on the DB
  policy (enrolled + own-row) and re-checks enrollment in the action. Never use
  the service-role client for reviews.
- The review form renders only for enrolled, signed-in students; the review
  list is public.
- Do not reintroduce a global cross-course lesson search; lesson search is
  scoped to the current course only.
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm test, and
  npm run test:e2e. All gates must exit 0.
- Worktree is a sibling ../academy-19-reviews-lesson-search, branch
  feature/19-reviews-lesson-search; squash-merge into local main when green.
```
