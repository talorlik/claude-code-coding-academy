-- Course platform schema: enums, tables, RLS, views.
--
-- Naming deviation: TASK_BREAKDOWN.md specifies timestamp-prefixed filenames;
-- the existing 0001/0002 sequential convention is kept to preserve migration
-- order tracking in the Supabase dashboard.
--
-- Profiles reconciliation: the existing public.profiles table uses user_id as
-- PK (not id). All FKs in this file that the spec writes as
-- "references profiles(id)" are written as "references profiles(user_id)".
-- The table is extended, not recreated.
--
-- instructor == admin: the existing project uses app_role 'instructor' for
-- the privileged account. The spec's 'admin' role is mapped to 'instructor'.
-- private.is_admin() encapsulates this mapping so policies stay readable.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Private schema (not exposed by PostgREST as REST RPCs)
-- ---------------------------------------------------------------------------
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Admin helper (instructor == admin)
--
-- Security definer so it can read user_roles under any caller identity.
-- Uses (select private.is_admin()) in policies for initplan caching:
-- the planner evaluates it once per statement instead of once per row.
-- EXECUTE is revoked from anon (they never need admin checks) but
-- authenticated retains it because RLS policies run as the invoker.
--
-- Mapping note: 'instructor' in this project == 'admin' in the spec. The
-- private schema keeps this helper off the PostgREST REST RPC surface.
-- ---------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'instructor'
  );
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- (user_role is intentionally omitted: public.app_role already covers this)
-- ---------------------------------------------------------------------------
create type public.course_level as enum (
  'beginner',
  'intermediate',
  'advanced'
);

create type public.course_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.tutor_message_role as enum (
  'user',
  'assistant',
  'system'
);

create type public.payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded'
);

create type public.reminder_status as enum (
  'queued',
  'sent',
  'failed',
  'skipped'
);

-- ---------------------------------------------------------------------------
-- Extend profiles (keep existing user_id PK, phone, full_name, timestamps)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email      text,
  add column if not exists avatar_url text,
  add column if not exists locale     text not null default 'en'
    check (locale in ('en', 'he'));

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
create table public.courses (
  id             uuid         primary key default gen_random_uuid(),
  slug           text         not null unique,
  title          text         not null,
  description    text         not null,
  level          public.course_level  not null,
  cover_image_url text,
  status         public.course_status not null default 'draft',
  language       text         not null default 'en'
    check (language in ('en', 'he', 'mixed')),
  created_by     uuid         references public.profiles (user_id)
                              on delete set null,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

create index courses_status_idx on public.courses (status);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id               uuid        primary key default gen_random_uuid(),
  course_id        uuid        not null
    references public.courses (id) on delete cascade,
  slug             text        not null,
  title            text        not null,
  description      text,
  youtube_video_id text        not null,
  youtube_url      text        not null,
  duration_seconds integer,
  thumbnail_url    text,
  sort_order       integer     not null,
  is_preview       boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (course_id, slug),
  unique (course_id, sort_order)
);

-- (course_id, sort_order) unique index serves as the covering index.
-- Additional index on course_id alone helps non-order queries.
create index lessons_course_id_idx on public.lessons (course_id);

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null
    references public.profiles (user_id) on delete cascade,
  course_id               uuid        not null
    references public.courses (id) on delete cascade,
  enrolled_at             timestamptz not null default now(),
  completed_at            timestamptz,
  last_accessed_lesson_id uuid
    references public.lessons (id) on delete set null,
  unique (user_id, course_id)
);

create index enrollments_course_id_idx on public.enrollments (course_id);

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------
create table public.lesson_progress (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null
    references public.profiles (user_id) on delete cascade,
  course_id  uuid        not null
    references public.courses (id) on delete cascade,
  lesson_id  uuid        not null
    references public.lessons (id) on delete cascade,
  watched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index lesson_progress_user_id_idx
  on public.lesson_progress (user_id);
create index lesson_progress_course_id_idx
  on public.lesson_progress (course_id);

-- Enforce that lesson_id belongs to course_id. A composite FK would require
-- the unique (id, course_id) constraint on lessons; a trigger is cleaner.
create or replace function public.check_lesson_belongs_to_course()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.lessons
    where id = new.lesson_id
      and course_id = new.course_id
  ) then
    raise exception
      'lesson % does not belong to course %',
      new.lesson_id,
      new.course_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger lesson_progress_course_check
before insert or update on public.lesson_progress
for each row execute function public.check_lesson_belongs_to_course();

-- ---------------------------------------------------------------------------
-- ai_tutor_conversations
-- ---------------------------------------------------------------------------
create table public.ai_tutor_conversations (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null
    references public.profiles (user_id) on delete cascade,
  course_id  uuid        not null
    references public.courses (id) on delete cascade,
  lesson_id  uuid
    references public.lessons (id) on delete set null,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_course_idx
  on public.ai_tutor_conversations (user_id, course_id);

create trigger ai_conversations_set_updated_at
before update on public.ai_tutor_conversations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_tutor_messages
-- ---------------------------------------------------------------------------
create table public.ai_tutor_messages (
  id              uuid                     primary key
    default gen_random_uuid(),
  conversation_id uuid                     not null
    references public.ai_tutor_conversations (id) on delete cascade,
  role            public.tutor_message_role not null,
  content         text                     not null,
  model           text,
  metadata        jsonb,
  created_at      timestamptz              not null default now()
);

create index ai_messages_conversation_id_idx
  on public.ai_tutor_messages (conversation_id);

-- ---------------------------------------------------------------------------
-- certificates
-- ---------------------------------------------------------------------------
create table public.certificates (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null
    references public.profiles (user_id) on delete cascade,
  course_id  uuid        not null
    references public.courses (id) on delete cascade,
  issued_at  timestamptz not null default now(),
  metadata   jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ---------------------------------------------------------------------------
-- class_groups
-- ---------------------------------------------------------------------------
create table public.class_groups (
  id         uuid        primary key default gen_random_uuid(),
  slug       text        not null unique,
  name       text        not null,
  created_by uuid
    references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger class_groups_set_updated_at
before update on public.class_groups
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- class_group_members
-- ---------------------------------------------------------------------------
create table public.class_group_members (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null
    references public.class_groups (id) on delete cascade,
  user_id    uuid        not null
    references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index class_group_members_user_id_idx
  on public.class_group_members (user_id);

-- ---------------------------------------------------------------------------
-- reminder_events
-- ---------------------------------------------------------------------------
create table public.reminder_events (
  id         uuid                    primary key default gen_random_uuid(),
  user_id    uuid                    not null
    references public.profiles (user_id) on delete cascade,
  course_id  uuid
    references public.courses (id) on delete cascade,
  status     public.reminder_status  not null,
  reason     text                    not null,
  sent_at    timestamptz,
  metadata   jsonb,
  created_at timestamptz             not null default now(),
  updated_at timestamptz             not null default now()
);

create index reminder_events_status_idx
  on public.reminder_events (status);

create trigger reminder_events_set_updated_at
before update on public.reminder_events
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- course_prices
-- ---------------------------------------------------------------------------
create table public.course_prices (
  id            uuid        primary key default gen_random_uuid(),
  course_id     uuid        not null
    references public.courses (id) on delete cascade,
  display_label text,
  currency      text        not null,
  amount_cents  integer     not null,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger course_prices_set_updated_at
before update on public.course_prices
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id                   uuid                   primary key
    default gen_random_uuid(),
  user_id              uuid                   not null
    references public.profiles (user_id) on delete cascade,
  course_id            uuid                   not null
    references public.courses (id) on delete cascade,
  status               public.payment_status  not null,
  provider             text                   not null default 'simulation',
  simulation_event_id  text,
  checkout_session_id  text,
  fake_payment_summary text,
  amount_cents         integer                not null,
  currency             text                   not null,
  created_at           timestamptz            not null default now(),
  updated_at           timestamptz            not null default now()
);

-- Partial unique index for idempotent payment confirmation. NULL values are
-- excluded from unique enforcement by standard SQL semantics, so this only
-- fires when simulation_event_id is present.
create unique index payments_simulation_event_id_uidx
  on public.payments (simulation_event_id)
  where simulation_event_id is not null;

create index payments_user_course_idx
  on public.payments (user_id, course_id);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Enable RLS on all new tables
-- ---------------------------------------------------------------------------
alter table public.courses             enable row level security;
alter table public.lessons             enable row level security;
alter table public.enrollments         enable row level security;
alter table public.lesson_progress     enable row level security;
alter table public.ai_tutor_conversations enable row level security;
alter table public.ai_tutor_messages   enable row level security;
alter table public.certificates        enable row level security;
alter table public.class_groups        enable row level security;
alter table public.class_group_members enable row level security;
alter table public.reminder_events     enable row level security;
alter table public.course_prices       enable row level security;
alter table public.payments            enable row level security;

-- ---------------------------------------------------------------------------
-- Explicit grants (Supabase default grants anon/authenticated SELECT/INSERT/
-- UPDATE/DELETE on public schema tables, but the anon role needs explicit
-- SELECT on the catalog tables that are intentionally public.)
-- ---------------------------------------------------------------------------
grant select on public.courses       to anon, authenticated;
grant select on public.lessons       to anon, authenticated;
grant select on public.course_prices to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

-- profiles: add admin-read-all (own-row policies already exist from 0001).
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using ((select private.is_admin()));

-- courses: public catalog for anon + authenticated; full CRUD for admin.
create policy "Published courses visible to everyone"
on public.courses
for select
to anon, authenticated
using (status = 'published');

create policy "Admins can select all courses"
on public.courses
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can insert courses"
on public.courses
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update courses"
on public.courses
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete courses"
on public.courses
for delete
to authenticated
using ((select private.is_admin()));

-- lessons: lessons for published courses visible to everyone; admin CRUD.
create policy "Lessons for published courses visible to everyone"
on public.lessons
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = lessons.course_id
      and c.status = 'published'
  )
);

create policy "Admins can select all lessons"
on public.lessons
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can insert lessons"
on public.lessons
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update lessons"
on public.lessons
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete lessons"
on public.lessons
for delete
to authenticated
using ((select private.is_admin()));

-- enrollments: student owns their rows; admin reads all.
create policy "Students can read own enrollments"
on public.enrollments
for select
to authenticated
using (auth.uid() = user_id);

create policy "Students can insert own enrollments"
on public.enrollments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Students can update own enrollments"
on public.enrollments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can read all enrollments"
on public.enrollments
for select
to authenticated
using ((select private.is_admin()));

-- lesson_progress: student owns; admin reads all.
create policy "Students can read own lesson progress"
on public.lesson_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Students can insert own lesson progress"
on public.lesson_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can read all lesson progress"
on public.lesson_progress
for select
to authenticated
using ((select private.is_admin()));

-- ai_tutor_conversations: student owns; admin reads all.
create policy "Students can read own tutor conversations"
on public.ai_tutor_conversations
for select
to authenticated
using (auth.uid() = user_id);

create policy "Students can insert own tutor conversations"
on public.ai_tutor_conversations
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Students can update own tutor conversations"
on public.ai_tutor_conversations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can read all tutor conversations"
on public.ai_tutor_conversations
for select
to authenticated
using ((select private.is_admin()));

-- ai_tutor_messages: student may read/insert where conversation belongs
-- to them; admin reads all.
create policy "Students can read messages in own conversations"
on public.ai_tutor_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.ai_tutor_conversations c
    where c.id = ai_tutor_messages.conversation_id
      and c.user_id = auth.uid()
  )
);

create policy "Students can insert messages in own conversations"
on public.ai_tutor_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ai_tutor_conversations c
    where c.id = ai_tutor_messages.conversation_id
      and c.user_id = auth.uid()
  )
);

create policy "Admins can read all tutor messages"
on public.ai_tutor_messages
for select
to authenticated
using ((select private.is_admin()));

-- certificates: student reads own; admin reads all.
create policy "Students can read own certificates"
on public.certificates
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all certificates"
on public.certificates
for select
to authenticated
using ((select private.is_admin()));

-- class_groups: student reads groups where they are a member; admin CRUD.
create policy "Students can read groups they belong to"
on public.class_groups
for select
to authenticated
using (
  exists (
    select 1
    from public.class_group_members m
    where m.group_id = class_groups.id
      and m.user_id = auth.uid()
  )
);

create policy "Admins can select all class groups"
on public.class_groups
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can insert class groups"
on public.class_groups
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update class groups"
on public.class_groups
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete class groups"
on public.class_groups
for delete
to authenticated
using ((select private.is_admin()));

-- class_group_members: student reads own membership; admin CRUD.
create policy "Students can read own group memberships"
on public.class_group_members
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can select all group members"
on public.class_group_members
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can insert group members"
on public.class_group_members
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update group members"
on public.class_group_members
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete group members"
on public.class_group_members
for delete
to authenticated
using ((select private.is_admin()));

-- reminder_events: no student access; admin full manage.
create policy "Admins can select reminder events"
on public.reminder_events
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can insert reminder events"
on public.reminder_events
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update reminder events"
on public.reminder_events
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete reminder events"
on public.reminder_events
for delete
to authenticated
using ((select private.is_admin()));

-- course_prices: anon + authenticated read active prices for published
-- courses; admin CRUD.
create policy "Active prices for published courses visible to everyone"
on public.course_prices
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.courses c
    where c.id = course_prices.course_id
      and c.status = 'published'
  )
);

create policy "Admins can select all course prices"
on public.course_prices
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can insert course prices"
on public.course_prices
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update course prices"
on public.course_prices
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete course prices"
on public.course_prices
for delete
to authenticated
using ((select private.is_admin()));

-- payments: student reads own; admin reads all.
create policy "Students can read own payments"
on public.payments
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all payments"
on public.payments
for select
to authenticated
using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Views (security_invoker = true: RLS from underlying tables applies)
-- ---------------------------------------------------------------------------

-- course_lesson_counts: total lessons and total duration per course.
create or replace view public.course_lesson_counts
with (security_invoker = true)
as
select
  course_id,
  count(*)::int                          as lesson_count,
  coalesce(sum(duration_seconds), 0)::int as total_duration_seconds
from public.lessons
group by course_id;

-- student_course_progress: watched vs total, percent, last activity.
create or replace view public.student_course_progress
with (security_invoker = true)
as
select
  e.user_id,
  e.course_id,
  count(l.id)::int                          as total_lessons,
  count(lp.id)::int                         as completed_lessons,
  case
    when count(l.id) = 0 then 0
    else round(
      (count(lp.id)::numeric / count(l.id)::numeric) * 100,
      1
    )
  end                                       as progress_percent,
  max(lp.watched_at)                        as last_watched_at
from public.enrollments e
join public.lessons l on l.course_id = e.course_id
left join public.lesson_progress lp
  on lp.lesson_id = l.id
  and lp.user_id  = e.user_id
group by e.user_id, e.course_id;

-- admin_stuck_students: enrolled students with no progress for 7+ days.
-- Returns rows only for callers who can read both enrollments and
-- lesson_progress (i.e. admins or the student themselves).
create or replace view public.admin_stuck_students
with (security_invoker = true)
as
select
  e.user_id,
  e.course_id,
  e.enrolled_at,
  max(lp.watched_at)       as last_watched_at,
  (now() - max(lp.watched_at))::interval as inactive_for,
  extract(day from (now() - coalesce(
    max(lp.watched_at),
    e.enrolled_at
  )))::int                 as days_inactive
from public.enrollments e
left join public.lesson_progress lp
  on lp.user_id   = e.user_id
  and lp.course_id = e.course_id
group by e.user_id, e.course_id, e.enrolled_at
having extract(day from (now() - coalesce(
  max(lp.watched_at),
  e.enrolled_at
))) >= 7;

-- group_progress_summary: aggregate completion per group per course.
create or replace view public.group_progress_summary
with (security_invoker = true)
as
select
  m.group_id,
  e.course_id,
  count(distinct m.user_id)::int          as member_count,
  count(distinct e.user_id)::int          as enrolled_count,
  count(distinct
    case when e.completed_at is not null
      then e.user_id end
  )::int                                  as completed_count,
  avg(
    case when lc.lesson_count = 0 then 0
         else lp_agg.watched_count::numeric / lc.lesson_count::numeric * 100
    end
  )::numeric(5,1)                         as avg_progress_percent
from public.class_group_members m
left join public.enrollments e on e.user_id = m.user_id
left join public.course_lesson_counts lc on lc.course_id = e.course_id
left join (
  select user_id, course_id, count(*)::int as watched_count
  from public.lesson_progress
  group by user_id, course_id
) lp_agg on lp_agg.user_id = e.user_id
        and lp_agg.course_id = e.course_id
group by m.group_id, e.course_id;

-- search_documents: published course + lesson text for full-text search.
-- Returns only published rows. Clients search this view by the caller's
-- role; anon sees published only (enforced by underlying courses RLS).
create or replace view public.search_documents
with (security_invoker = true)
as
select
  c.id           as document_id,
  'course'       as document_type,
  c.slug,
  c.title,
  c.description  as body,
  null::uuid     as course_id,
  c.id           as source_course_id,
  c.language
from public.courses c
where c.status = 'published'

union all

select
  l.id           as document_id,
  'lesson'       as document_type,
  l.slug,
  l.title,
  coalesce(l.description, '') as body,
  l.course_id,
  l.course_id    as source_course_id,
  c.language
from public.lessons l
join public.courses c on c.id = l.course_id
where c.status = 'published';
