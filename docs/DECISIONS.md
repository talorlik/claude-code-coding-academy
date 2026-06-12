# Decision Log

An append-only, dated record of ad-hoc decisions and insights made while
building this project. Each batch (`/run-batch`) appends here before the session
is cleared, so nothing learned mid-build is lost. This is the repo-durable
record; personal cross-batch gotchas also go to auto-memory.

## Format

Newest entries at the bottom. One entry per decision or insight:

```markdown
### YYYY-MM-DD - Batch NN - Short Title

Decision or insight, stated plainly.

**Why:** the reasoning that is not obvious from the code or commit.
```

Keep entries short. Record the why, not the what (the commit already has the
what). Do not invent entries; if a batch produced nothing non-obvious, it
records nothing here.

## Entries

### 2026-06-12 - Auth port - rls_auto_enable EXECUTE revoked

Revoked `EXECUTE` on `public.rls_auto_enable()` from `public`, `anon`, and
`authenticated` (migration `0002_harden_rls_auto_enable.sql`).

**Why:** It is a SECURITY DEFINER function backing the `ensure_rls` event
trigger (auto-enables RLS on new `public` tables), invoked only by the trigger
machinery, never as an RPC. The open grant tripped two Supabase security
advisors. Do not drop the function - it is an active hardening mechanism, and is
why a new table gets RLS even if a migration forgets to enable it.

### 2026-06-12 - Auth port - leaked-password protection left disabled

Supabase Auth "leaked password protection" (HaveIBeenPwned check) is still off.

**Why:** Enabling it is an Auth-config change that requires a Supabase personal
access token (`sbp_...`) via the Management API or `supabase login`; the project
secret key cannot make config changes (returns 401, "JWT could not be decoded").
No such token was available in the session, so the toggle was deferred by
choice. To enable: Dashboard -> Authentication -> Sign In / Providers ->
Password -> "Leaked password protection", or `supabase` CLI once logged in.
