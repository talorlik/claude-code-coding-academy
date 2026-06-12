-- Auth schema: user_roles, profiles, is_instructor, RLS.
--
-- Two roles: 'instructor' (the privileged teacher account) and 'student'. The
-- is_instructor helper is kept off the REST RPC surface (EXECUTE revoked from
-- public/anon/authenticated). user_roles has only an own-row read policy; an
-- instructor-read-all policy that subqueries user_roles would recurse, and the
-- app only needs own-row reads (privileged tooling uses the service-role client).

-- ---------------------------------------------------------------------------
-- Roles enum
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('instructor', 'student');

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- profiles (account details: name + phone only)
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- is_instructor helper (off the public RPC surface)
-- ---------------------------------------------------------------------------
create or replace function public.is_instructor(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_roles.user_id = is_instructor.user_id
      and user_roles.role = 'instructor'
  );
$$;

revoke execute on function public.is_instructor(uuid) from public, anon, authenticated;
grant execute on function public.is_instructor(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;

-- user_roles: a user may read only their own role rows. No instructor-read-all
-- policy (it would recurse; privileged tooling uses the service-role client).
create policy "Users can read own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

-- profiles: each user fully manages only their own row.
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
