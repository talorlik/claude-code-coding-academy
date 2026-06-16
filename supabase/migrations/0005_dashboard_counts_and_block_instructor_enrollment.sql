-- 0005_dashboard_counts_and_block_instructor_enrollment.sql
--
-- Fixes the inflated admin-dashboard counts (issues #2, #3) and blocks the
-- instructor account from ever enrolling (issue #3), all at the DB layer so the
-- JS data access never has to filter fetched rows.
--
-- Three parts:
--   1. security-definer RPCs that compute the dashboard counts/completion
--      breakdown EXCLUDING any enroller who holds the instructor role. They are
--      gated internally by private.is_admin() (the same instructor==admin
--      mapping used by RLS) so only an instructor caller gets data.
--   2. an RLS WITH CHECK on enrollments INSERT that denies a row whose
--      inserting user holds the instructor role, plus a DELETE of the existing
--      instructor-owned enrollment rows.
--
-- The instructor==admin mapping and the (select private.is_admin()) initplan
-- pattern follow migration 0003.

-- ---------------------------------------------------------------------------
-- 1. Dashboard count RPCs (instructor-excluded), security definer
-- ---------------------------------------------------------------------------

-- Overview counts: distinct non-instructor enrollers, non-instructor enrollment
-- rows, and the completed subset of those rows. Returns a single row. The
-- function runs as its owner (security definer) so the aggregate spans all
-- enrollments regardless of the caller's per-row RLS, but it returns nothing
-- unless the caller is an admin (instructor), matching the dashboard's gating.
create or replace function public.admin_overview_counts()
returns table (
  student_count    bigint,
  enrollment_count bigint,
  completed_count  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(distinct e.user_id)                                  as student_count,
    count(*)                                                   as enrollment_count,
    count(*) filter (where e.completed_at is not null)         as completed_count
  from public.enrollments e
  where private.is_admin()
    and not exists (
      select 1
      from public.user_roles ur
      where ur.user_id = e.user_id
        and ur.role = 'instructor'
    );
$$;

-- Per-course completion breakdown with the same instructor exclusion. One row
-- per course that has at least one non-instructor enrollment.
create or replace function public.admin_course_completion_counts()
returns table (
  course_id         uuid,
  course_title      text,
  course_slug       text,
  total_enrollments bigint,
  completed_enrollments bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id    as course_id,
    c.title as course_title,
    c.slug  as course_slug,
    count(*)                                            as total_enrollments,
    count(*) filter (where e.completed_at is not null)  as completed_enrollments
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where private.is_admin()
    and not exists (
      select 1
      from public.user_roles ur
      where ur.user_id = e.user_id
        and ur.role = 'instructor'
    )
  group by c.id, c.title, c.slug
  order by c.id;
$$;

-- These are on the public REST RPC surface (callers reach them through the
-- request-scoped PostgREST client). anon never needs dashboard data; only
-- authenticated callers, and the body re-checks private.is_admin().
revoke execute on function public.admin_overview_counts() from public, anon;
revoke execute on function public.admin_course_completion_counts() from public, anon;
grant execute on function public.admin_overview_counts() to authenticated;
grant execute on function public.admin_course_completion_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Block instructor enrollment (RLS WITH CHECK) + cleanup
-- ---------------------------------------------------------------------------

-- private.is_instructor_self() answers "does the CURRENT user hold the
-- instructor role" for use inside an RLS WITH CHECK. is_admin() already does
-- exactly this (instructor==admin); a thin alias keeps the policy intent
-- self-documenting at the call site.
create or replace function private.is_instructor_self()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_admin();
$$;

revoke execute on function private.is_instructor_self() from public, anon;
grant execute on function private.is_instructor_self() to authenticated;

-- Tighten the student INSERT policy so an instructor account cannot create an
-- enrollment row. The existing "Students can insert own enrollments" policy
-- only checks ownership; replace it with one that also denies instructor-role
-- inserters. (A user owns the row AND is not an instructor.)
drop policy if exists "Students can insert own enrollments" on public.enrollments;
create policy "Students can insert own enrollments"
on public.enrollments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and not (select private.is_instructor_self())
);

-- Remove the existing instructor-owned enrollment rows that inflated the counts.
delete from public.enrollments e
where exists (
  select 1
  from public.user_roles ur
  where ur.user_id = e.user_id
    and ur.role = 'instructor'
);
