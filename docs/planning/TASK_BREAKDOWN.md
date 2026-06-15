# Task Breakdown: Eyal's Coding Academy

## Execution Rules

1. Work in small to medium tasks.
2. Complete Task 0 before implementing new features.
3. Preserve existing functionality unless a verified defect requires a targeted
   fix.
4. Prefer add/update over rewrite.
5. Every batch must end with verification commands and manual checks.
6. New user-visible strings must be added to English and Hebrew catalogs.
7. New exported utilities and server functions must include TSDoc.
8. Do not commit secrets.
9. Use Claude Code Skills and MCPs according to task type.
10. Before starting a task, open the prompt file mapped to that task below.

## Prompt File Map

Use this map when handing the task document to Claude Code. Each task inherits
the listed prompt file, even when the task section does not repeat the prompt
inline.

- Tasks 0.1-0.5: `docs/prompts/00_VERIFY_EXISTING_IMPLEMENTATION.md`
- Tasks 1.1-1.3:
  `docs/prompts/01_PLANNING_ALIGNMENT_AND_TEST_HARNESS.md`
- Tasks 2.1-2.5: `docs/prompts/02_DATABASE_SCHEMA_AND_RLS.md`
- Tasks 3.1, 3.2, 3.4, 3.5:
  `docs/prompts/03_DOMAIN_TYPES_VALIDATION_AND_DATA_ACCESS.md`
- Task 3.3: `docs/prompts/04_YOUTUBE_PARSER_AND_METADATA.md`
- Tasks 4.1-4.3: `docs/prompts/05_HOME_PAGE_AND_CATALOG.md`
- Tasks 5.1-5.5: `docs/prompts/06_COURSE_PAGE_AND_PROGRESS.md`
- Tasks 6.1-6.6: `docs/prompts/07_ADMIN_COURSE_MANAGEMENT.md`
- Tasks 7.1-7.4:
  `docs/prompts/08_AI_TUTOR_CONTEXT_AND_PERSISTENCE.md`
- Tasks 8.1-8.4: `docs/prompts/09_DASHBOARDS.md`
- Tasks 9.1-9.5:
  `docs/prompts/10_LOCALIZATION_SEO_ACCESSIBILITY_POLISH.md`
- Tasks 10.1-10.5: `docs/prompts/11_REQUIRED_EXTENDED_FEATURES.md`
- Tasks 11.1-11.3: `docs/prompts/12_TESTING_AND_QA.md`
- Tasks 12.1-12.3: `docs/prompts/13_DEPLOYMENT_AND_FINAL_REVIEW.md`
- Tasks 14.1-14.2 (Batch 14): `docs/prompts/14_YOUTUBE_PLAYLIST_IMPORT_LIVE.md`
- Tasks 15.1-15.3 (Batch 15): `docs/prompts/15_REMINDER_EMAIL_DELIVERY_SMTP.md`
- Tasks 16.1-16.4 (Batch 16): `docs/prompts/16_ABOUT_AND_CONTACT_PAGES.md`
- Tasks 17.1-17.3 (Batch 17):
  `docs/prompts/17_CATALOG_SCHEMA_CATEGORIES_AND_REVIEWS.md`
- Tasks 18.1-18.4 (Batch 18): `docs/prompts/18_COURSES_CATALOG_PAGE.md`
- Tasks 19.1-19.2 (Batch 19):
  `docs/prompts/19_COURSE_REVIEWS_AND_LESSON_SEARCH.md`
- Tasks 20.1-20.4 (Batch 20):
  `docs/prompts/20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md`
- Tasks 21.1-21.3 (Batch 21): `docs/prompts/21_HOME_HERO_AND_GLOBAL_CHROME.md`
- Tasks 22.1-22.3 (Batch 22):
  `docs/prompts/22_THEME_SURFACE_SWEEP_AND_POLISH.md`
- Tasks 23.1-23.3 (Batch 23):
  `docs/prompts/23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md`

The batches above 13 were appended after the initial 00-13 build (14-15 are
post-build add-ons; 16-19 implement the courses-catalog and content-pages
design spec; 20-23 implement the design-system & UX/UI overhaul spec). Their
detailed task sections live at the end of this document, under the matching
`## Batch NN` headings.

## Requirement Cross-Reference Map

Use this map before each Claude Code run. The prompt is the execution brief.
The task range is the acceptance checklist. The technical sections are the
source of truth for implementation details that the prompt may summarize.

| Batch | Tasks | Prompt File | Technical Requirements |
| --- | --- | --- | --- |
| 0 | 0.1-0.5 | `docs/prompts/00_VERIFY_EXISTING_IMPLEMENTATION.md` | Sections 1, 2, 3, 4, 5, 11, 12, 13, 15, 16, 17 |
| 1 | 1.1-1.3 | `docs/prompts/01_PLANNING_ALIGNMENT_AND_TEST_HARNESS.md` | Sections 1, 2, 14, 15, 17 |
| 2 | 2.1-2.5 | `docs/prompts/02_DATABASE_SCHEMA_AND_RLS.md` | Sections 5, 6, 7, 15, 16 |
| 3 | 3.1, 3.2, 3.4, 3.5 | `docs/prompts/03_DOMAIN_TYPES_VALIDATION_AND_DATA_ACCESS.md` | Sections 6.3, 6.4, 8, 14, 15 |
| 3 | 3.3 | `docs/prompts/04_YOUTUBE_PARSER_AND_METADATA.md` | Sections 5, 6.3, 8.2, 9.4, 14, 15 |
| 4 | 4.1-4.3 | `docs/prompts/05_HOME_PAGE_AND_CATALOG.md` | Sections 4, 8.1, 10, 11, 12, 15 |
| 5 | 5.1-5.5 | `docs/prompts/06_COURSE_PAGE_AND_PROGRESS.md` | Sections 4, 6.3, 8, 9.1, 9.2, 10, 11, 15 |
| 6 | 6.1-6.6 | `docs/prompts/07_ADMIN_COURSE_MANAGEMENT.md` | Sections 4, 7, 9.3, 9.4, 10, 11, 15 |
| 7 | 7.1-7.4 | `docs/prompts/08_AI_TUTOR_CONTEXT_AND_PERSISTENCE.md` | Sections 5, 6.3, 8, 9.5, 10, 11, 14, 15 |
| 8 | 8.1-8.4 | `docs/prompts/09_DASHBOARDS.md` | Sections 6.4, 8, 10, 11, 15 |
| 9 | 9.1-9.5 | `docs/prompts/10_LOCALIZATION_SEO_ACCESSIBILITY_POLISH.md` | Sections 10, 11, 12, 13, 15, 17 |
| 10 | 10.1-10.5 | `docs/prompts/11_REQUIRED_EXTENDED_FEATURES.md` | Sections 6.2.1, 6.3, 6.4, 7, 8, 9.1, 10, 11, 14, 15 |
| 11 | 11.1-11.3 | `docs/prompts/12_TESTING_AND_QA.md` | Sections 15, 17 |
| 12 | 12.1-12.3 | `docs/prompts/13_DEPLOYMENT_AND_FINAL_REVIEW.md` | Sections 5, 16, 17 |
| 14 | 14.1-14.2 | `docs/prompts/14_YOUTUBE_PLAYLIST_IMPORT_LIVE.md` | Sections 5, 9.4 |
| 15 | 15.1-15.3 | `docs/prompts/15_REMINDER_EMAIL_DELIVERY_SMTP.md` | Sections 10, 14 |
| 16 | 16.1-16.4 | `docs/prompts/16_ABOUT_AND_CONTACT_PAGES.md` | Sections 4, 10, 11, 12, 15 |
| 17 | 17.1-17.3 | `docs/prompts/17_CATALOG_SCHEMA_CATEGORIES_AND_REVIEWS.md` | Sections 5, 6, 7, 15, 16 |
| 18 | 18.1-18.4 | `docs/prompts/18_COURSES_CATALOG_PAGE.md` | Sections 4, 8, 10, 11, 12, 15 |
| 19 | 19.1-19.2 | `docs/prompts/19_COURSE_REVIEWS_AND_LESSON_SEARCH.md` | Sections 6.3, 8, 10, 11, 15 |

Batches 16-19 are anchored by the design spec
`docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md`
(batch number noted in each prompt's planning anchors).

## Batch 0: Verify Existing Implementation And Establish Baseline

### Task 0.1: Verify Repository And Template State

Objective: Confirm the installed template, project scripts, dependency versions,
and project structure.

Actions:

- Inspect `package.json`, lockfile, app directory, component directories,
  Supabase utilities, localization config, middleware, and environment examples.
- Confirm scripts for `dev`, `build`, `lint`, `format`, `typecheck`, and tests.
- Confirm current Next.js, React, TypeScript, Tailwind, shadcn, Supabase, Vercel
  AI, next-intl, Turnstile, Vitest, and Playwright packages.

Acceptance:

- A baseline note is added to the implementation log.
- No new feature work starts until the baseline is known.

Tests:

- `npm run typecheck`
- `npm run lint`
- `npm run build` if current baseline supports it.

Prompt file: `docs/prompts/00_VERIFY_EXISTING_IMPLEMENTATION.md`

### Task 0.2: Verify Environment Variables

Objective: Confirm `.env.local` has all required variables without exposing
values.

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

Objective: Confirm sign up, login, logout, remember me, forgot password, and
request session refresh.

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

- AI tutor can extend current AI route pattern or use a dedicated route based on
  documented reasoning.

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

- Define tables: `profiles`, `courses`, `lessons`, `enrollments`,
  `lesson_progress`, `ai_tutor_conversations`, `ai_tutor_messages`.
- Define indexes, constraints, triggers, views, and RLS policies.
- Decide whether to use enums or text constraints.

Acceptance:

- Schema plan is documented before SQL is applied.

Prompt file: `docs/prompts/02_DATABASE_SCHEMA_AND_RLS.md`

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

Prompt file: `docs/prompts/04_YOUTUBE_PARSER_AND_METADATA.md`

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

Prompt file: `docs/prompts/05_HOME_PAGE_AND_CATALOG.md`

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

- `app/[locale]/.../courses/[courseSlug]/learn/[[...lessonSlug]]/page.tsx` or
  existing route convention.

Acceptance:

- Loads course, lessons, selected lesson, and current student's progress.
- Requires auth for non-preview learning.

Prompt file: `docs/prompts/06_COURSE_PAGE_AND_PROGRESS.md`

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

Prompt file: `docs/prompts/07_ADMIN_COURSE_MANAGEMENT.md`

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
- Race conditions are handled with transaction-like update strategy where
  possible.

## Batch 7: AI Tutor With Context And Persistence

### Task 7.1: Design Tutor Prompt Builder

Objective: Create deterministic context assembly for the AI tutor.

Files:

- `lib/tutor/prompt.ts`
- `tests/unit/tutor-prompt.test.ts`

Acceptance:

- Includes course title, course description, lesson title, lesson description,
  YouTube URL, locale, and recent messages.
- Explicitly prevents fake timestamp claims.

Prompt file: `docs/prompts/08_AI_TUTOR_CONTEXT_AND_PERSISTENCE.md`

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

- Returns enrolled courses, progress percent, recent lessons, weekly activity,
  badges.
- Data is scoped to current user.

Prompt file: `docs/prompts/09_DASHBOARDS.md`

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

- Returns student count, enrollment count, course completion rates, inactive
  students, common tutor questions, recent activity.
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

Prompt file: `docs/prompts/10_LOCALIZATION_SEO_ACCESSIBILITY_POLISH.md`

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

- Check headings, labels, error messages, focus order, keyboard navigation,
  color contrast, and video titles.
- Verify modals/drawers from Magic MCP components are accessible after
  adaptation.

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

## Batch 10: Required Extended Features

### Task 10.1: Build Completion Certificates

Objective: Generate and persist certificates for completed courses.

Files:

- `lib/certificates/actions.ts`
- `lib/certificates/queries.ts`
- `app/[locale]/certificates/[certificateId]/page.tsx`
- `components/certificates/CERTIFICATE_CARD.tsx`
- `components/certificates/CERTIFICATE_DOWNLOAD_BUTTON.tsx`

Acceptance:

- Completing a course creates or exposes a certificate idempotently.
- Certificate metadata is stored in Supabase.
- Student can view and download their own certificate.
- Admin can verify certificate ownership/status.
- Certificate strings are localized in EN/HE.

Tests:

- Unit tests for certificate eligibility.
- Integration tests for certificate creation and access control.
- E2E certificate visibility after course completion.

Prompt file: `docs/prompts/11_REQUIRED_EXTENDED_FEATURES.md`

### Task 10.2: Build Smart Search

Objective: Let students search courses and lessons.

Files:

- `lib/search/queries.ts`
- `components/search/COURSE_SEARCH.tsx`
- `app/[locale]/search/page.tsx` or existing search route convention.

Acceptance:

- Students can search course titles, lesson titles, and lesson descriptions.
- Search respects published course visibility.
- Transcript search is included when transcript data is available.
- Empty and no-result states are localized.

Tests:

- Unit tests for query normalization.
- Integration tests for search result scoping.
- E2E search smoke flow.

### Task 10.3: Build Class Groups

Objective: Support cohorts/groups and group dashboards.

Files:

- `lib/groups/queries.ts`
- `lib/groups/actions.ts`
- `app/[locale]/admin/groups/page.tsx`
- `app/[locale]/dashboard/groups/page.tsx`
- `components/groups/GROUP_DASHBOARD.tsx`

Acceptance:

- Admin can create and manage class groups.
- Admin can assign students to groups.
- Students can see their group dashboard.
- Group progress is scoped by membership and admin role.

Tests:

- Integration tests for group membership access.
- E2E admin group creation and student group dashboard flow.

### Task 10.4: Build Reminders

Objective: Track and send reminders for inactive students.

Files:

- `lib/reminders/queries.ts`
- `lib/reminders/actions.ts`
- `app/api/reminders/route.ts` or server action by existing convention.
- `components/admin/REMINDER_QUEUE.tsx`

Acceptance:

- Inactive students are identified from progress/activity data.
- Admin can review reminder candidates.
- Reminder sends are recorded to avoid duplicate notifications.
- If an external delivery provider is not configured, reminders are queued and
  visible without failing silently.

Tests:

- Unit tests for inactivity detection.
- Integration tests for reminder queue idempotency.
- E2E admin reminder review flow.

### Task 10.5: Build Payments

Objective: Support paid courses through a simulated payment flow.

Files:

- `lib/payments/checkout.ts`
- `lib/payments/simulation.ts`
- `app/api/payments/checkout/route.ts`
- `app/api/payments/simulate/route.ts`
- `components/payments/COURSE_PURCHASE_BUTTON.tsx`

Acceptance:

- Paid courses require successful purchase or admin access before enrollment.
- A complete payment flow exists, but it is simulation-only.
- No real money changes hands.
- No real credit card, bank, wallet, or other payment method details are
  required, collected, transmitted, or stored.
- Any payment details shown or entered in the UI are fake/demo-only values.
- Successful simulated checkout marks the payment record as `paid`.
- Simulated payment events persist payment state safely and idempotently.
- Student purchase/enrollment state is clear in the UI.
- The UI clearly labels the flow as simulated payment, not real payment.

Tests:

- Unit tests for payment state mapping.
- Integration tests for simulated checkout creation.
- Integration tests for simulated payment idempotency.
- E2E paid-course purchase path with fake payment details.

## Batch 11: Test Completion

### Task 11.1: Complete Unit Test Suite

Objective: Cover core pure logic.

Required tests:

- YouTube parser.
- Progress calculation.
- Badge calculation.
- Slug generation.
- Validation.
- Tutor prompt builder.
- Certificate eligibility.
- Search query normalization.
- Group membership helpers.
- Reminder inactivity detection.
- Payment state mapping.

Prompt file: `docs/prompts/12_TESTING_AND_QA.md`

### Task 11.2: Complete Integration Test Suite

Objective: Cover server actions and route behavior with mocks.

Required tests:

- Enrollment action.
- Mark watched action.
- Admin course creation.
- Lesson creation.
- Tutor route persistence.
- YouTube metadata route.
- Certificate creation.
- Search scoping.
- Group membership management.
- Reminder queue idempotency.
- Simulated checkout and payment-state handling.

### Task 11.3: Complete Playwright E2E Suite

Objective: Cover reviewer-critical flows.

Required flows:

- Public home and course catalog.
- Student enrollment and progress.
- AI tutor question and refresh persistence.
- Admin course creation and lesson add.
- Admin route protection.
- Hebrew RTL smoke test.
- Certificate download after course completion.
- Search finds a course or lesson.
- Admin creates a class group and student sees group dashboard.
- Admin reviews inactive-student reminders.
- Simulated paid-course purchase/enrollment state.

## Batch 12: Deployment And Submission

### Task 12.1: Pre-Deployment Checks

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

Prompt file: `docs/prompts/13_DEPLOYMENT_AND_FINAL_REVIEW.md`

### Task 12.2: Vercel Environment Verification

Objective: Confirm production config.

Actions:

- Add required env vars to Vercel.
- Add optional `YOUTUBE_API_KEY` if playlist import is required.
- Add reminder delivery env vars if a delivery provider is configured.
- Confirm payment simulation requires no real provider keys.
- Confirm Supabase auth redirect URLs include production URL.
- Confirm AI tutor route works in deployed environment.

### Task 12.3: Final Reviewer Flow

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
10. Search for a course or lesson.
11. Complete a course and download a certificate.
12. Open a class group dashboard.
13. Review inactive-student reminder status.
14. Verify simulated paid-course purchase/enrollment state.

Acceptance:

- Flow passes in production.

## Batch 14: YouTube Playlist Import - Live Key Activation

Added after the initial 00-13 build once YOUTUBE_API_KEY was provisioned and
verified (videos.list HTTP 200). Activates the playlist-import path that batch
04/07 built to degrade gracefully without a key.

### Task 13.1: Verify Live Playlist Import Path

Objective: Confirm fetchPlaylistItems pagination, videos.list duration
enrichment, and the import action work against the real YouTube Data API v3.

Files:

- `lib/youtube/metadata.ts`, `lib/youtube/playlist.ts`
- `components/admin/youtube-playlist-import.tsx`

Acceptance:

- A real playlist imports as ordered lesson drafts with durations.
- Default tests stay deterministic (real API mocked).

Prompt file: `docs/prompts/14_YOUTUBE_PLAYLIST_IMPORT_LIVE.md`

### Task 13.2: Harden Import UX And Add Opt-In Live Test

Objective: Clear localized success/error states; an opt-in live test guarded by
YOUTUBE_LIVE_TEST=true, skipped by default.

## Batch 15: Reminder Email Delivery via Gmail SMTP

Added after SMTP was configured and verified (Gmail App Password login OK).
Replaces the queue-only reminder stub from batch 11 with real two-step email
delivery.

### Task 14.1: Add Server-Only SMTP Transport

Objective: A nodemailer-based lib/email/transport.ts (server-only) reading
SMTP_HOST/PORT/USER/PASSWORD, with safe errors that never leak the password.

Files:

- `lib/email/transport.ts`

### Task 14.2: Wire Two-Step Reminder Send

Objective: An admin-guarded sendReminder action that emails a queued reminder
and flips reminder_events.status queued -> sent (or failed), idempotently. No
auto-send; queue then send.

Files:

- `lib/reminders/actions.ts`, `app/[locale]/admin/reminders/page.tsx`

### Task 14.3: Tests, i18n, And Docs

Objective: Deterministic tests with nodemailer mocked; EN/HE strings;
.env.example + IMPLEMENTATION_LOG updates; opt-in live send test behind
SMTP_LIVE_TEST=true.

Prompt file: `docs/prompts/15_REMINDER_EMAIL_DELIVERY_SMTP.md`

## Catalog And Content Pages (Batches 16-19)

Batches 16-19 implement the Udemy-style courses catalog and the supporting
content pages. They are decomposed smallest-blast-radius first (content pages,
then schema, then catalog UI, then reviews/search) per the design spec
`docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md`.
Each batch is independently releasable. Worktrees are siblings
`../academy-NN-<slug>`, branch `feature/NN-<slug>`, squash-merged into local
`main` when all gates exit 0. Cross-cutting per-batch rules (EN+HE
key-identical, RLS/guards/secrets preserved, server-only boundaries, full gate
run, IMPLEMENTATION_LOG + academy-build-state updates) apply to every batch.

## Batch 16: About And Contact Content Pages (DONE 2026-06-14)

Two public server-component routes, nav links, and a demo-grade contact form.
No database changes. Status: COMPLETED and merged to `main`.

### Task 16.1: About Page Shell

Objective: A structured About page at `app/[locale]/about/page.tsx` - hero
region with a clearly-commented single-edit-point image slot, a mission block,
and a CTA to `/courses`. One `<h1>`, semantic landmarks, new `About` i18n
namespace. Real marketing copy and hero image are deferred (provisional copy).

Files:

- `app/[locale]/about/page.tsx`

### Task 16.2: Contact Page With Fake Details And Map Placeholder

Objective: `app/[locale]/contact/page.tsx` with a FAKE Tel-Aviv contact block
(Rothschild Blvd address, Israeli-format phone, email, hours), a static map
image placeholder (no live embed, no API key), and the contact form. New
`Contact` i18n namespace. The fake-details decision is recorded in the log.

Files:

- `app/[locale]/contact/page.tsx`, `components/contact/contact-form.tsx`

### Task 16.3: Tier-2 No-JS Contact Form And Action

Objective: A real `<form>` posting to `submitContactMessage` in
`lib/contact/actions.ts`, validated through a new Zod schema in
`lib/validation/contact.ts` (parseWithSchema + ActionResult). No email send:
validate, log/queue server-side, acknowledge via the `?notice=`/`?error=`
channel resolved by an allowlist (anti-injection, mirrors
`resolve-auth-message`).

Files:

- `lib/contact/actions.ts`, `lib/validation/contact.ts`,
  `lib/contact/resolve-contact-message.ts`

### Task 16.4: Navigation, i18n, Tests

Objective: Add Courses/About/Contact links to the header (`textLinks` +
`drawerLinks`) and footer; EN/HE key-identical strings; e2e for /about and
/contact (no-overflow 390/768/1280 in EN+HE, landmarks/one-h1, form present),
plus unit coverage for the action code mapping.

Files:

- `components/site-header.tsx`, `components/site-footer.tsx`,
  `messages/en-US.json`, `messages/he-IL.json`,
  `e2e/content-pages.spec.ts`, `tests/unit/contact-action.test.ts`

Prompt file: `docs/prompts/16_ABOUT_AND_CONTACT_PAGES.md`

## Batch 17: Catalog Schema - Categories And Reviews

Database only - no UI. Migration `0004_catalog_categories_and_reviews.sql`.

### Task 17.1: Categories, Course Category, And Reviews Tables

Objective: A `categories` table (slug unique, name_en/name_he, sort_order),
`courses.category_id` (NULL FK ON DELETE SET NULL, indexed), and a
`course_reviews` table (FK course/user, rating 1-5 CHECK, nullable body,
UNIQUE (course_id, user_id), indexed).

Files:

- `supabase/migrations/0004_catalog_categories_and_reviews.sql`

### Task 17.2: Aggregate Views And RLS

Objective: Views `course_ratings` (rating_average, rating_count) and
`course_popularity` (enrollment_count) with `security_invoker = true` (no
paid_count - the "Most purchased" sort was dropped). RLS: categories +
course_reviews public SELECT; review INSERT/UPDATE own-row AND only when
enrolled; admins (`private.is_admin()`) full access. Existing policies stay
intact.

### Task 17.3: Seed And Regenerated Types

Objective: Idempotent seed (a few categories with EN+HE names; assign
category_id to the 2 seeded courses; a realistic spread of reviews; enough
enrollments that "Most popular" is non-degenerate) referencing existing seeded
user ids. Regenerate `lib/supabase/database.types.ts` via the Supabase MCP;
verify typecheck and `get_advisors`.

Files:

- `lib/supabase/database.types.ts` (regenerated)

Prompt file: `docs/prompts/17_CATALOG_SCHEMA_CATEGORIES_AND_REVIEWS.md`

## Batch 18: Courses Catalog Page

The core batch: the Udemy-style `/courses` page. `/search` redirects to
`/courses`.

### Task 18.1: Catalog Domain And DTO

Objective: `lib/catalog/queries.ts#getCatalog({ q, categorySlug, mine, sort,
userId })` (server-only) joining published courses with
`course_lesson_counts`, `course_ratings`, `course_popularity`, and
`categories`; category filter, ILIKE course search, My-Courses filter (inner
join enrollments), and sort (popular | rated | newest). With a userId, surface
per-course enrollment + progress (reuse `lib/progress/calculate.ts`).
`getCategories()` for the filter UI. `lib/catalog/types.ts` `CatalogCourse`
DTO + `toCatalogCourse` mapper.

Files:

- `lib/catalog/queries.ts`, `lib/catalog/types.ts`

### Task 18.2: Query-Param Validation

Objective: `lib/validation/catalog.ts` Zod schema for the query params (q,
category slug, sort enum default "popular", mine boolean), parsed through
parseWithSchema; invalid values fall back to defaults rather than erroring.

Files:

- `lib/validation/catalog.ts`

### Task 18.3: Catalog Page And Filter Components

Objective: `app/[locale]/courses/page.tsx` (server component) with a category
filter, search input, sort control, and My-Courses toggle - all state in URL
query params (no-JS navigable, shareable). My-Courses hidden/disabled for
anonymous users. Filter components under `components/catalog/` (kebab-case),
server-rendered where possible. Cards gain a star-rating display and, when
enrolled, an inline progress bar; the home-page card keeps working. Mobile-
first + RTL, no overflow at 390/768/1280.

Files:

- `app/[locale]/courses/page.tsx`, `components/catalog/*`,
  `components/courses/course-card.tsx` (and/or `catalog-course-card.tsx`)

### Task 18.4: Search Redirect, i18n, Tests

Objective: Redirect `/search` to `/courses` (preserve `?q=`); fold/remove the
old global search page. New `Catalog` i18n namespace (key-identical). Unit
tests for getCatalog filter/sort (mocked Supabase builder); extend
`e2e/catalog.spec.ts` (no-overflow EN+HE, each sort/filter changes results,
search filters, My-Courses auth-gated).

Files:

- `app/[locale]/search/page.tsx` (-> redirect), `messages/en-US.json`,
  `messages/he-IL.json`, `e2e/catalog.spec.ts`

Prompt file: `docs/prompts/18_COURSES_CATALOG_PAGE.md`

## Batch 19: Course Reviews And In-Course Lesson Search

Both touch the course detail page `app/[locale]/courses/[courseSlug]/page.tsx`.

### Task 19.1: Review Write Path

Objective: A review schema in `lib/validation/course.ts` (rating 1-5; optional
body; course id) and `lib/courses/actions.ts#submitReview` - auth + enrollment
gated, validated, idempotent upsert on UNIQUE (course_id, user_id), feedback
via `?notice=`/`?error=`, RLS request client (never service-role). A Tier-2
no-JS `review-form.tsx` shown only to enrolled signed-in students (edit mode
pre-fill), and a public `review-list.tsx` with average + count.

Files:

- `lib/validation/course.ts`, `lib/courses/actions.ts`,
  `lib/courses/queries.ts` (getCourseReviews if needed),
  `components/courses/review-form.tsx`,
  `components/courses/review-list.tsx`

### Task 19.2: In-Course Lesson Search, i18n, Tests

Objective: `components/courses/lesson-search.tsx` filtering THIS course's
already-loaded lessons by title/description, degrading to the full list with
no JS (no global cross-course search). New reviews + lesson-search keys under
the `Course` namespace (key-identical). Tests: submitReview gating (anon ->
fail, not-enrolled -> fail, enrolled -> idempotent upsert), lesson-search
filter unit, e2e for form gating + the search box, no overflow 390/768/1280
EN+HE.

Files:

- `components/courses/lesson-search.tsx`, `messages/en-US.json`,
  `messages/he-IL.json`, `e2e/*`

Prompt file: `docs/prompts/19_COURSE_REVIEWS_AND_LESSON_SEARCH.md`

## Design System And UX/UI Overhaul (Batches 20-23)

Implements `docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md`
against the style reference `docs/design/DESIGN.md`. Run in order 20 -> 23. The
home hero always uses `header_banner.png`; Unsplash photos (Batch 23) never
replace it.

## Batch 20: Design Tokens, Fonts, And Brand Assets

Adopts the DESIGN.md token system in `:root`/`.light`/`.dark` via a shadcn
bridge (the styling contract every later batch consumes), switches the mono font
to JetBrains Mono, and installs the real favicon, logos, and hero banner.
Highest blast radius (the CSS contract); e2e theme/RTL/no-overflow is the proof.

### Task 20.1: Token Rewrite And shadcn Bridge

Objective: Rewrite `app/globals.css` to the DESIGN.md structure - `:root`
(structure only, no color), the no-JS `@media (prefers-color-scheme: dark)` dark
palette, `.light` and `.dark` (full DESIGN.md raw palettes + semantic
`--color-*` tokens + the shadcn bridge mapping the ~30 shadcn tokens onto the
DESIGN.md semantics, per spec Decision 3), the DESIGN.md palette-green
passthrough for later success pills, and the extended `@theme inline` (DESIGN.md
additions WITHOUT removing the existing shadcn mappings the 93 files depend on).
Preserve `@layer base`, `sr-only-focusable`, and the reduced-motion block.

Files:

- `app/globals.css`

### Task 20.2: Fonts And Viewport

Objective: In `app/[locale]/layout.tsx` replace `Geist_Mono` with
`JetBrains_Mono` on `--font-mono`, give Inter `font-feature-settings: "calt" 0,
"liga" 0`, and change the viewport `themeColor` literals to the real DESIGN.md
bg values (`#fafaf8` light, `#06051d` dark).

Files:

- `app/[locale]/layout.tsx`, `app/globals.css`

### Task 20.3: Brand Assets And Logo Component

Objective: Copy `docs/design/favicon.ico` to `app/favicon.ico` (and wire
`metadata.icons`); copy the logos + banner to `public/brand/`; re-point the
PWA/touch icons to the real mark; add `components/logo.tsx` (`<Logo />`) with a
no-JS, no-flash theme swap via `next/image`.

Files:

- `app/favicon.ico`, `public/brand/logo_dark.png`,
  `public/brand/logo_light.png`, `public/brand/header_banner.png`,
  `components/logo.tsx`, `app/[locale]/layout.tsx`,
  `scripts/generate-pwa-icons.mjs` (and/or `public/icons/*`)

### Task 20.4: i18n, TSDoc, Tests

Objective: Add a `Brand` namespace (logo alt) key-identical in both catalogs;
TSDoc on `<Logo />`; tests (`<Logo />` both theme variants + favicon/manifest
icons resolve); the e2e theme/RTL/no-overflow regression must stay green.

Files:

- `messages/en-US.json`, `messages/he-IL.json`, `e2e/*`, the `<Logo />` test

Prompt file: `docs/prompts/20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md`

## Batch 21: Home Hero And Global Chrome

Styles the home hero (display type, inline-highlighted word, the
`header_banner.png` artifact, dual CTA, Feature Cards) and places `<Logo />` in
the header + footer with DESIGN.md nav geometry, preserving the responsive
collapse and auth behavior.

### Task 21.1: Home Hero And Benefits

Objective: `app/[locale]/page.tsx` - DESIGN.md display heading with one
inline-highlighted word in `--color-accent`, a JetBrains Mono eyebrow, the
`header_banner.png` rendered via `next/image` at `--radius-large-blocks`, a dual
CTA (primary filled + secondary ghost) with DESIGN.md button geometry, and the
benefits grid converted to DESIGN.md Feature Cards. Keep the single `<h1>`.

Files:

- `app/[locale]/page.tsx`

### Task 21.2: Header And Footer

Objective: Replace the text wordmark in `components/site-header.tsx` with
`<Logo />`; apply DESIGN.md nav geometry (~64px, `--color-nav-bg` blur, hairline
border, Inter 14px/500 links) while preserving the mobile Sheet drawer, the
search control, the controls cluster, the auth control, and all RTL behavior.
Place `<Logo />` + muted links on `--color-surface` in
`components/site-footer.tsx`.

Files:

- `components/site-header.tsx`, `components/site-footer.tsx`

### Task 21.3: i18n, TSDoc, Tests

Objective: New hero/eyebrow strings key-identical in both catalogs; TSDoc on
changed exports; e2e (hero renders the banner + dual CTA + single `<h1>`; header
shows the logo; mobile drawer still opens below `md`; no overflow 390/768/1280
EN+HE; theme toggle flips).

Files:

- `messages/en-US.json`, `messages/he-IL.json`, `e2e/*`

Prompt file: `docs/prompts/21_HOME_HERO_AND_GLOBAL_CHROME.md`

## Batch 22: Theme Surface Sweep And Polish

Removes the last hardcoded colors, gives the AI tutor the Terminal Code Panel
treatment, polishes the remaining surfaces in both themes, and runs a WCAG AA
contrast pass. Token-driven; presentation only.

### Task 22.1: Hardcoded-Color Hot Spots

Objective: Replace the `bg-green-*`/`bg-red-*` literals in
`app/[locale]/admin/groups/page.tsx` and `app/[locale]/admin/reminders/page.tsx`
with DESIGN.md palette colors - the success-green passthrough (Batch 20) for
sent/success, `--color-danger-bg`/`--color-danger-text` for failed/error - and
remove every Tailwind named-color literal and stray hex from app code.

Files:

- `app/[locale]/admin/groups/page.tsx`, `app/[locale]/admin/reminders/page.tsx`

### Task 22.2: Tutor Terminal Panel And Surface Polish

Objective: Apply the DESIGN.md Terminal Code Panel treatment
(`--color-code-bg`, JetBrains Mono, syntax colors) to
`components/tutor/tutor-chat.tsx` technical output; polish course/catalog cards
(Feature Card geometry), dashboards (Stats Blocks with accent numbers,
theme-legible charts), admin tables, auth forms, and the certificate page in
both themes (presentation classes only; the bridge supplies the colors).

Files:

- `components/tutor/tutor-chat.tsx`, `components/courses/*`,
  `components/dashboard/*`, `components/admin/*`, auth pages,
  the certificate page

### Task 22.3: Contrast Pass, i18n, Tests

Objective: WCAG AA contrast pass on every interactive pairing (dark
Terminal-Amber secondary, dark Crimson/Fault-Red danger, dark
Bioluminescent-Green primary); log any miss to `docs/planning/TECH_DEBT.md` +
`docs/DECISIONS.md` with the measured ratio (do not alter the palette). Any new
strings key-identical; TSDoc on changed exports; e2e visual-contract regression
(theme + RTL + no-overflow; admin pills carry no green-*/red-* literal).

Files:

- `docs/planning/TECH_DEBT.md`, `docs/DECISIONS.md`, `messages/en-US.json`,
  `messages/he-IL.json`, `e2e/*`

Prompt file: `docs/prompts/22_THEME_SURFACE_SWEEP_AND_POLISH.md`

## Batch 23: Coding Photography From Unsplash

Sources the seven curated free Unsplash coding photos, self-hosts them, and
places them on scoped surfaces as content media with theme-token framing and
photographer attribution. The home hero stays `header_banner.png`.

### Task 23.1: Fetch Script, Attribution Map, Image Component

Objective: `scripts/fetch-unsplash-images.mjs` (idempotent downloader to
`public/images/unsplash/`, files committed); `lib/images/unsplash.ts` (typed
attribution map - the single source of truth, with TSDoc);
`components/unsplash-image.tsx` (`<UnsplashImage />` - `next/image` + theme-token
frame + low-opacity theme scrim + localized alt + "Photo by {name} on Unsplash"
credit, no-JS safe).

Files:

- `scripts/fetch-unsplash-images.mjs`, `public/images/unsplash/*.jpg`,
  `lib/images/unsplash.ts`, `components/unsplash-image.tsx`

### Task 23.2: Placements

Objective: Course-card cover fallback in the existing `coverImageUrl ? : ` else
branch (deterministic id/slug hash across cover-eligible photos; a real
`coverImageUrl` always wins); course-detail header photo when no `coverImageUrl`;
one photo each on About and Contact; an optional `md+` auth side panel (hidden
below `md`). The home hero is untouched.

Files:

- `components/courses/course-card.tsx`,
  `app/[locale]/courses/[courseSlug]/page.tsx`, `app/[locale]/about/page.tsx`,
  `app/[locale]/contact/page.tsx`, `app/[locale]/login/page.tsx`,
  `app/[locale]/register/page.tsx`

### Task 23.3: i18n, TSDoc, Tests

Objective: An `Imagery` namespace (per-photo localized alt + "Photo by {name} on
Unsplash" template) key-identical in both catalogs; TSDoc on the new exports;
tests (deterministic cover selector; a course WITH `coverImageUrl` shows its own
image; every map photo has attribution + a localized alt key in both catalogs;
e2e credit-line render + no overflow 390/768/1280 EN+HE).

Files:

- `messages/en-US.json`, `messages/he-IL.json`, `e2e/*`, the selector test

Prompt file: `docs/prompts/23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md`
