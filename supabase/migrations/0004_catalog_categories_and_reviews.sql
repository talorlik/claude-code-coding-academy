-- Catalog schema: categories, course reviews/ratings, and aggregate views.
--
-- Batch 17 of the courses-catalog design
-- (docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md).
-- Database only - no UI, no domain DTOs. Adds the data foundation the /courses
-- catalog (batch 18) and the review write path (batch 19) build on.
--
-- Conventions carried from 0003: sequential migration naming; admin gate is
-- (select private.is_admin()) (instructor == admin) wrapped in a subselect for
-- initplan caching; views use security_invoker = true so the underlying-table
-- RLS still applies through them; anon needs an explicit grant select on the
-- intentionally-public catalog tables. All FKs to a user reference
-- profiles(user_id) (its PK), never profiles(id).

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid        primary key default gen_random_uuid(),
  slug       text        not null unique,
  name_en    text        not null,
  name_he    text        not null,
  sort_order integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_sort_order_idx on public.categories (sort_order);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- courses.category_id: optional category per course. ON DELETE SET NULL so
-- removing a category never deletes courses; the course just becomes
-- uncategorized. Indexed for the catalog's category filter.
-- ---------------------------------------------------------------------------
alter table public.courses
  add column if not exists category_id uuid
    references public.categories (id) on delete set null;

create index courses_category_id_idx on public.courses (category_id);

-- ---------------------------------------------------------------------------
-- course_reviews: one review per (course, user), rating 1-5, optional body.
-- The unique (course_id, user_id) constraint makes the batch-19 review write
-- path an idempotent upsert (a student edits rather than duplicates).
-- ---------------------------------------------------------------------------
create table public.course_reviews (
  id         uuid        primary key default gen_random_uuid(),
  course_id  uuid        not null
    references public.courses (id) on delete cascade,
  user_id    uuid        not null
    references public.profiles (user_id) on delete cascade,
  rating     smallint    not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create index course_reviews_course_id_idx on public.course_reviews (course_id);

create trigger course_reviews_set_updated_at
before update on public.course_reviews
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Enable RLS on the new tables.
-- ---------------------------------------------------------------------------
alter table public.categories     enable row level security;
alter table public.course_reviews enable row level security;

-- ---------------------------------------------------------------------------
-- Explicit grants: anon does not get SELECT on new public-schema tables by
-- default in this project's setup (mirrors the courses/lessons/course_prices
-- grants in 0003). Categories and review ratings are intentionally public.
-- ---------------------------------------------------------------------------
grant select on public.categories     to anon, authenticated;
grant select on public.course_reviews to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: categories
--   Public read; admin full CRUD.
-- ---------------------------------------------------------------------------
create policy "Categories visible to everyone"
on public.categories
for select
to anon, authenticated
using (true);

create policy "Admins can insert categories"
on public.categories
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update categories"
on public.categories
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete categories"
on public.categories
for delete
to authenticated
using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- RLS: course_reviews
--   Public read (ratings are public). A student may INSERT/UPDATE only their
--   own row AND only when an enrollments row exists for that
--   (user_id, course_id) - so only enrolled students can review. DELETE is
--   own-row. Admins have full access. This mirrors the DB-enforced gate the
--   batch-19 submitReview action relies on (the action re-checks too).
-- ---------------------------------------------------------------------------
create policy "Course reviews visible to everyone"
on public.course_reviews
for select
to anon, authenticated
using (true);

create policy "Enrolled students can insert own review"
on public.course_reviews
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.enrollments e
    where e.user_id = course_reviews.user_id
      and e.course_id = course_reviews.course_id
  )
);

create policy "Enrolled students can update own review"
on public.course_reviews
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.enrollments e
    where e.user_id = course_reviews.user_id
      and e.course_id = course_reviews.course_id
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.enrollments e
    where e.user_id = course_reviews.user_id
      and e.course_id = course_reviews.course_id
  )
);

create policy "Students can delete own review"
on public.course_reviews
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Admins can select all course reviews"
on public.course_reviews
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can insert course reviews"
on public.course_reviews
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update course reviews"
on public.course_reviews
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete course reviews"
on public.course_reviews
for delete
to authenticated
using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Views (security_invoker = true: the caller's RLS on the underlying tables
-- applies through the view).
-- ---------------------------------------------------------------------------

-- course_ratings: average rating and review count per published course.
-- Restricted to published courses so the catalog never surfaces ratings for
-- draft/archived courses. rating_average is null when a course has no reviews.
create or replace view public.course_ratings
with (security_invoker = true)
as
select
  c.id                                  as course_id,
  round(avg(r.rating)::numeric, 2)      as rating_average,
  count(r.id)::int                      as rating_count
from public.courses c
left join public.course_reviews r on r.course_id = c.id
where c.status = 'published'
group by c.id;

-- course_popularity: enrollment count per published course, the "Most popular"
-- sort key. No paid_count column - the "Most purchased" sort was dropped as
-- redundant with Most popular (design spec, Decisions).
create or replace view public.course_popularity
with (security_invoker = true)
as
select
  c.id                                  as course_id,
  count(e.id)::int                      as enrollment_count
from public.courses c
left join public.enrollments e on e.course_id = c.id
where c.status = 'published'
group by c.id;

-- ---------------------------------------------------------------------------
-- Seed (idempotent). References the existing seeded ids from 0003's seed:
--   courses: html-css-fundamentals = 1111..., javascript-crash-course = 2222...
--   users:   instructor df0f6725..., student 780c2905...
-- Re-runnable: ON CONFLICT DO NOTHING on every insert, guarded category
-- assignment by slug.
-- ---------------------------------------------------------------------------

-- Categories (stable ids so re-running and the course assignment are
-- deterministic).
insert into public.categories (id, slug, name_en, name_he, sort_order) values
  ('c0000001-0000-0000-0000-000000000001', 'web-development', 'Web Development', 'פיתוח אתרים', 10),
  ('c0000001-0000-0000-0000-000000000002', 'javascript',      'JavaScript',      'ג''אווהסקריפט', 20),
  ('c0000001-0000-0000-0000-000000000003', 'frontend',        'Frontend',        'פרונטאנד',    30),
  ('c0000001-0000-0000-0000-000000000004', 'fundamentals',    'Fundamentals',    'יסודות',      40)
on conflict (id) do nothing;

-- Assign categories to the two seeded courses (HTML/CSS -> Web Development,
-- JS crash course -> JavaScript). Guarded so a re-run is a no-op and a manual
-- recategorization is not clobbered.
update public.courses
set category_id = 'c0000001-0000-0000-0000-000000000001'
where id = '11111111-1111-1111-1111-111111111111'
  and category_id is null;

update public.courses
set category_id = 'c0000001-0000-0000-0000-000000000002'
where id = '22222222-2222-2222-2222-222222222222'
  and category_id is null;

-- Enrollments: make "Most popular" non-degenerate. The student enrolls in both
-- courses; the instructor enrolls in the HTML/CSS course only. Result:
-- html-css-fundamentals = 2 enrollments, javascript-crash-course = 1.
-- (Demo data; the instructor enrolling is harmless for a popularity seed.)
insert into public.enrollments (user_id, course_id) values
  ('780c2905-7af1-4f2c-bc9d-1f348b6d87b6', '11111111-1111-1111-1111-111111111111'),
  ('780c2905-7af1-4f2c-bc9d-1f348b6d87b6', '22222222-2222-2222-2222-222222222222'),
  ('df0f6725-7e5a-41d2-8f1d-3e88081835cd', '11111111-1111-1111-1111-111111111111')
on conflict (user_id, course_id) do nothing;

-- Reviews: a spread of ratings across the two seeded courses. Only two seeded
-- users exist (one student, one instructor); the unique (course_id, user_id)
-- constraint caps this at one review per user per course, so we seed four
-- reviews total (each user reviews each course). This is a known seed
-- limitation documented in IMPLEMENTATION_LOG - real ratings spread arrives
-- with real users.
insert into public.course_reviews (course_id, user_id, rating, body) values
  ('11111111-1111-1111-1111-111111111111', '780c2905-7af1-4f2c-bc9d-1f348b6d87b6', 5, 'Clear, well-paced intro to HTML and CSS.'),
  ('11111111-1111-1111-1111-111111111111', 'df0f6725-7e5a-41d2-8f1d-3e88081835cd', 4, 'Solid fundamentals coverage.'),
  ('22222222-2222-2222-2222-222222222222', '780c2905-7af1-4f2c-bc9d-1f348b6d87b6', 4, 'Good crash course; wanted a bit more on async.'),
  ('22222222-2222-2222-2222-222222222222', 'df0f6725-7e5a-41d2-8f1d-3e88081835cd', 5, null)
on conflict (course_id, user_id) do nothing;
