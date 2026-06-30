-- Bootstrap: rls_auto_enable() function + ensure_rls event trigger.
--
-- This migration recreates an object that existed in the live project from an
-- earlier (uncommitted) bootstrap but was never captured in the repo. Migration
-- 0002 HARDENS public.rls_auto_enable() (it revokes EXECUTE from public/anon/
-- authenticated), so the function and its event trigger must already exist when
-- 0002 runs. Without this file a clean `supabase db reset` against an empty
-- project fails at 0002 with "function public.rls_auto_enable() does not exist".
--
-- The 0000 prefix orders it ahead of every other migration. The body is an
-- exact match of the live definition (pulled via pg_get_functiondef) so a
-- rebuilt database is byte-for-byte equivalent to production.
--
-- What it does: an event trigger on ddl_command_end that auto-enables row level
-- security on any new table created in the `public` schema. This is the
-- project's defense-in-depth guarantee that no table ever ships without RLS;
-- the per-migration `alter table ... enable row level security` statements are
-- then redundant-but-explicit. SECURITY DEFINER with search_path pinned to
-- pg_catalog so it runs with the owner's privileges and a fixed resolution path.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;

-- The event trigger that invokes the function after every DDL command. Guarded
-- with a drop so a re-run (or a partial earlier bootstrap) is idempotent;
-- CREATE EVENT TRIGGER has no IF NOT EXISTS form.
drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();
