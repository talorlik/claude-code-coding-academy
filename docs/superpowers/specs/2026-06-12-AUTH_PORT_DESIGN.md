# Auth Port Design - Coding Academy

Port the full signup / login / logout / forgot-password / reset-password /
remember-me flow from `claude-code-ai-coach-assistant` into
`claude-code-coding-academy`, including DB schema and seeding of two users
(an instructor and a first student). Captcha is intentionally excluded.

## Goals

- A working, no-JS-friendly, server-action-based auth flow on the target.
- Two roles: `instructor` (teacher, the privileged role) and `student`.
- Real DB seeding of one instructor and one first student, applied to the
  connected Supabase project (`nlqpuppwjtxhfcfyjfre`).
- Full English + Hebrew localization (no hardcoded user-facing strings).

## Non-Goals

- No Cloudflare Turnstile / captcha (explicitly excluded for now).
- No fitness-domain logic (onboarding, plans, `/join`, `/my-plan`).
- No profile-edit UI beyond the helpers auth depends on.

## Role Rename

The source enum `app_role` is `('admin','customer')` (admin = trainer,
customer = trainee). The target uses:

- `admin`    -> `instructor` (teacher, privileged)
- `customer` -> `student`

Helper and function names follow: `isInstructor`, `requireInstructor`,
`is_instructor()`.

## Files Created / Changed (Target)

### Database (new `supabase/` tree)

- `supabase/migrations/0001_auth_schema.sql` - `app_role` enum
  (`instructor`/`student`), `user_roles`, `profiles`, `set_updated_at()`,
  `is_instructor(uuid)` (EXECUTE revoked from public/anon/authenticated, granted
  to service_role only), RLS with own-row read policies. Structure copied from
  source `0001_auth_schema.sql`; names adapted.
- `supabase/config.toml` - minimal project config.

### Auth lib (`lib/auth/`)

- `roles.ts` - `isInstructor(userId)`, `getCurrentUserRole()`.
- `require-user.ts` - `requireUser()`, `requireInstructor()`.
- `validation.ts` - `isValidEmail()`.
- `post-auth-redirect.ts` - simplified: both roles -> `/dashboard`.
- `resolve-auth-message.ts` - allowlisted code -> localized message resolver.

### Supabase lib (overwrite target's 3 files to add remember-me)

- `lib/supabase/cookie-persistence.ts` - new: `REMEMBER_FLAG`, `SESSION_ONLY`,
  `isAuthCookie`, `stripPersistence`.
- `lib/supabase/server.ts` - honor remember flag on cookie writes.
- `lib/supabase/middleware.ts` - honor remember flag; protect `/dashboard`,
  `/profile`; locale-aware login bounce.
- `lib/supabase/client.ts` - unchanged (already identical).

### Profile helper

- `lib/profile/profile-actions.ts` - trimmed to `ensureProfile` +
  `updatePassword` (the two functions auth depends on). Fitness fields dropped.
- `lib/types/action-result.ts` - `ActionResult`, `ok`, `fail` (dependency of
  `updatePassword`).

### Auth routes (non-localized)

- `app/auth/confirm/route.ts` - exchange token, ensure profile, route by
  `resolvePostAuthDestination`; recovery -> `/reset-password`. Allowlist:
  `["/profile","/reset-password","/dashboard"]`.
- `app/auth/signout/route.ts` - copied verbatim (logout, CSRF-guarded GET).

### Auth pages (`app/[locale]/`)

- `login/{page.tsx,login-tabs.tsx,actions.ts}` - sign-in + sign-up tabs,
  remember-me checkbox, forgot-password link.
- `register/page.tsx` - alias redirect to `/login?tab=signup`.
- `forgot-password/{page.tsx,actions.ts}`.
- `reset-password/{page.tsx,actions.ts}`.
- `dashboard/page.tsx` - minimal protected landing (calls `requireUser`).

All pages fully localized via a new `Auth` namespace (UI strings) and the
`AuthMessages` namespace (error/notice codes), added to BOTH
`messages/en-US.json` and `messages/he-IL.json`, key-identical.

### Captcha removal

No `components/captcha-field.tsx`, no `captchaToken` handling, no
`@marsidev/react-turnstile` dependency, no `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
Auth actions call Supabase without `options.captchaToken`.

## Seeding

The source has no automated seeder; it only documents a manual SQL grant. The
target needs both users actually created, so:

- `scripts/seed.mjs` (run via `npm run seed`) uses the secret key admin client
  to, idempotently:
  1. Create the instructor (`E2E_INSTRUCTOR_EMAIL`/`PASSWORD`),
     `email_confirm: true`, upsert `profiles`, insert `user_roles (instructor)`.
  2. Create the first student (`E2E_STUDENT_EMAIL`/`PASSWORD`) the same way with
     role `student`.

A migration cannot cleanly create `auth.users` rows with passwords, so the
Admin-API seeder is the correct mechanism.

## Environment

Append to the target `.env.local` (keep the target's own Supabase project
URL/keys - they point at a different project than the source):

```
E2E_INSTRUCTOR_EMAIL=talorlik@gmail.com
E2E_INSTRUCTOR_PASSWORD=P@ssw0rd12345
E2E_STUDENT_EMAIL=talorlik@hotmail.com
E2E_STUDENT_PASSWORD=P@ssw0rd12345
```

## Apply Plan

1. Apply `0001_auth_schema.sql` to `nlqpuppwjtxhfcfyjfre` via Supabase MCP.
2. Run the seeder against the same project to create both users + roles.
3. Verify gates: `lint:i18n`, `typecheck`, `lint`, `build`.

## Post-Auth Redirect

`resolvePostAuthDestination(userId)` returns `/dashboard` for any authenticated
user (instructor or student). Role-specific routing can branch later; for now a
single protected landing keeps scope minimal. A safe same-site `?redirect=`
target still takes precedence in the login action.
