# Admin, Profile, Fixes, And User Management Design

Design spec for batches 24-27: ten reported issues plus the cross-repo
adaptations they require. The reference implementation is the sibling project
`/Users/talo/www/claude-code-ai-coach-assistant`, which shares this project's
auth scaffold (`user_roles`, `profiles`, `requireAdmin`,
`resolvePostAuthDestination`) and uses it more fully. The guiding principle is
to activate and extend patterns that already exist here, adapted from how the
reference repo uses them, not to invent new ones.

## Table Of Contents

- [Status](#status)
- [Verified Root Causes](#verified-root-causes)
- [Locked Decisions](#locked-decisions)
- [Batch 24: Auth Routing, Count Fixes, Scroll, Chrome](#batch-24-auth-routing-count-fixes-scroll-chrome)
- [Batch 25: User Profile Page](#batch-25-user-profile-page)
- [Batch 26: Admin User Management](#batch-26-admin-user-management)
- [Batch 27: About Content And Contact Google Maps](#batch-27-about-content-and-contact-google-maps)
- [Environment Variables](#environment-variables)
- [Cross-Cutting Non-Negotiables](#cross-cutting-non-negotiables)
- [Reference Repo Adaptation Map](#reference-repo-adaptation-map)

## Status

Approved by Tal on 2026-06-16 after brainstorming. Batch decomposition: four
batches (24-27), order 24 to 27. Do not start coding from this spec; the work is
executed batch-by-batch via `/run-batch NN` against the prompt files.

## Verified Root Causes

Each cause below was confirmed against the code and the live database, not
assumed.

| # | Issue | Verified root cause | Fix class |
| --- | --- | --- | --- |
| 1 | Admin lands on student dashboard | `lib/auth/post-auth-redirect.ts:23-28` hard-returns `/dashboard` for everyone (`void userId; return "/dashboard"`). | Branch on role |
| 2 | "2 students" but only 1 | `lib/dashboard/admin-queries.ts` `getAdminOverviewStats` counts `distinct user_id` from `enrollments` with no role filter; the instructor has an enrollment. Live: `distinct_enrolled_users = 2`, `students_role = 1`. | Query filter (DB view/RPC) |
| 3 | "3 enrollments", admin should not enroll | Live: `total_enrollments = 3`, `enrolled_users_who_are_instructors = 1`. The instructor owns at least one enrollment row. | Count filter + RLS block + data cleanup |
| 4 | Course view scrolls to bottom | `components/tutor/tutor-chat.tsx:206-209` runs `scrollIntoView` in a `useEffect([messages, isStreaming])` that fires on initial mount; the tutor sits low on the course page, pulling the viewport down on load. | Skip-first-render guard |
| 5 | About missing supplied text | `app/[locale]/about/page.tsx` renders provisional inline i18n keys; `docs/content/ABOUT_EN.md` (6 sections) and `ABOUT_HE.md` (6 sections, structurally identical) are never used. | Port content into catalogs |
| 6 | No Google Maps on Contact | `app/[locale]/contact/page.tsx` renders a dashed placeholder box (`role="img"`); no map embed. | Maps Embed API (keyed) |
| 7 | No profile page | No `/profile` route exists. `profiles` already has `full_name`, `phone`, `email`, `avatar_url`, `locale`. | New feature |
| 8 | No user management | No admin users page exists. | New feature |
| 9 | Header logo overlaps line | `components/site-header.tsx` logo geometry crosses the header `border-b` hairline. | CSS tweak |
| 10 | Footer logo redundant | `components/site-footer.tsx` renders a `<Link><Logo/></Link>` block. | Delete block |

## Locked Decisions

- **#1** `resolvePostAuthDestination` branches on `isInstructor(userId)`:
  instructors to `/admin/dashboard`, students to `/dashboard`. The existing
  `?redirect=` precedence in the callers (login action, email-confirm route) is
  untouched.
- **#2/#3** Count fix is DB-level (a `security definer` view or RPC joining
  `enrollments` against `user_roles` and excluding instructors), not JS-side
  row fetching. Instructor enrollment is blocked at the RLS layer (`WITH CHECK`
  on INSERT denying instructor-role users), and a migration deletes existing
  instructor-owned enrollment rows; the seed is fixed so reseeding never
  recreates them.
- **#4** Skip-first-render guard in `tutor-chat.tsx`; scroll fires only when
  `messages` grows or streaming starts.
- **#5** Port `docs/content/ABOUT_{EN,HE}.md` into the `About` i18n namespace as
  discrete section keys (heading + body paragraphs). English structure is
  canonical; Hebrew maps key-for-key (`lint:i18n` requires identical keys).
- **#6** Keyed Maps Embed API iframe; `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`
  (public by design, referrer-restricted, plain not Sensitive); falls back to
  the existing placeholder box when the key env var is absent.
- **#7** Profile page edits: `full_name`, `phone` (profiles table), email and
  password (Supabase auth), avatar (public `avatars` storage bucket), and
  locale. Linked from the header user menu for both roles.
- **#8** Full admin user management via a server-only service-role data layer:
  list, view, change role, invite (Supabase built-in invite email, styled
  template), deactivate (`ban_duration`, reversible), delete. Self-protection
  (an admin cannot delete, deactivate, or demote their own account) and a
  last-instructor guard.
- **#9/#10** Header logo clears the border; footer logo block removed.
- **Batches:** 24 (merged fixes), 25 (profile), 26 (user management), 27 (about
  + maps). Order 24 to 27.

## Batch 24: Auth Routing, Count Fixes, Scroll, Chrome

Issues 1, 2, 3, 4, 9, 10. Pure logic, DB, and presentation. No new dependencies.

### 24.1 Post-Login Role Routing (#1)

`lib/auth/post-auth-redirect.ts`: `resolvePostAuthDestination(userId)` checks
`isInstructor(userId)` (from `lib/auth/roles.ts`) and returns `/admin/dashboard`
for instructors, `/dashboard` for students. It remains a pure function of the
user id and the role lookup; callers and `?redirect=` precedence are unchanged.
The existing unit test gains an instructor-branch case (mock `isInstructor`
true/false).

### 24.2 Dashboard Count Fix (#2, #3)

A new migration adds a `security definer` SQL view or RPC (consistent with the
existing `is_instructor()` pattern) that:

- Counts **students** as distinct `enrollments.user_id` whose user does NOT hold
  the `instructor` role.
- Counts **enrollments** as `enrollments` rows owned by non-instructor users.
- Applies the same exclusion to the per-course completion-rate breakdown.

`lib/dashboard/admin-queries.ts` `getAdminOverviewStats` and
`getCourseCompletionRates` call the view/RPC instead of fetching all rows into
JS and counting. The DTO shape (`AdminOverviewStats`,
`CourseCompletionRate`) is unchanged.

### 24.3 Block Instructor Enrollment (#3)

Same migration:

- Adds an RLS `WITH CHECK` on `enrollments` INSERT that denies the row when the
  inserting user holds the `instructor` role (via the `is_instructor()`-style
  helper hard-coded to `auth.uid()`).
- Deletes existing instructor-owned enrollment rows (the admin's current
  enrollment).
- The seed script (`npm run seed` path) is corrected so it never creates an
  enrollment for the instructor account.

### 24.4 Course Auto-Scroll (#4)

`components/tutor/tutor-chat.tsx`: add a `hasMountedRef`/`prevCount` guard so the
`scrollIntoView` effect skips the initial render and only fires when a message is
appended or streaming begins. Existing streaming, a11y, and RTL behavior
unchanged.

### 24.5 Header Logo Overlap (#9)

`components/site-header.tsx`: constrain the logo against the header content box
so it clears the `border-b` hairline (adjust max-height/alignment within the
header height). Verified at 390/768/1280 in EN (LTR) and HE (RTL).

### 24.6 Footer Logo Removal (#10)

`components/site-footer.tsx`: delete the `<Link><Logo/></Link>` block; keep nav
and copyright. Confirm the flex/gap collapses cleanly.

### 24.7 Tests (Batch 24)

- Unit: the role-branch in `resolvePostAuthDestination`; any extracted count
  helper.
- e2e: course page is scrolled to top on load (no auto-scroll to the tutor);
  header/footer no-overflow at the three breakpoints in EN+HE; admin dashboard
  renders corrected counts against seeded data (1 student, non-instructor
  enrollment total).

## Batch 25: User Profile Page

Issue 7. Adapted from the reference repo `app/[locale]/profile/page.tsx` and
`lib/profile/profile-actions.ts`.

### 25.1 Route And Guard

New `app/[locale]/profile/page.tsx`, guarded by `requireUser()` (any
authenticated user). Linked from the header user menu for both roles
(see [25.6](#256-header-user-menu-link)).

### 25.2 Sections (Tier-2 No-JS Server Actions)

Each section is a `<form>` posting `FormData` to a server action that redirects
with `?notice=`/`?error=` codes resolved through an allowlist
(mirroring `resolve-auth-message`):

1. **Contact details** - `full_name`, `phone` to the `profiles` table.
2. **Email** - `supabase.auth.updateUser({ email })`; takes effect only after
   the confirmation email round-trips (reuses the existing auth-confirm route).
3. **Password** - `supabase.auth.updateUser({ password })`; new + confirm,
   length validated server-side.
4. **Avatar** - upload to the `avatars` storage bucket; store the public URL in
   `profiles.avatar_url`. File input + upload is the one part that is not pure
   no-JS; the rest of the page degrades gracefully without it.
5. **Locale** - switch `profiles.locale` between `en`/`he`; on save, redirect
   into the chosen locale. Column already exists.

### 25.3 Data Layer

New `lib/profile/profile-actions.ts` (`import "server-only"`): `ensureProfile`
(idempotent upsert), `updateProfile`, `updateEmail`, `updatePassword`,
`updateAvatar`, `updateLocale`, each with a FormData wrapper that redirects with
a feedback code.

### 25.4 Storage Bucket

New migration creates a **public-read** `avatars` bucket. RLS: a user may
read/write only objects under their own `{user_id}/` prefix; public read for
display (so `<img>` works without signed URLs). Server-side: accept image MIME
types only, cap file size.

### 25.5 Validation And i18n

New `lib/validation/profile.ts` Zod schemas (contact, email, password, avatar
metadata, locale). New `Profile` i18n namespace, key-identical in both catalogs.

### 25.6 Header User Menu Link

Add a Profile link to the header user/account menu, visible to both instructor
and student when authenticated.

### 25.7 Tests (Batch 25)

- Unit: each action's feedback-code mapping; the resolver; validation schemas.
- e2e: field presence and the contact round-trip; no-overflow at 390/768/1280
  in EN+HE; the header menu exposes the Profile link when signed in.

## Batch 26: Admin User Management

Issue 8. Largest batch. Depends on the role-branch from batch 24 and the
profile/header patterns from batch 25.

### 26.1 Route And Guard

New `app/[locale]/admin/users/page.tsx` and
`app/[locale]/admin/users/[userId]/page.tsx`, under a `requireAdmin()` layout
guard (the same instructor-only gate as `/admin/dashboard`). Linked from the
admin dashboard.

### 26.2 Server-Only Service-Role Data Layer

Admin user management requires the Supabase **service-role** key (RLS prevents
one user from reading or mutating others; `is_admin`/`is_instructor` are
`security definer` and revoked from `authenticated`). New `lib/admin/users.ts`
(`import "server-only"`); every function calls `requireAdmin()` first, then uses
a service-role Supabase Admin client built from `SUPABASE_SERVICE_ROLE_KEY`
(already used by `npm run seed`). Functions:

- `listUsers` - paginated: email, `full_name`, role, `created_at`, enrollment
  count, disabled state.
- `getUser` - single user detail.
- `setUserRole` - promote/demote between `student` and `instructor` by writing
  `user_roles`.
- `inviteUser` - `auth.admin.inviteUserByEmail`, then assign role.
- `setUserDisabled` - `auth.admin.updateUserById({ ban_duration })` to
  deactivate (`876000h`-style long ban) or reactivate (`none`).
- `deleteUser` - `auth.admin.deleteUser`; enrollments/progress cascade via
  existing FKs.

### 26.3 Mutations And Guards

Mutations are Tier-2 FormData server actions with `?notice=`/`?error=` feedback.
Destructive actions (delete, deactivate) require an explicit confirm step (a
confirm query-param / second submit), never one-click. Guards:

- **Self-protection:** an admin cannot delete, deactivate, or demote their own
  account from this UI.
- **Last-instructor guard:** the system refuses to demote or delete the final
  instructor, so no one can lock themselves out.

### 26.4 Invite Email Template

Invites use Supabase's built-in invite mailer. A styled HTML invite template is
provided in this spec and pasted into Supabase Auth -> Email Templates -> Invite
(a documented manual dashboard step, not a repo artifact). The invite flow works
with the default template regardless of styling.

### 26.5 i18n And Tests (Batch 26)

- New `AdminUsers` i18n namespace, key-identical EN+HE.
- Unit: each action's feedback-code mapping; the last-instructor guard; the
  self-protection rules.
- e2e: table render; no-overflow/RTL at 390/768/1280; a role-change round-trip;
  a student hitting `/admin/users` is redirected (instructor-only gate holds).

## Batch 27: About Content And Contact Google Maps

Issues 5 and 6. Fully independent; needs the new Maps env var.

### 27.1 About Content (#5)

Port `docs/content/ABOUT_EN.md` and `ABOUT_HE.md` into the `About` i18n
namespace. Both files have the same six sections:

1. Learn To Code With Structure, Clarity, And Personal Attention (intro)
2. A Smarter Way To Learn Programming
3. Professional Teaching, Personal Guidance
4. Built For Real Coding Skills (includes the 5-step ordered list)
5. AI Tutor Support Inside The Learning Context
6. For Students Who Want To Build, Not Just Watch

Each section becomes a heading key plus body-paragraph keys (discrete keys, not
one blob, so RTL and typography stay controllable). English is canonical; Hebrew
maps key-for-key. `app/[locale]/about/page.tsx` renders the keys in order,
replacing the provisional copy, keeping the existing hero-image slot and layout.

### 27.2 Contact Google Maps (#6)

Replace the dashed placeholder in `app/[locale]/contact/page.tsx` with a Maps
Embed API iframe:
`https://www.google.com/maps/embed/v1/place?key={NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY}&q={address}`.
No JS SDK (iframe only, respects the no-JS policy). The iframe carries a
localized `title` for accessibility. **Graceful degradation:** when the key env
var is absent (CI without secrets), the page falls back to the existing
placeholder box rather than a broken iframe, so batches stay green without the
secret.

### 27.3 Tests (Batch 27)

- e2e: the real About headings render in EN+HE with no-overflow at the three
  breakpoints; the Contact page renders the map iframe when the key is present
  and the placeholder when it is absent.

## Environment Variables

| Variable | Where | Sensitive? | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | `.env.local` + Vercel (all envs) | No (plain) | Client-visible by design (rides in the iframe `src`). Secured by HTTP-referrer restriction in Google Cloud Console (your Vercel domains + `localhost`) and by restricting the key to the Maps Embed API only. The Embed API is free with no usage cap. Marking it Sensitive does nothing because `NEXT_PUBLIC_` values are inlined into the client bundle at build time. If absent, Contact falls back to the placeholder. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (Production; Preview if admin runs there) | Yes (Sensitive) | True secret, server-only, used exclusively by `lib/admin/users.ts` (`import "server-only"`). Already used by `npm run seed`. Bypasses RLS; must never reach the client. Mark Sensitive so the value cannot be read back from the dashboard after saving. |

No new env var is needed for avatars; the `avatars` bucket is served from the
existing Supabase project URL.

Manual Supabase-dashboard step (not an env var): paste the styled invite
template into Auth -> Email Templates -> Invite (see [26.4](#264-invite-email-template)).

## Cross-Cutting Non-Negotiables

Every batch follows the project's standing rules (see `docs/I18N.md`,
`docs/ACCESSIBILITY.md`, `docs/RESPONSIVE.md`, `CLAUDE.md`):

- New pages live under `app/[locale]/`. No hardcoded user-facing strings; every
  key added to BOTH `messages/en-US.json` and `messages/he-IL.json`,
  key-identical (`lint:i18n` enforces).
- Forms follow the 3-tier no-JS policy; feedback flows through the
  `?error=`/`?notice=` query-param channel resolved to a localized banner.
- One `<h1>`, semantic landmarks, `<main id="main-content">`, visible focus,
  `prefers-reduced-motion` respected, `jsx-a11y` green.
- No horizontal overflow at 390/768/1280 in EN (LTR) and HE (RTL); logical RTL
  utilities; the header nav collapses into the `Sheet` drawer below `md`.
- Only DESIGN.md `.light`/`.dark` palette colors via semantic tokens; no
  Tailwind named-color literals or raw hex in app code.
- Never create `middleware.ts` (the `guard-no-middleware` check hard-fails).
- TSDoc on changed exports. Mock all AI and external-network calls in the
  default test suite. Run `typecheck` to its exit code; do not trust a log tail.
- Gate set per `docs/planning/RUNBOOK.md`: `lint`, `lint:i18n`, `typecheck`,
  `build`, `test`, `test:e2e`, all exit 0. Node 22.16.0.

## Reference Repo Adaptation Map

How each reference-repo pattern maps into this project. The reference repo is
`/Users/talo/www/claude-code-ai-coach-assistant`.

| Reference repo artifact | This project's adaptation |
| --- | --- |
| `lib/auth/post-auth-redirect.ts` (branches admin to `/admin`) | Branch instructor to `/admin/dashboard`, student to `/dashboard` (24.1). |
| `app/[locale]/profile/page.tsx` + `lib/profile/profile-actions.ts` | New profile page + actions, same FormData/`?notice=` shape (Batch 25). |
| `profiles` table + `ensureProfile` on login | `profiles` already exists with the needed columns; add `ensureProfile` usage + avatar bucket (Batch 25). |
| `lib/auth/roles.ts` `is_admin` / `requireTrainerAdmin` | This project's `isInstructor` / `requireAdmin` (already present) gate the admin area (Batches 24, 26). |
| `/trainer` client-management area (service-role data, set-based queries) | New `/admin/users` with a server-only service-role layer + set-based listing (Batch 26). |
| Admin layout guard (`requireAdmin()` in `layout.tsx`) | Same pattern for the `/admin/users` layout (Batch 26). |
| Reversible disable via Supabase admin API | `setUserDisabled` via `ban_duration` (Batch 26). |
