# Product Requirements Document: Eyal's Coding Academy

## 1. Product Summary

Eyal's Coding Academy is a localized online course platform and AI tutor for a
private programming teacher. The product lets students browse courses, enroll,
watch YouTube-based lessons, track lesson completion, and ask a contextual AI
tutor for help while learning. It also gives Eyal an admin experience for
managing courses, importing lessons from YouTube, reviewing student progress,
identifying stuck students, managing class groups, reviewing reminders,
demonstrating simulated paid courses, issuing completion certificates, and
seeing common AI tutor questions.

This PRD assumes the current template and foundation are already implemented and
must be preserved. New work should add or update functionality inside the
existing architecture instead of replacing working authentication, localization,
theming, PWA, accessibility, Supabase, Vercel AI, GitHub, and deployment setup.

## 2. Existing Baseline To Preserve

The project already includes the following foundations and must treat them as
constraints:

| Area                    | Existing implementation                                                                                              | Product decision                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| App framework           | Next.js 16.1.7, App Router, React 19.2.4, TypeScript 5.9, ESM                                                        | Build inside the existing App Router structure. Avoid Pages Router or framework migration.                           |
| UI system               | Tailwind CSS 4, shadcn 4 components, Base UI, Lucide, next-themes, Recharts                                          | Reuse current primitives and design tokens. Add components only where needed.                                        |
| Localization            | next-intl, localized routes under `app/[locale]/`, English and Hebrew catalogs, RTL support                          | Every student/admin page must be locale-aware and translate all user-visible strings.                                |
| Backend/auth/data       | Supabase via `@supabase/ssr` and `@supabase/supabase-js`; server, browser, admin clients; request session refresh    | Use the existing Supabase client pattern and auth session flow. Do not introduce a second auth system.               |
| AI                      | Vercel AI SDK with `ai`, `@ai-sdk/react`, `@ai-sdk/gateway`; existing `/api/chat` streams using `openai/gpt-4o-mini` | Extend the existing streaming pattern for contextual tutoring and persistence.                                       |
| Security                | Cloudflare Turnstile via `@marsidev/react-turnstile`; `.env.local` configured                                        | Reuse existing Turnstile and environment variable conventions. Do not commit secrets.                                |
| Auth UX                 | Sign up, login, logout, remember me, forgot password                                                                 | Verify and reuse. Add role-aware redirects and route protection only where needed.                                   |
| Responsiveness          | Mobile-friendly functionality already implemented                                                                    | Preserve responsiveness and extend it to new course/admin/dashboard screens.                                         |
| Accessibility and no-JS | Already implemented                                                                                                  | New screens must retain semantic markup, keyboard access, no-JS fallbacks where practical, and graceful degradation. |
| PWA                     | Already implemented                                                                                                  | Preserve manifest/service worker behavior. Course pages must not break installability.                               |
| Theme                   | Light/dark switching already implemented                                                                             | All new UI must support theme tokens. No hard-coded unreadable colors.                                               |
| Dev workflow            | Claude Code template, Supabase MCP, Context7 MCP, GitHub/Vercel workflow                                             | Use documented template conventions and MCP-assisted implementation.                                                 |

## 3. Business Context

Eyal Cohen is a full stack developer and private programming teacher teaching 15
to 25 students per month. His current workflow is fragmented across WhatsApp,
manually shared YouTube links, repeated beginner questions, and no central
visibility into learning progress.

The platform solves four core problems:

1. Centralize courses and lesson sequence.
2. Track what each student has watched.
3. Provide immediate contextual help through an AI tutor.
4. Give Eyal operational visibility into student progress and common questions.

## 4. Product Goals

### 4.1 Student Goals

- Find relevant programming courses by topic and level.
- Enroll in a course with a clear action.
- Watch ordered YouTube lessons inside the platform.
- Know which lesson to watch next.
- Mark lessons as watched and see progress persist after refresh.
- Ask an AI tutor questions in the context of the current course and lesson.
- Continue learning from a personal dashboard.
- Search courses and lessons.
- Download a completion certificate after finishing a course.
- View class group progress where the student belongs to a group.
- Complete a simulated purchase flow when a course requires simulated payment.

### 4.2 Teacher/Admin Goals

- Create and update courses.
- Add lessons from YouTube video URLs.
- Import lessons from YouTube playlists when API configuration allows it.
- Reorder lessons.
- Delete mistakenly added lessons.
- Review student progress by course and student.
- Identify students who may be stuck or inactive.
- Review common AI tutor questions.
- Manage class groups and group memberships.
- Review and send inactivity reminders.
- Manage simulated paid-course state.
- Verify issued completion certificates.

### 4.3 Technical/Product Quality Goals

- Preserve current architecture and avoid rewrites.
- Use Supabase Postgres relationships and RLS, not static or denormalized data
  blobs.
- Support English and Hebrew, including RTL layout for Hebrew.
- Support desktop and mobile.
- Support SEO-ready public pages.
- Keep secrets out of Git.
- Deploy successfully to Vercel.
- Include unit, integration, and e2e coverage for all required flows.

## 5. Non-Goals

The first production-ready version does not need:

- Native mobile apps.
- Complex LMS authoring beyond course and YouTube lesson management.
- Real-time classroom chat.

Payments, certificates, smart search, class groups, and reminders are required
product scope and must be designed into the implementation from the beginning.

## 6. Personas

### 6.1 Student

A beginner or intermediate learner studying HTML, CSS, JavaScript, React, or
Vibe Coding. The student wants a simple path through lessons and quick
explanations when stuck.

### 6.2 Teacher/Admin: Eyal

A private programming teacher who needs to publish structured learning content,
monitor student progress, and reduce repeated support burden.

### 6.3 Reviewer

An assignment reviewer who needs to open the deployed app and verify the core
flow end to end.

## 7. User Journeys

### 7.1 Student Enrollment And Learning

1. Student opens the localized home page.
2. Student reviews course cards.
3. Student selects a course.
4. Student signs up or logs in if required.
5. Student enrolls in the course.
6. Student opens the first available lesson.
7. Student watches the embedded YouTube lesson.
8. Student marks the lesson as watched.
9. Progress updates immediately and persists after refresh.
10. Student is guided to the next lesson.

### 7.2 Student AI Tutor Help

1. Student opens a course lesson.
2. Student asks a question in the AI tutor panel.
3. App sends course title, course description, lesson title, lesson description,
   YouTube URL, locale, and recent conversation history to the AI endpoint.
4. Tutor answers as a programming teacher, grounded in the current lesson
   context.
5. Student question and tutor response are stored in Supabase.
6. Refreshing the page restores the conversation history.

### 7.3 Teacher Course Management

1. Eyal opens the admin course management page.
2. Eyal creates a course with title, slug, description, level, cover image,
   language, and publication status.
3. Eyal adds a YouTube video lesson.
4. App extracts or accepts lesson metadata.
5. Eyal imports a playlist if the YouTube Data API key is configured.
6. Eyal reorders lessons.
7. Eyal publishes the course.

### 7.4 Teacher Progress Monitoring

1. Eyal opens `/admin/dashboard`.
2. Dashboard shows total students, enrollments, completion rates, inactive
   students, recent activity, and common tutor questions.
3. Eyal filters by course.
4. Eyal identifies students with no activity for more than seven days.

## 8. Functional Requirements

### 8.1 Public Home Page And Catalog

| ID          | Requirement                                                                   | Priority | Acceptance                                                               |
| ----------- | ----------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| PRD-CAT-001 | Display a professional hero section with primary CTA.                         | Must     | Hero appears in EN and HE and supports dark/light themes.                |
| PRD-CAT-002 | Load public courses from Supabase.                                            | Must     | Course catalog is not hard-coded.                                        |
| PRD-CAT-003 | Show course card fields: name, description, level, lesson count, cover image. | Must     | Cards render complete data and handle missing images.                    |
| PRD-CAT-004 | Provide enrollment action.                                                    | Must     | Authenticated student can enroll. Anonymous user is routed to auth flow. |
| PRD-CAT-005 | Provide loading and empty states.                                             | Must     | Skeleton/empty UI appears when relevant.                                 |

### 8.2 Authentication And Authorization

| ID           | Requirement                                                                  | Priority | Acceptance                                                        |
| ------------ | ---------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| PRD-AUTH-001 | Preserve current sign up, login, logout, remember me, forgot password flows. | Must     | Existing flows still pass manual smoke tests.                     |
| PRD-AUTH-002 | Add role-aware access for student and admin pages.                           | Must     | Students cannot access admin pages. Admin can access admin pages. |
| PRD-AUTH-003 | Use Supabase profiles for role metadata.                                     | Must     | Role checks use server-side data, not only client-side flags.     |
| PRD-AUTH-004 | Preserve Turnstile where currently used.                                     | Should   | Auth-sensitive forms remain protected as already designed.        |

### 8.3 Course Learning Experience

| ID            | Requirement                                                                                                    | Priority | Acceptance                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| PRD-LEARN-001 | Render course page with title, description, sidebar lesson list, selected lesson, and embedded YouTube player. | Must     | Student can play a lesson.                                            |
| PRD-LEARN-002 | Show completed lessons with checkmarks.                                                                        | Must     | Completed state is derived from Supabase progress.                    |
| PRD-LEARN-003 | Mark lesson as watched.                                                                                        | Must     | Writes one progress record per student and lesson.                    |
| PRD-LEARN-004 | Update course progress percentage.                                                                             | Must     | Progress bar updates without full refresh and persists after refresh. |
| PRD-LEARN-005 | Move to next lesson after completion.                                                                          | Should   | Student lands on the next incomplete lesson when available.           |

### 8.4 Admin Course Management

| ID            | Requirement                            | Priority | Acceptance                                                                   |
| ------------- | -------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| PRD-ADMIN-001 | Admin can create courses.              | Must     | New course persists in Supabase.                                             |
| PRD-ADMIN-002 | Admin can edit course details.         | Must     | Course update is visible in catalog.                                         |
| PRD-ADMIN-003 | Admin can add lesson from YouTube URL. | Must     | Valid video URL is saved as lesson. Invalid URL returns helpful error.       |
| PRD-ADMIN-004 | Admin can import playlist.             | Should   | Works when `YOUTUBE_API_KEY` exists; otherwise shows documented requirement. |
| PRD-ADMIN-005 | Admin can reorder lessons.             | Must     | Sort order persists and is reflected in course page.                         |
| PRD-ADMIN-006 | Admin can delete lesson.               | Must     | Mistakenly added lesson can be removed if not blocked by data rules.         |

### 8.5 AI Tutor

| ID         | Requirement                                       | Priority | Acceptance                                                                                                            |
| ---------- | ------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| PRD-AI-001 | AI tutor appears in the course lesson experience. | Must     | Student can submit a question.                                                                                        |
| PRD-AI-002 | Tutor receives course and lesson context.         | Must     | Prompt includes course title, course description, lesson title, lesson description, YouTube URL, and recent messages. |
| PRD-AI-003 | Tutor avoids pretending to see video timestamps.  | Must     | System prompt explicitly forbids timestamp claims unless timestamp data is provided.                                  |
| PRD-AI-004 | Store conversation and messages.                  | Must     | Refreshing restores previous messages.                                                                                |
| PRD-AI-005 | Support loading and error states.                 | Must     | UI handles streaming, failure, and retry.                                                                             |
| PRD-AI-006 | Respect locale.                                   | Should   | Tutor answers in the active locale unless student asks otherwise.                                                     |

### 8.6 Student Dashboard

| ID         | Requirement                            | Priority | Acceptance                                             |
| ---------- | -------------------------------------- | -------- | ------------------------------------------------------ |
| PRD-SD-001 | Show enrolled courses.                 | Must     | Dashboard lists only current student's enrollments.    |
| PRD-SD-002 | Show completion percentage per course. | Must     | Percent matches lesson progress.                       |
| PRD-SD-003 | Show recent lessons.                   | Should   | Recently watched lessons are visible when data exists. |
| PRD-SD-004 | Show weekly progress summary.          | Should   | Recent activity count/chart appears.                   |
| PRD-SD-005 | Show badges.                           | Should   | At least simple computed badges render.                |

### 8.7 Teacher Dashboard

| ID         | Requirement                      | Priority | Acceptance                                                    |
| ---------- | -------------------------------- | -------- | ------------------------------------------------------------- |
| PRD-TD-001 | Show total students.             | Must     | Count excludes admins.                                        |
| PRD-TD-002 | Show total enrollments.          | Must     | Count comes from enrollments table.                           |
| PRD-TD-003 | Show completion rates.           | Must     | Completion rates are computed from lessons and progress.      |
| PRD-TD-004 | Show inactive or stuck students. | Must     | Students with no lesson activity in over 7 days are visible.  |
| PRD-TD-005 | Show common AI tutor questions.  | Must     | Common/recent question summary comes from tutor message data. |
| PRD-TD-006 | Show recent course activity.     | Should   | Admin sees latest watched lessons/enrollments.                |

## 9. Data Requirements

Minimum tables:

- `profiles`
- `courses`
- `lessons`
- `enrollments`
- `lesson_progress`
- `ai_tutor_conversations`
- `ai_tutor_messages`

Recommended support tables or views:

- `course_categories`
- `course_category_links`
- `badges`
- `student_badges`
- `course_progress_summary` view
- `admin_student_progress` view
- `admin_common_tutor_questions` view

## 10. Non-Functional Requirements

### 10.1 Performance

- Public catalog should render with server-side data where appropriate.
- Course pages should avoid loading all conversations for all lessons.
- Admin dashboards should use views or scoped queries instead of client-side
  full-table scans.
- YouTube embed should be lazy-loaded or isolated to avoid blocking initial UI
  where possible.

### 10.2 Security

- RLS must be enabled for student-owned data.
- Admin operations must be server-side guarded.
- Students must not read other students' progress or tutor messages.
- API routes must validate auth and role.
- `SUPABASE_SECRET_KEY`, `AI_GATEWAY_API_KEY`, `YOUTUBE_API_KEY`,
  `TURNSTILE_SECRET_KEY`, and other secrets must never be exposed to the client.

### 10.3 Accessibility

- New pages must use semantic headings, labels, focus states, keyboard
  navigation, and ARIA only where needed.
- Video embeds must include accessible titles.
- Forms must associate errors with fields.
- Components must remain usable in RTL.

### 10.4 SEO

- Public course catalog and course details should generate localized metadata.
- Courses should have stable localized URLs.
- Open Graph metadata should include title, description, and cover image where
  possible.
- No private dashboard pages should be indexed.

### 10.5 Internationalization

- All user-visible strings must be in EN and HE catalogs.
- Hebrew pages must use RTL layout.
- AI tutor should receive active locale and answer accordingly.

### 10.6 Testing

- Unit tests for parsing, validation, progress calculation, role guards, and
  utility functions.
- Integration tests for Supabase data access functions and API/server actions
  with mocks where needed.
- E2E tests for enrollment, course progress, AI tutor message flow, admin course
  creation, and route protection.

## 11. Success Metrics

| Metric                        | Target                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| Core reviewer flow completion | 100 percent                                                   |
| Course catalog data source    | Supabase only, no hard-coded final data                       |
| Student data leakage          | 0 known RLS failures                                          |
| Main pages mobile usability   | All core pages usable at 375px width                          |
| AI tutor context use          | Tutor references current course or lesson in relevant answers |
| Test coverage                 | Core utilities and e2e flows covered                          |
| Deployment                    | Vercel production deployment succeeds                         |

## 12. Release Criteria

The MVP is complete when a reviewer can:

1. Open the deployed home page.
2. View courses from Supabase.
3. Sign up or log in as a student.
4. Enroll in a course.
5. Open a course page.
6. Watch a YouTube lesson.
7. Mark it as watched.
8. See progress update.
9. Ask the AI tutor a contextual question.
10. Open the student dashboard.
11. Open the teacher dashboard as an admin.
12. Verify the app works on desktop and mobile.
