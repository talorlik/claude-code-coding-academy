-- RLS isolation checks.
-- Run these in the Supabase SQL editor (Dashboard -> SQL Editor).
-- Each block uses a transaction + SET LOCAL so the role revert is automatic.
-- Expected results are in the comments; actual counts from a fresh seed are
-- shown in the Batch 2 section of docs/planning/IMPLEMENTATION_LOG.md.
--
-- IMPORTANT: SET LOCAL role = 'anon'/'authenticated' simulates PostgREST's
-- role-switching, not the raw Postgres superuser context. The checks work
-- in the Supabase Dashboard SQL editor because it executes as postgres
-- (superuser) and can SET LOCAL role. They do NOT work inside application
-- code (the server client already runs as authenticated/service_role).

-- ---------------------------------------------------------------------------
-- 1. Anon can see published courses, not unpublished.
-- Expected: count = 2 (both seeded courses are 'published').
-- ---------------------------------------------------------------------------
begin;
  set local role anon;
  select count(*) as anon_courses_published from public.courses;
  -- Expected: 2
rollback;

-- ---------------------------------------------------------------------------
-- 2. Anon cannot see enrollments (no policy for anon on enrollments).
-- Expected: count = 0.
-- ---------------------------------------------------------------------------
begin;
  set local role anon;
  select count(*) as anon_enrollments from public.enrollments;
  -- Expected: 0
rollback;

-- ---------------------------------------------------------------------------
-- 3. Random authenticated user sees no enrollments (own-row isolation).
-- Expected: count = 0 (no enrollment for this UUID).
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  select count(*) as auth_enrollments_random_user from public.enrollments;
  -- Expected: 0
rollback;

-- ---------------------------------------------------------------------------
-- 4. Authenticated user sees same published courses as anon.
-- Expected: count = 2.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  select count(*) as auth_courses_published from public.courses;
  -- Expected: 2
rollback;

-- ---------------------------------------------------------------------------
-- 5. Anon can read active prices for published courses.
-- Expected: count = 1 (only the JS course has a price row).
-- ---------------------------------------------------------------------------
begin;
  set local role anon;
  select count(*) as anon_active_prices from public.course_prices;
  -- Expected: 1
rollback;

-- ---------------------------------------------------------------------------
-- 6. Authenticated user cannot see reminder_events (no student policy).
-- Expected: count = 0.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  select count(*) as auth_reminder_events from public.reminder_events;
  -- Expected: 0
rollback;

-- ---------------------------------------------------------------------------
-- 7. Authenticated user cannot see class groups they are not a member of.
-- Expected: count = 0 (random UUID has no memberships).
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  select count(*) as auth_class_groups from public.class_groups;
  -- Expected: 0
rollback;

-- ---------------------------------------------------------------------------
-- 8. Anon can see published lessons.
-- Expected: count = 6 (3 lessons * 2 published courses).
-- ---------------------------------------------------------------------------
begin;
  set local role anon;
  select count(*) as anon_lessons from public.lessons;
  -- Expected: 6
rollback;

-- ---------------------------------------------------------------------------
-- 9. search_documents view returns published content for anon.
-- Expected: count >= 8 (2 courses + 6 lessons).
-- ---------------------------------------------------------------------------
begin;
  set local role anon;
  select count(*) as anon_search_documents from public.search_documents;
  -- Expected: 8
rollback;
