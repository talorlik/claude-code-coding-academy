# Prompt: Catalog Schema - Categories And Reviews

```text
Add the database foundation for a Udemy-style course catalog: categories,
course reviews/ratings, and aggregate views. Database only - no UI in this
batch.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md (Batch 17).
- Existing schema + RLS conventions: supabase/migrations/0001-0003,
  docs/planning/IMPLEMENTATION_LOG.md, the academy-build-state memory.

Context:
- Migrations are sequential 000N_*.sql; the next file is
  0004_catalog_categories_and_reviews.sql.
- Roles live in user_roles (instructor|student). The admin RLS gate is
  private.is_admin() (checks instructor role). profiles PK is user_id; all
  FKs reference profiles(user_id).
- Anon + authenticated may SELECT published courses/lessons/active prices;
  all private tables are own-row only. New public-catalog data (categories,
  ratings) follows the same anon-readable pattern.
- enrollments (unique user_id,course_id) and payments already exist; both are
  currently empty. The seed in batch 02 created 2 published courses and 2 users
  (instructor + student) - reference those existing ids in the seed.
- Generated types live at lib/supabase/database.types.ts and are regenerated
  via the Supabase MCP generate_typescript_types tool.

Requirements:
1. Create a categories table: id uuid PK default gen_random_uuid(), slug text
   UNIQUE NOT NULL, name_en text NOT NULL, name_he text NOT NULL, sort_order
   int NOT NULL default 0, created_at/updated_at timestamptz default now().
2. Add courses.category_id uuid NULL REFERENCES categories(id) ON DELETE SET
   NULL, with a supporting index.
3. Create a course_reviews table: id uuid PK, course_id uuid NOT NULL
   REFERENCES courses(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES
   profiles(user_id) ON DELETE CASCADE, rating smallint NOT NULL CHECK
   (rating BETWEEN 1 AND 5), body text NULL, created_at/updated_at timestamptz
   default now(), UNIQUE (course_id, user_id). Index course_id.
4. Create view course_ratings (course_id, rating_average numeric,
   rating_count int) with security_invoker = true, aggregating course_reviews
   for published courses. Create view course_popularity (course_id,
   enrollment_count int) with security_invoker = true, derived from
   enrollments. Do NOT add a paid_count column (the "Most purchased" sort was
   dropped).
5. Enable RLS and add policies:
   - categories: SELECT to anon + authenticated; full access to
     private.is_admin().
   - course_reviews: SELECT to anon + authenticated (public ratings).
     INSERT and UPDATE restricted to own row (user_id = auth.uid()) AND only
     when an enrollments row exists for that (user_id, course_id). DELETE
     own-row or admin. private.is_admin() has full access.
   - Keep all existing policies intact.
6. Seed (idempotent - ON CONFLICT DO NOTHING / guarded inserts):
   - A small set of categories (e.g. Web Development, JavaScript, Frontend,
     Fundamentals) with EN+HE names and sort_order.
   - Assign category_id to the two existing seeded courses.
   - A realistic spread of course_reviews for the seeded courses (varied
     ratings 1-5, some with body text) referencing existing seeded user ids.
     If only one student user exists, create the reviews under the available
     seeded user(s) without violating the unique constraint; document the
     limitation in the log.
   - Enough enrollments rows that the "Most popular" sort is non-degenerate,
     referencing existing seeded users and courses, idempotently.
7. Regenerate lib/supabase/database.types.ts via the Supabase MCP and verify
   typecheck passes with the new tables/views.
8. Add TSDoc-level comments in the migration explaining each policy and view.
9. Update docs/planning/IMPLEMENTATION_LOG.md (new tables, views, RLS, seed
   decisions, the dropped paid_count) and the academy-build-state memory.

Rules:
- Apply the migration via the Supabase MCP apply_migration against the linked
  project; verify with list_tables and get_advisors (resolve any new
  security/RLS advisors the migration introduces).
- Do not weaken or drop any existing RLS policy. Views must use
  security_invoker = true so RLS still applies through them.
- Do not expose service-role access in any policy; reviews insert/update is
  gated by enrollment, not by service role.
- No UI, no domain DTOs, no components in this batch - schema, RLS, seed, and
  regenerated types only.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm test, and
  npm run test:e2e. All gates must exit 0 (existing tests must still pass with
  the regenerated types).
- Worktree is a sibling ../academy-17-catalog-schema, branch
  feature/17-catalog-schema; squash-merge into local main when green.
```
