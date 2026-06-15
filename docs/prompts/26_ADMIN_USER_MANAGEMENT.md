# Prompt: Admin User Management

```text
Add an admin-only user-management area: list all users, view one, change role
(student <-> instructor), invite new users by email, deactivate/reactivate
(reversible), and delete. Because RLS prevents cross-user reads and mutations,
this uses a server-only service-role data layer. Adapt from the reference repo's
admin area. Depends on Batch 24 (role-branch routing) and Batch 25 (profile +
header patterns).

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-16-ADMIN_PROFILE_FIXES_AND_USER_MANAGEMENT_DESIGN.md (Batch 26).
- Implementation plan: docs/superpowers/plans/2026-06-16-admin-profile-fixes-and-user-management.md (Batch 26).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Reference repo: /Users/talo/www/claude-code-ai-coach-assistant. Its /admin
  layout calls requireAdmin() before render; its data layer uses set-based
  queries (not N+1) and a service-role client for cross-user reads. Its is_admin
  is security definer, revoked from authenticated. Adapt these.
- This project: requireAdmin() (instructor-only) already exists in lib/auth/guards.ts;
  the existing /admin/dashboard uses it. SUPABASE_SERVICE_ROLE_KEY already exists
  and is used by npm run seed. Roles live in user_roles (app_role:
  instructor|student). enrollments/lesson_progress cascade from auth.users via FKs.
- Deactivate is reversible via the Supabase admin API ban_duration (a long ban to
  disable; 'none' to reactivate), NOT a custom profiles.disabled flag.
- Invites use Supabase's built-in invite email (auth.admin.inviteUserByEmail). A
  styled HTML invite template is provided in the spec and pasted into Supabase
  Auth -> Email Templates -> Invite (a manual dashboard step; document it). The
  flow works with the default template regardless.

Requirements:
1. Server-only data layer: lib/admin/users.ts (import "server-only"). Build a
   service-role Supabase Admin client from SUPABASE_SERVICE_ROLE_KEY. EVERY
   exported function calls requireAdmin() FIRST. Functions: listUsers (paginated:
   email, full_name, role, created_at, enrollment count, disabled state, via
   set-based queries), getUser, setUserRole (write user_roles), inviteUser
   (auth.admin.inviteUserByEmail then assign role), setUserDisabled
   (auth.admin.updateUserById({ ban_duration }) - long ban to disable, none to
   reactivate), deleteUser (auth.admin.deleteUser; FKs cascade).
2. Guards: self-protection - an admin cannot delete, deactivate, or demote their
   OWN account from this UI. Last-instructor guard - refuse to demote or delete
   the final instructor (no lockout). Both enforced in the data layer, not just
   the UI.
3. Validation + resolver: lib/validation/admin-users.ts (invite email, role enum,
   disable toggle) and lib/admin/resolve-users-message.ts (code -> localized key
   allowlist, anti-injection).
4. Routes: app/[locale]/admin/users/layout.tsx (requireAdmin guard),
   app/[locale]/admin/users/page.tsx (paginated table), and
   app/[locale]/admin/users/[userId]/page.tsx (detail + actions). Link to Users
   from the admin dashboard. Mutations are Tier-2 FormData server actions with
   ?notice=/?error= feedback. Destructive actions (delete, deactivate) require an
   explicit confirm step (confirm query-param / second submit), never one-click.
5. i18n: new AdminUsers namespace, key-identical in both catalogs. No hardcoded
   user-facing strings.
6. Accessibility + responsive: one <h1>, semantic landmarks,
   <main id="main-content">, visible focus, jsx-a11y green; tables degrade /
   scroll without breaking layout; no horizontal overflow at 390/768/1280 in
   EN (LTR) and HE (RTL); logical RTL utilities. Only DESIGN.md semantic tokens;
   no Tailwind named-color literals or raw hex.
7. Invite template: document the styled HTML invite template and the manual paste
   step (Auth -> Email Templates -> Invite) in docs/DECISIONS.md and confirm it
   matches the spec's env section.
8. TSDoc on changed exports.
9. Tests:
   - Unit: each action's feedback-code mapping; the last-instructor guard; the
     self-protection rules; that every data-layer function asserts requireAdmin.
   - e2e: the table renders; a role-change round-trips; a student hitting
     /admin/users is REDIRECTED (instructor-only gate holds); no overflow / RTL
     at 390/768/1280.
   - Mock the service-role client and all Supabase admin calls in the default
     suite; never hit live auth in tests. Use the working { ...builder } pattern
     with then:(resolve:(v:unknown)=>unknown).
   - Run typecheck to its exit code; do not trust a tail of the log.
10. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory;
    append a dated entry to docs/DECISIONS.md.

Rules:
- The service-role key is a true secret: used ONLY in lib/admin/users.ts behind
  import "server-only"; never imported by a client component; never prefixed
  NEXT_PUBLIC_. It bypasses RLS - guard every entry with requireAdmin().
- Adapt the reference repo's admin layout-guard + set-based query patterns; do
  not write N+1 loops to list users.
- Deactivate uses ban_duration (reversible); do not add a profiles.disabled
  column.
- Forms follow the 3-tier no-JS policy; feedback only through the query-param
  channel. Destructive actions always confirm.
- Never create middleware.ts.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm test,
  and npm run test:e2e. All gates must exit 0. Gates need Node 22.16.0; prefix
  PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH".
- Worktree is a sibling ../academy-26-admin-user-management, branch
  feature/26-admin-user-management; squash-merge into local main when green.
```
