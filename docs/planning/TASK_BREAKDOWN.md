# Task Breakdown: Eyal's Coding Academy

## Execution Rules

1. Work in small to medium tasks.
2. Complete Task 0 before implementing new features.
3. Preserve existing functionality unless a verified defect requires a targeted fix.
4. Prefer add/update over rewrite.
5. Every batch must end with verification commands and manual checks.
6. New user-visible strings must be added to English and Hebrew catalogs.
7. New exported utilities and server functions must include TSDoc.
8. Do not commit secrets.
9. Use Claude Code Skills and MCPs according to task type.

## Batch 0: Verify Existing Implementation And Establish Baseline

### Task 0.1: Verify Repository And Template State

Objective: Confirm the installed template, project scripts, dependency versions, and project structure.

Actions:

- Inspect `package.json`, lockfile, app directory, component directories, Supabase utilities, localization config, middleware, and environment examples.
- Confirm scripts for `dev`, `build`, `lint`, `format`, `typecheck`, and tests.
- Confirm current Next.js, React, TypeScript, Tailwind, shadcn, Supabase, Vercel AI, next-intl, Turnstile, Vitest, and Playwright packages.

Acceptance:

- A baseline note is added to the implementation log.
- No new feature work starts until the baseline is known.

Tests:

- `npm run typecheck`
- `npm run lint`
- `npm run build` if current baseline supports it.

Prompt file: `docs/prompts/00_VERIFY_EXISTING_IMPLEMENTATION.md`

### Task 0.2: Verify Environment Variables

Objective: Confirm `.env.local` has all required variables without exposing values.

Actions:

- Check presence, not secret values.
- Verify Supabase URL/publishable/secret keys.
- Verify AI gateway key.
- Verify app URL.
- Verify Turnstile keys.
- Verify optional YouTube key status.
- Verify Vercel environment sync plan.

Acceptance:

- A safe env checklist exists with present/missing status.
- No secret values are printed into docs, logs, prompts, or commits.

Tests:

- Run app locally and verify no missing-env errors.

### Task 0.3: Verify Auth And Session Flow

Objective: Confirm sign up, login, logout, remember me, forgot password, and request session refresh.

Actions:

- Inspect auth pages/components.
- Inspect Supabase server/browser/admin clients.
- Inspect middleware or request refresh logic.
- Test auth manually in browser.
- Verify no-JS fallback behavior where already implemented.

Acceptance:

- Existing auth flow remains the source of truth.
- Known defects are documented before fixing.

Tests:

- Add or update auth smoke tests only if current test structure supports it.

### Task 0.4: Verify Localization, RTL, Theme, PWA, Accessibility

Objective: Confirm existing cross-cutting behavior before adding pages.

Actions:

- Verify `app/[locale]/` route conventions.
- Verify English and Hebrew catalogs.
- Verify RTL direction handling.
- Verify light/dark theme toggling.
- Verify PWA manifest/service worker.
- Verify accessibility/no-JS conventions.

Acceptance:

- New feature implementation has clear conventions to follow.

### Task 0.5: Verify AI Route And MCP/Skills Setup

Objective: Confirm AI and Claude Code workflow foundations.

Actions:

- Inspect current `/api/chat` route.
- Verify Vercel AI Gateway usage and model configuration.
- Verify Supabase MCP, Context7 MCP, Magic MCP availability where possible.
- Verify Skills usage instructions are documented for follow-up prompts.

Acceptance:

- AI tutor can extend current AI route pattern or use a dedicated route based on documented reasoning.

## Batch 1: Planning Alignment And Test Harness

### Task 1.1: Add Implementation Log

Objective: Create a project-local implementation log to preserve decisions.

Files:

- `docs/planning/IMPLEMENTATION_LOG.md`

Acceptance:

- Includes Task 0 findings, known constraints, open risks, and decisions.

Tests:

- Documentation only.

### Task 1.2: Verify And Normalize Test Tooling

Objective: Ensure Vitest, Testing Library, jsdom, and Playwright are configured.

Actions:

- Inspect current test setup.
- Add missing config only if not already present.
- Add `tests/unit`, `tests/integration`, and `tests/e2e` conventions.
- Add test setup file if needed.

Acceptance:

- Unit test command runs.
- Playwright command runs or has documented prerequisites.

Tests:

- `npm test`
- `npx playwright test --list`

### Task 1.3: Add Shared Test Factories

Objective: Make later tests cheaper and consistent.

Files:

- `tests/factories/course.ts`
- `tests/factories/lesson.ts`
- `tests/factories/user.ts`

Acceptance:

- Factories are typed and reusable.
- No real secrets or external services are used.

## Batch 2: Database Schema, RLS, Seed Data

### Task 2.1: Plan Supabase Schema

Objective: Produce a database plan before migrations.

Actions:

- Define tables: `profiles`, `courses`, `lessons`, `enrollments`, `lesson_progress`, `ai_tutor_conversations`, `ai_tutor_messages`.
- Define indexes, constraints, triggers, views, and RLS policies.
- Decide whether to use enums or text constraints.

Acceptance:

- Schema plan is documented before SQL is applied.

Prompt file: `docs/prompts/01_DATABASE_SCHEMA_AND_RLS.md`

### Task 2.2: Create Initial Course Platform Migration

Objective: Implement core tables and relationships.

Files:

- `supabase/migrations/<timestamp>_course_platform_core.sql`

Acceptance:

- Tables exist.
- Foreign keys enforce relationships.
- Unique constraints prevent duplicate enrollment/progress.
- `updated_at` trigger exists where needed.

Tests:

- Apply migration to local/linked Supabase environment.
- Verify tables through Supabase MCP or dashboard.

### Task 2.3: Add RLS Policies

Objective: Enforce privacy and admin access.

Actions:

- Enable RLS on all relevant tables.
- Add student-owned access policies.
- Add admin management policies.
- Add helper `is_admin()` function.

Acceptance:

- Student cannot access another student's progress/conversations.
- Admin can manage courses and lessons.

Tests:

- Supabase SQL tests or manual role-based queries.

### Task 2.4: Add Seed Data

Objective: Add realistic sample data for course browsing and local testing.

Files:

- `supabase/seed.sql`

Acceptance:

- At least two sample courses.
- At least three lessons per course.
- Optional sample profiles if auth seeding supports it safely.

### Task 2.5: Generate Database Types

Objective: Keep TypeScript aligned with Supabase schema.

Actions:

- Generate or update database types using the existing project convention.
- Place generated types in the existing Supabase type path.

Acceptance:

- Data access modules compile against generated types.

## Batch 3: Domain Types, Validation, And Data Access

### Task 3.1: Add Course And Lesson Domain Types

Objective: Create stable TypeScript models for UI and server logic.

Files:

- `lib/courses/types.ts`
- `lib/progress/types.ts`
- `lib/tutor/types.ts`

Acceptance:

- Types map Supabase rows to UI-safe DTOs.
- Exported types include TSDoc where useful.

### Task 3.2: Add Validation Schemas

Objective: Validate all external input.

Files:

- `lib/validation/course.ts`
- `lib/validation/lesson.ts`
- `lib/validation/tutor.ts`

Acceptance:

- Course, lesson, enrollment, progress, and tutor inputs are validated.

Tests:

- Unit tests for valid and invalid inputs.

### Task 3.3: Add YouTube URL Parser

Objective: Extract and validate YouTube video and playlist IDs.

Files:

- `lib/youtube/parser.ts`
- `tests/unit/youtube-parser.test.ts`

Acceptance:

- Supports common YouTube URL shapes.
- Rejects non-YouTube URLs.
- Does not call external APIs in parser tests.

Prompt file: `docs/prompts/02_YOUTUBE_PARSER_AND_METADATA.md`

### Task 3.4: Add Course Query Functions

Objective: Centralize course catalog and course detail reads.

Files:

- `lib/courses/queries.ts`

Acceptance:

- Public course catalog reads published courses only.
- Course detail includes ordered lessons and lesson count.
- Queries are typed and documented.

Tests:

- Integration tests with mocked Supabase client.

### Task 3.5: Add Progress Calculation Utilities

Objective: Compute progress consistently.

Files:

- `lib/progress/calculate.ts`
- `tests/unit/progress.test.ts`

Acceptance:

- Handles zero lessons.
- Handles partial completion.
- Handles full completion.
- Returns integer or fixed decimal percent by product decision.

## Batch 4: Public Home And Course Catalog

### Task 4.1: Build Localized Home Page Data Loader

Objective: Load real courses from Supabase for the home page.

Files:

- Existing `app/[locale]/.../page.tsx` home route.
- `lib/courses/queries.ts` updates if needed.

Acceptance:

- Home page reads courses from Supabase.
- Loading and empty states are handled.

Prompt file: `docs/prompts/03_HOME_PAGE_AND_CATALOG.md`

### Task 4.2: Build Course Card And Catalog Components

Objective: Render professional course catalog UI.

Files:

- `components/courses/COURSE_CARD.tsx` or existing naming convention.
- `components/courses/COURSE_CATALOG.tsx` or existing naming convention.

Acceptance:

- Shows title, description, level, lesson count, cover image, CTA.
- Supports light/dark, mobile, EN/HE, RTL.

Tests:

- Component tests for rendering required fields.

### Task 4.3: Add Enrollment CTA Behavior

Objective: Let authenticated students enroll from catalog/course pages.

Files:

- `lib/courses/actions.ts`
- `components/courses/ENROLLMENT_BUTTON.tsx`

Acceptance:

- Anonymous users are routed to login/signup.
- Authenticated users can enroll idempotently.
- Already enrolled users see continue action.

Tests:

- Integration test for enrollment action.
- E2E smoke flow for enrollment.

## Batch 5: Course Learning Page And Progress

### Task 5.1: Build Course Learning Route

Objective: Create student course experience.

Files:

- `app/[locale]/.../courses/[courseSlug]/learn/[[...lessonSlug]]/page.tsx` or existing route convention.

Acceptance:

- Loads course, lessons, selected lesson, and current student's progress.
- Requires auth for non-preview learning.

Prompt file: `docs/prompts/04_COURSE_PAGE_AND_PROGRESS.md`

### Task 5.2: Build Lesson Sidebar

Objective: Show ordered lessons and completion status.

Files:

- `components/courses/LESSON_SIDEBAR.tsx`

Acceptance:

- Completed lessons show checkmark.
- Current lesson is visually clear.
- Sidebar works on mobile.

Tests:

- Component tests for active and completed states.

### Task 5.3: Build YouTube Player Component

Objective: Embed selected lesson video safely and accessibly.

Files:

- `components/youtube/YOUTUBE_PLAYER.tsx`

Acceptance:

- Uses video ID from trusted database data.
- Includes accessible title.
- Handles missing/invalid video state.

### Task 5.4: Implement Mark As Watched Action

Objective: Persist lesson completion.

Files:

- `lib/progress/actions.ts`
- `components/courses/MARK_WATCHED_BUTTON.tsx`

Acceptance:

- Completion write is idempotent.
- Progress updates immediately.
- Course completion is detected.
- Student cannot mark progress for another user.

Tests:

- Unit tests for progress calculation.
- Integration tests for action behavior.
- E2E course progress flow.

### Task 5.5: Add Automatic Next Lesson Behavior

Objective: Improve learning flow after completion.

Acceptance:

- After marking watched, student moves to next lesson if one exists.
- If course is complete, student sees completion state.

## Batch 6: Admin Course Management And YouTube Import

### Task 6.1: Add Admin Route Guard

Objective: Protect all admin pages server-side.

Files:

- `lib/auth/guards.ts`
- Admin layout or page files.

Acceptance:

- Non-admin users cannot access admin routes.
- Admin check is server-side.

Tests:

- Unit/integration guard tests.
- E2E non-admin access denial.

### Task 6.2: Build Admin Course List

Objective: Let Eyal view and manage courses.

Files:

- `app/[locale]/admin/courses/page.tsx`
- `components/admin/ADMIN_COURSE_TABLE.tsx`

Acceptance:

- Shows draft/published/archived courses.
- Admin can navigate to edit/create.

Prompt file: `docs/prompts/05_ADMIN_COURSE_MANAGEMENT.md`

### Task 6.3: Build Course Create/Edit Form

Objective: Create and update course metadata.

Files:

- `components/admin/ADMIN_COURSE_FORM.tsx`
- `lib/admin/course-actions.ts`

Acceptance:

- Validates title, slug, description, level, cover image, status.
- Persists changes to Supabase.
- Shows localized errors.

Tests:

- Validation unit tests.
- Integration test for create/update action.

### Task 6.4: Build Lesson Add/Edit Form

Objective: Add and update lessons from YouTube video URLs.

Files:

- `components/admin/ADMIN_LESSON_FORM.tsx`
- `lib/admin/lesson-actions.ts`

Acceptance:

- Valid YouTube video saves as lesson.
- Invalid link shows helpful error.
- Sort order is assigned safely.

Tests:

- Parser tests.
- Integration test for lesson creation.

### Task 6.5: Build Playlist Import

Objective: Import multiple lessons from a YouTube playlist when API key exists.

Files:

- `lib/youtube/playlist.ts`
- `app/[locale]/api/youtube/playlist/route.ts` or server action.
- `components/admin/YOUTUBE_PLAYLIST_IMPORT.tsx`

Acceptance:

- If `YOUTUBE_API_KEY` exists, playlist items can be imported.
- If missing, UI documents the requirement without crashing.
- Admin can review or confirm imported lessons.

Tests:

- Mocked fetch integration tests.

### Task 6.6: Build Lesson Reordering

Objective: Allow admin to reorder lessons.

Files:

- `components/admin/LESSON_REORDER_LIST.tsx`
- `lib/admin/reorder-lessons.ts`

Acceptance:

- Order persists.
- Race conditions are handled with transaction-like update strategy where possible.

## Batch 7: AI Tutor With Context And Persistence

### Task 7.1: Design Tutor Prompt Builder

Objective: Create deterministic context assembly for the AI tutor.

Files:

- `lib/tutor/prompt.ts`
- `tests/unit/tutor-prompt.test.ts`

Acceptance:

- Includes course title, course description, lesson title, lesson description, YouTube URL, locale, and recent messages.
- Explicitly prevents fake timestamp claims.

Prompt file: `docs/prompts/06_AI_TUTOR_CONTEXT_AND_PERSISTENCE.md`

### Task 7.2: Add Tutor Data Access

Objective: Store and fetch conversations/messages.

Files:

- `lib/tutor/queries.ts`
- `lib/tutor/actions.ts`

Acceptance:

- Creates conversation if needed.
- Reads only current user's messages unless admin flow.
- Caps recent history.

Tests:

- Integration tests with mocked Supabase.

### Task 7.3: Build Tutor Streaming Route

Objective: Stream contextual AI response and persist messages.

Files:

- `app/[locale]/api/tutor/route.ts` or existing API structure.

Acceptance:

- Auth required.
- Course/lesson context loaded server-side.
- User message and assistant response persisted.
- Handles model errors safely.

Tests:

- Integration test with mocked AI stream.

### Task 7.4: Build Tutor Chat UI

Objective: Add AI chat to course page.

Files:

- `components/tutor/TUTOR_CHAT.tsx`

Acceptance:

- Shows history.
- Streams response.
- Handles loading, error, retry.
- Works on mobile and RTL.

Tests:

- Component tests for message states.
- E2E tutor flow with mocked AI if needed.

## Batch 8: Student And Teacher Dashboards

### Task 8.1: Build Student Dashboard Queries

Objective: Gather student progress data.

Files:

- `lib/dashboard/student-queries.ts`

Acceptance:

- Returns enrolled courses, progress percent, recent lessons, weekly activity, badges.
- Data is scoped to current user.

Prompt file: `docs/prompts/07_DASHBOARDS.md`

### Task 8.2: Build Student Dashboard Page

Objective: Render student dashboard.

Files:

- `app/[locale]/dashboard/page.tsx`
- `components/dashboard/STUDENT_DASHBOARD.tsx`

Acceptance:

- Shows enrolled courses and progress.
- Handles empty state.
- Mobile-ready.

### Task 8.3: Build Teacher Dashboard Queries

Objective: Gather admin analytics.

Files:

- `lib/dashboard/admin-queries.ts`

Acceptance:

- Returns student count, enrollment count, course completion rates, inactive students, common tutor questions, recent activity.
- Requires admin role.

### Task 8.4: Build Teacher Dashboard Page

Objective: Render admin analytics dashboard.

Files:

- `app/[locale]/admin/dashboard/page.tsx`
- `components/dashboard/TEACHER_DASHBOARD.tsx`

Acceptance:

- Admin sees useful analytics.
- Non-admin blocked.
- Empty states are clear.

Tests:

- E2E admin dashboard visibility.

## Batch 9: Localization, SEO, Accessibility, PWA, Security Polish

### Task 9.1: Complete EN/HE Message Catalogs

Objective: Ensure all new strings are localized.

Actions:

- Add missing keys.
- Verify no hard-coded strings remain in new components.

Tests:

- Static grep or review.
- E2E Hebrew route smoke test.

Prompt file: `docs/prompts/08_LOCALIZATION_SEO_ACCESSIBILITY_POLISH.md`

### Task 9.2: Add SEO Metadata

Objective: Make public pages SEO-ready.

Actions:

- Add localized metadata to home and course pages.
- Add Open Graph data.
- Ensure private pages are noindex.

Acceptance:

- Metadata is generated per locale.

### Task 9.3: Accessibility Review

Objective: Keep the app usable and reviewable.

Actions:

- Check headings, labels, error messages, focus order, keyboard navigation, color contrast, and video titles.
- Verify modals/drawers from Magic MCP components are accessible after adaptation.

Acceptance:

- No critical accessibility blockers in core flows.

### Task 9.4: Error, Loading, Empty States

Objective: Make product resilient and polished.

Actions:

- Add skeletons for catalog, dashboards, and course page.
- Add empty states for no courses, no lessons, no progress, no tutor messages.
- Add localized error states for Supabase, YouTube, and AI failures.

### Task 9.5: Security Review

Objective: Catch leakage and auth problems before deployment.

Actions:

- Confirm secret env vars are server-only.
- Confirm `.env.local` and `.mcp.json` are ignored.
- Confirm admin actions are server-side guarded.
- Confirm RLS is enabled.
- Confirm AI route does not expose raw internal errors.

## Batch 10: Test Completion

### Task 10.1: Complete Unit Test Suite

Objective: Cover core pure logic.

Required tests:

- YouTube parser.
- Progress calculation.
- Badge calculation.
- Slug generation.
- Validation.
- Tutor prompt builder.

Prompt file: `docs/prompts/09_TESTING_AND_QA.md`

### Task 10.2: Complete Integration Test Suite

Objective: Cover server actions and route behavior with mocks.

Required tests:

- Enrollment action.
- Mark watched action.
- Admin course creation.
- Lesson creation.
- Tutor route persistence.
- YouTube metadata route.

### Task 10.3: Complete Playwright E2E Suite

Objective: Cover reviewer-critical flows.

Required flows:

- Public home and course catalog.
- Student enrollment and progress.
- AI tutor question and refresh persistence.
- Admin course creation and lesson add.
- Admin route protection.
- Hebrew RTL smoke test.

## Batch 11: Deployment And Submission

### Task 11.1: Pre-Deployment Checks

Objective: Confirm project is ready for production.

Commands:

```bash
npm run lint
npm run typecheck
npm test
npx playwright test
npm run build
```

Acceptance:

- All required checks pass or failures are documented and fixed.

Prompt file: `docs/prompts/10_DEPLOYMENT_AND_FINAL_REVIEW.md`

### Task 11.2: Vercel Environment Verification

Objective: Confirm production config.

Actions:

- Add required env vars to Vercel.
- Add optional `YOUTUBE_API_KEY` if playlist import is required.
- Confirm Supabase auth redirect URLs include production URL.
- Confirm AI tutor route works in deployed environment.

### Task 11.3: Final Reviewer Flow

Objective: Validate assignment completion standard.

Flow:

1. View home page.
2. Open a course.
3. Enroll as a student.
4. Watch a lesson.
5. Mark the lesson as watched.
6. See progress update.
7. Ask AI tutor a contextual question.
8. Open student dashboard.
9. Open teacher dashboard.

Acceptance:

- Flow passes in production.

## Optional Bonus Batch

### Bonus 1: Completion Certificates

- Generate PDF certificate when a course is completed.
- Store certificate metadata.
- Add download link to dashboard.

### Bonus 2: Smart Search

- Add search inside lesson titles/descriptions.
- Optionally add transcript-based search if transcript API is integrated.

### Bonus 3: Class Groups

- Add class groups and group dashboard.

### Bonus 4: Reminders

- Notify inactive students if email/message integration exists.

### Bonus 5: Payments

- Add Stripe product/payment flow after core platform is stable.
