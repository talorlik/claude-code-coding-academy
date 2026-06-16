-- ---------------------------------------------------------------------------
-- Avatars storage bucket (Batch 25, user profile page)
-- ---------------------------------------------------------------------------
-- A public-read bucket holding user avatar images. Public read lets the profile
-- and any avatar <img> render with a plain public URL, so no signed-URL round
-- trip is needed for display. Writes are gated by RLS to a user's own
-- `{user_id}/` prefix, so a user can only create, replace, or remove objects
-- under their own folder. The bucket is created idempotently so re-running the
-- migration is safe.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- storage.objects already has RLS enabled by Supabase. Define avatar policies
-- scoped to this bucket. `(storage.foldername(name))[1]` is the first path
-- segment of the object key (`{user_id}/file.png` -> `{user_id}`); requiring it
-- to equal the caller's uid confines each user to their own prefix.

-- Public read: anyone (including anonymous visitors) may read avatar objects so
-- the public URL renders in an <img>. Scoped to the avatars bucket only.
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

-- Per-user insert: a user may upload only under their own `{user_id}/` prefix.
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Per-user update: a user may replace only objects under their own prefix.
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Per-user delete: a user may remove only objects under their own prefix.
drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
