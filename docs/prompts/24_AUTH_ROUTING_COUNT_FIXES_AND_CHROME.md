# Prompt: Auth Routing, Count Fixes, Scroll, And Chrome

```text
Fix six reported issues that are pure logic, database, and presentation: admin
post-login routing, the inflated admin-dashboard student/enrollment counts,
the course page auto-scrolling to the tutor on load, the header logo overlapping
its border, and the redundant footer logo. No new dependencies.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-16-ADMIN_PROFILE_FIXES_AND_USER_MANAGEMENT_DESIGN.md (Batch 24).
- Implementation plan: docs/superpowers/plans/2026-06-16-admin-profile-fixes-and-user-management.md (Batch 24).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Reference repo for adaptation: /Users/talo/www/claude-code-ai-coach-assistant.
  This project shares its auth scaffold (user_roles, profiles, requireAdmin,
  resolvePostAuthDestination). Activate the patterns; do not invent new ones.
- #1 cause: lib/auth/post-auth-redirect.ts hard-returns "/dashboard" for everyone
  (void userId; return "/dashboard"). It is the single chokepoint (login action +
  email-confirm route both call it). Role lookup is lib/auth/roles.ts isInstructor.
- #2/#3 cause (verified against the live DB): lib/dashboard/admin-queries.ts
  getAdminOverviewStats counts distinct enrollments.user_id with NO role filter;
  the instructor has an enrollment. Live: total_enrollments=3,
  enrolled_users_who_are_instructors=1, distinct_enrolled_users=2, real
  students=1. The "students" and "enrollments" stats both over-count by including
  the instructor.
- #4 cause: components/tutor/tutor-chat.tsx has a useEffect([messages, isStreaming])
  that calls bottomRef.current?.scrollIntoView on initial mount; the tutor sits
  low on the course page, so the page jumps to the bottom on load.
- #9/#10: components/site-header.tsx logo crosses the header border-b hairline;
  components/site-footer.tsx renders a redundant <Link><Logo/></Link> block.
- The linked Supabase project is nlqpuppwjtxhfcfyjfre (claude-code-coding-academy);
  apply migrations to it via the Supabase MCP.

Requirements:
1. Post-login routing (#1): in lib/auth/post-auth-redirect.ts, make
   resolvePostAuthDestination(userId) await isInstructor(userId) and return
   "/admin/dashboard" for instructors, "/dashboard" for students. Keep it a pure
   function of the user id + role lookup; do NOT touch the callers' ?redirect=
   precedence. Update its unit test with an instructor-branch case (mock
   isInstructor true and false).
2. Dashboard counts (#2, #3): add a migration
   0005_dashboard_counts_and_block_instructor_enrollment.sql with a
   security definer view OR rpc (consistent with the existing is_instructor()
   pattern) that returns: student count = distinct enrollments.user_id whose user
   does NOT hold the instructor role; enrollment count = enrollments rows owned by
   non-instructor users; and the same exclusion applied to the per-course
   completion breakdown. Rewrite lib/dashboard/admin-queries.ts
   getAdminOverviewStats and getCourseCompletionRates to read the view/rpc instead
   of fetching all rows into JS and counting. Keep the DTO shapes
   (AdminOverviewStats, CourseCompletionRate) unchanged.
3. Block instructor enrollment (#3): in the SAME migration, add an RLS WITH CHECK
   on enrollments INSERT that denies the row when the inserting user holds the
   instructor role (use the is_instructor()-style helper hard-coded to
   auth.uid()). Then DELETE existing instructor-owned enrollment rows. Fix the
   seed script (npm run seed path) so it never enrolls the instructor account.
   Apply the migration to the linked Supabase project via MCP.
4. Course auto-scroll (#4): in components/tutor/tutor-chat.tsx, add a
   mount/prev-count guard so the scrollIntoView effect SKIPS the first render and
   only fires when messages is appended or streaming starts. Preserve the existing
   streaming, a11y, and RTL behavior.
5. Header logo (#9): in components/site-header.tsx, constrain the logo within the
   header content box so it clears the border-b hairline (adjust max-height /
   alignment against the header height). No layout rewrite.
6. Footer logo (#10): in components/site-footer.tsx, delete the <Link><Logo/></Link>
   block; keep nav + copyright; confirm the flex/gap collapses cleanly.
7. Any new user-facing strings go to BOTH messages/en-US.json and
   messages/he-IL.json, key-identical (none expected for this batch).
8. TSDoc on any changed export.
9. Tests:
   - Unit: the role branch in resolvePostAuthDestination; any extracted count
     helper.
   - e2e: the course page is scrolled to top on load (the tutor is NOT scrolled
     into view); header + footer have no horizontal overflow at 390/768/1280 in
     EN (LTR) and HE (RTL); the admin dashboard renders corrected counts against
     seeded data (1 student; enrollment total excludes the instructor).
   - For any mocked Supabase access use the working { ...builder } pattern with
     then:(resolve:(v:unknown)=>unknown), NOT a strict index signature.
   - Run typecheck to its exit code; do not trust a tail of the log.
10. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory;
    append a dated entry to docs/DECISIONS.md.

Rules:
- Adapt from the reference repo's patterns; do not invent parallel mechanisms.
- Counts and the enrollment block are enforced at the DB layer (view/rpc + RLS),
  not in JS. Do not paper over the count bug with a JS filter on fetched rows.
- Presentation changes (#9, #10) are class/markup only; do not change routing or
  data access in those files.
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs. No Tailwind named-color literals or raw hex in app code.
- Never create middleware.ts (guard-no-middleware hard-fails).
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm test,
  and npm run test:e2e. All gates must exit 0. Gates need Node 22.16.0; prefix
  PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH".
- Worktree is a sibling ../academy-24-routing-counts-chrome, branch
  fix/24-routing-counts-chrome; squash-merge into local main when green.
```
