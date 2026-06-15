# Admin, Profile, Fixes, And User Management Implementation Plan

> **For agentic workers:** This plan is executed through the project's
> `/run-batch NN` mechanism, NOT the generic subagent-driven/executing-plans
> flow. Each batch below maps to one `docs/prompts/NN_*.md` execution brief and
> one `docs/planning/TASK_BREAKDOWN.md` section. The `run-batch` skill drives a
> per-branch worktree, the gate set, the self-correction loop, and the
> squash-merge into local `main`. Do not execute tasks inline from this file;
> run `/run-batch 24` (then 25, 26, 27 in order).

**Goal:** Fix ten reported issues and add a user profile page and admin user
management, adapting patterns from the sibling repo
`/Users/talo/www/claude-code-ai-coach-assistant`.

**Architecture:** Four sequential batches (24-27). This project already shares
the reference repo's auth scaffold (`user_roles`, `profiles`, `requireAdmin`,
`resolvePostAuthDestination`); the work activates and extends those patterns.
Count fixes and the instructor-enrollment block are enforced at the database
layer (a `security definer` view/RPC and RLS), not in JS. Admin user management
uses a server-only service-role data layer because RLS prevents cross-user
reads.

**Tech Stack:** Next.js App Router, React 18, TypeScript strict, Tailwind,
shadcn/ui, Supabase (auth + DB + Storage), next-intl, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-16-ADMIN_PROFILE_FIXES_AND_USER_MANAGEMENT_DESIGN.md`.

---

## Batch Map

| Batch | Prompt File | Issues | Branch |
| --- | --- | --- | --- |
| 24 | `24_AUTH_ROUTING_COUNT_FIXES_AND_CHROME.md` | 1, 2, 3, 4, 9, 10 | `fix/24-routing-counts-chrome` |
| 25 | `25_USER_PROFILE_PAGE.md` | 7 | `feature/25-user-profile` |
| 26 | `26_ADMIN_USER_MANAGEMENT.md` | 8 | `feature/26-admin-user-management` |
| 27 | `27_ABOUT_CONTENT_AND_CONTACT_MAPS.md` | 5, 6 | `feature/27-about-content-and-maps` |

Order matters: 24 lands the role-branch that 26 depends on; 25 establishes the
profile/header-menu patterns 26 reuses; 27 is independent and carries the new
env var, so nothing earlier blocks on the Google Maps key.

---

## Batch 24: Auth Routing, Count Fixes, Scroll, Chrome

**Issues:** 1, 2, 3, 4, 9, 10. No new dependencies.

**Files:**

- Modify: `lib/auth/post-auth-redirect.ts` (role branch)
- Modify: `lib/dashboard/admin-queries.ts` (call the count view/RPC)
- Create: `supabase/migrations/0005_dashboard_counts_and_block_instructor_enrollment.sql`
- Modify: the seed script (remove instructor enrollment seed)
- Modify: `components/tutor/tutor-chat.tsx` (mount guard)
- Modify: `components/site-header.tsx` (logo clears border)
- Modify: `components/site-footer.tsx` (remove logo block)
- Test: `lib/auth/post-auth-redirect.test.ts`, dashboard count test, e2e for
  scroll-top + chrome.

### Task 24.1: Post-login role routing (#1)

- [ ] Write a failing unit test: `resolvePostAuthDestination` returns
  `/admin/dashboard` when `isInstructor` resolves true and `/dashboard` when
  false (mock `lib/auth/roles`).
- [ ] Run it; expect FAIL (current impl always returns `/dashboard`).
- [ ] Implement: in `lib/auth/post-auth-redirect.ts`, `await isInstructor(userId)`
  and branch the return. Keep the function pure of `?redirect=` handling.
- [ ] Run the test; expect PASS.
- [ ] Commit.

### Task 24.2: Dashboard count view/RPC + instructor exclusion (#2, #3)

- [ ] Write the migration
  `0005_dashboard_counts_and_block_instructor_enrollment.sql`: a
  `security definer` view or RPC returning student count (distinct
  non-instructor enrollers), enrollment count (non-instructor rows), and the
  per-course completion breakdown with the same exclusion. Apply it to the
  linked Supabase project via MCP.
- [ ] Add to the same migration: an RLS `WITH CHECK` on `enrollments` INSERT
  denying instructor-role users; a `DELETE` of existing instructor-owned
  enrollment rows.
- [ ] Modify `lib/dashboard/admin-queries.ts`: `getAdminOverviewStats` and
  `getCourseCompletionRates` read the view/RPC instead of fetching all rows.
  DTO shape unchanged.
- [ ] Fix the seed script so it never enrolls the instructor.
- [ ] Write/adjust a test asserting the counts exclude instructors against
  seeded data; run to PASS.
- [ ] Commit.

### Task 24.3: Course auto-scroll guard (#4)

- [ ] Write a failing e2e: loading a course page leaves the window scrolled to
  top (the tutor is NOT scrolled into view on mount).
- [ ] Run it; expect FAIL.
- [ ] Implement: in `components/tutor/tutor-chat.tsx`, add a mount/prev-count
  guard so the `scrollIntoView` effect skips the first render and fires only on
  message append or streaming start.
- [ ] Run the e2e; expect PASS.
- [ ] Commit.

### Task 24.4: Header logo clears border (#9)

- [ ] Implement: in `components/site-header.tsx`, constrain the logo within the
  header content box so it clears the `border-b` hairline.
- [ ] Verify in the e2e responsive suite (390/768/1280, EN+HE) - no overflow,
  header intact.
- [ ] Commit.

### Task 24.5: Remove footer logo (#10)

- [ ] Implement: delete the `<Link><Logo/></Link>` block in
  `components/site-footer.tsx`; keep nav + copyright.
- [ ] Run the e2e responsive suite; expect PASS.
- [ ] Commit.

### Task 24.6: Gates + capture

- [ ] Run the full gate set to exit 0 (`lint`, `lint:i18n`, `typecheck`,
  `build`, `test`, `test:e2e`).
- [ ] Append to `docs/DECISIONS.md` and update
  `docs/planning/IMPLEMENTATION_LOG.md` + the `academy-build-state` memory.
- [ ] Squash-merge into local `main`.

---

## Batch 25: User Profile Page

**Issue:** 7. Adapted from the reference repo profile page + actions.

**Files:**

- Create: `app/[locale]/profile/page.tsx`
- Create: `lib/profile/profile-actions.ts` (`import "server-only"`)
- Create: `lib/profile/resolve-profile-message.ts` (allowlist resolver)
- Create: `lib/validation/profile.ts` (Zod schemas)
- Create: `supabase/migrations/0006_avatars_storage_bucket.sql`
- Modify: the header component (add Profile link to the user menu)
- Modify: `messages/en-US.json`, `messages/he-IL.json` (new `Profile` namespace)
- Test: action mapping, resolver, validation unit tests; e2e for fields +
  contact round-trip + header link.

### Task 25.1: Avatars storage bucket migration

- [ ] Write `0006_avatars_storage_bucket.sql`: a public-read `avatars` bucket;
  RLS so a user reads/writes only `{user_id}/` objects; public read for display.
  Apply via MCP.
- [ ] Commit.

### Task 25.2: Validation schemas

- [ ] Write failing unit tests for `lib/validation/profile.ts` (contact, email,
  password match + length, locale enum, avatar MIME/size).
- [ ] Run; expect FAIL.
- [ ] Implement the Zod schemas; run; expect PASS.
- [ ] Commit.

### Task 25.3: Profile actions + resolver

- [ ] Write failing unit tests for `resolve-profile-message` (code -> localized
  key allowlist) and for each action's feedback-code mapping.
- [ ] Run; expect FAIL.
- [ ] Implement `lib/profile/profile-actions.ts` (`ensureProfile`,
  `updateProfile`, `updateEmail`, `updatePassword`, `updateAvatar`,
  `updateLocale` + FormData wrappers) and the resolver.
- [ ] Run; expect PASS.
- [ ] Commit.

### Task 25.4: Profile page + header link + i18n

- [ ] Add the `Profile` namespace to both catalogs, key-identical.
- [ ] Implement `app/[locale]/profile/page.tsx` (guarded by `requireUser()`)
  with the five sections as no-JS forms; add the Profile link to the header user
  menu for both roles.
- [ ] Write an e2e: signed-in user sees the Profile link, the page renders all
  fields, the contact round-trip works, no-overflow at 390/768/1280 EN+HE.
- [ ] Run; expect PASS.
- [ ] Commit.

### Task 25.5: Gates + capture

- [ ] Full gate set to exit 0.
- [ ] DECISIONS + IMPLEMENTATION_LOG + memory.
- [ ] Squash-merge into local `main`.

---

## Batch 26: Admin User Management

**Issue:** 8. Depends on 24 (role branch) and 25 (profile/header patterns).

**Files:**

- Create: `app/[locale]/admin/users/page.tsx`,
  `app/[locale]/admin/users/[userId]/page.tsx`,
  `app/[locale]/admin/users/layout.tsx` (requireAdmin guard)
- Create: `lib/admin/users.ts` (`import "server-only"`, service-role client)
- Create: `lib/admin/resolve-users-message.ts` (allowlist resolver)
- Create: `lib/validation/admin-users.ts` (invite/role/disable schemas)
- Modify: admin dashboard (link to Users)
- Modify: `messages/en-US.json`, `messages/he-IL.json` (new `AdminUsers`)
- Test: action mapping, last-instructor guard, self-protection unit tests; e2e
  for table, role-change round-trip, student-redirect.

### Task 26.1: Service-role data layer

- [ ] Write failing unit tests for `lib/admin/users.ts` guards: every function
  calls `requireAdmin()` first; `setUserRole`/`deleteUser`/`setUserDisabled`
  enforce self-protection; the last-instructor guard refuses to demote/delete
  the final instructor.
- [ ] Run; expect FAIL.
- [ ] Implement `lib/admin/users.ts` using a service-role Supabase Admin client
  from `SUPABASE_SERVICE_ROLE_KEY`: `listUsers`, `getUser`, `setUserRole`,
  `inviteUser` (`inviteUserByEmail`), `setUserDisabled` (`ban_duration`),
  `deleteUser`. Each calls `requireAdmin()` first.
- [ ] Run; expect PASS.
- [ ] Commit.

### Task 26.2: Validation + resolver

- [ ] Write failing unit tests for `lib/validation/admin-users.ts` (invite email,
  role enum, disable toggle) and `resolve-users-message`.
- [ ] Run; expect FAIL.
- [ ] Implement; run; expect PASS.
- [ ] Commit.

### Task 26.3: Pages + actions + i18n

- [ ] Add the `AdminUsers` namespace to both catalogs, key-identical.
- [ ] Implement the layout (requireAdmin guard), the list page (paginated
  table), and the per-user page with Tier-2 FormData actions; destructive
  actions require a confirm step. Link from the admin dashboard.
- [ ] Write an e2e: the table renders; a role-change round-trips; a student
  hitting `/admin/users` is redirected; no-overflow/RTL at 390/768/1280.
- [ ] Run; expect PASS.
- [ ] Commit.

### Task 26.4: Invite template doc + gates + capture

- [ ] Document the styled invite HTML template and the manual paste step (Auth
  -> Email Templates -> Invite) in DECISIONS + the spec env section.
- [ ] Full gate set to exit 0.
- [ ] DECISIONS + IMPLEMENTATION_LOG + memory.
- [ ] Squash-merge into local `main`.

---

## Batch 27: About Content And Contact Google Maps

**Issues:** 5, 6. Independent; needs `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`.

**Files:**

- Modify: `app/[locale]/about/page.tsx` (render real content keys)
- Modify: `app/[locale]/contact/page.tsx` (maps iframe + fallback)
- Modify: `messages/en-US.json`, `messages/he-IL.json` (expand `About`,
  add Contact map keys)
- Test: e2e for About headings EN+HE and the Contact map/placeholder branch.

### Task 27.1: Port About content (#5)

- [ ] Add the six About sections from `docs/content/ABOUT_EN.md` and
  `ABOUT_HE.md` to the `About` namespace as discrete heading + paragraph keys,
  key-identical EN+HE (English canonical).
- [ ] Modify `app/[locale]/about/page.tsx` to render the keys in order, keeping
  the hero-image slot and layout.
- [ ] Commit.

### Task 27.2: Contact Google Maps (#6)

- [ ] Implement: in `app/[locale]/contact/page.tsx`, render a Maps Embed API
  iframe (`/maps/embed/v1/place?key=...&q=...`) with a localized `title` when
  `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` is set; fall back to the existing
  placeholder box when absent.
- [ ] Add the Contact map i18n keys to both catalogs.
- [ ] Write an e2e: the About headings render in EN+HE (no-overflow at
  390/768/1280); the Contact page shows the iframe when the key is set and the
  placeholder when unset.
- [ ] Run; expect PASS.
- [ ] Commit.

### Task 27.3: Gates + capture

- [ ] Full gate set to exit 0.
- [ ] DECISIONS + IMPLEMENTATION_LOG + memory.
- [ ] Squash-merge into local `main`.

---

## Self-Review

- **Spec coverage:** All ten issues map to a task (1->24.1, 2/3->24.2, 4->24.3,
  9->24.4, 10->24.5, 7->25.x, 8->26.x, 5->27.1, 6->27.2). Env vars covered in the
  spec env section and surfaced in batches 26 (service-role) and 27 (maps key).
- **Placeholder scan:** No TBD/TODO; each task names exact files and the action.
  Code-level specifics live in the prompt files (the execution briefs), per this
  project's convention where the prompt file is the verbatim brief.
- **Type consistency:** DTO names (`AdminOverviewStats`, `CourseCompletionRate`)
  match the spec; action names are consistent across plan and spec.

## Execution Handoff

This plan is executed via `/run-batch`. Do NOT execute inline. After the
documentation is committed to local `main`, the user kicks off batches on demand:
`/run-batch 24`, then `25`, `26`, `27` in order.
