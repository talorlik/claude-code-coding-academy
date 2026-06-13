# Technical Requirements Specification: Eyal's Coding Academy

## 1. Purpose

This document defines the technical implementation requirements for Eyal's Coding Academy. It is designed for Claude Code implementation in a project where the template foundation has already been installed and several infrastructure features are already present.

The implementation model is additive. Existing auth, Supabase clients, localization, theming, PWA, accessibility, no-JS handling, GitHub, Vercel, MCP, and AI route foundations must be verified and reused before new functionality is added.

## 2. Technical Baseline

### 2.1 Current Implemented Stack

- Next.js 16.1.7 with App Router.
- React 19.2.4.
- TypeScript 5.9.
- ESM modules.
- Tailwind CSS 4.
- shadcn 4 components.
- Base UI.
- Lucide icons.
- next-themes.
- Recharts.
- next-intl with `app/[locale]/` localized routing.
- English and Hebrew message catalogs.
- RTL support for Hebrew.
- Supabase via `@supabase/ssr` and `@supabase/supabase-js`.
- Server, browser, and admin Supabase clients.
- Request session refresh already wired.
- Vercel AI SDK: `ai`, `@ai-sdk/react`, `@ai-sdk/gateway`.
- Current `/api/chat` streaming with `openai/gpt-4o-mini`.
- Cloudflare Turnstile via `@marsidev/react-turnstile`.
- ESLint 9, `eslint-config-next`, Prettier, Tailwind Prettier plugin, PostCSS.
- Vitest, jsdom, Testing Library, Playwright.
- Vercel deployment target.
- `.env.local` configured with relevant keys, secrets, tokens, and API keys.
- Claude Code template, Supabase MCP, Context7 MCP, Skills, and Magic MCP.

### 2.2 Implementation Constraints

- Do not rewrite the app foundation.
- Do not introduce another UI framework.
- Do not create a separate auth system.
- Do not bypass existing localized route conventions.
- Do not hard-code final course data in React components.
- Do not expose secret keys in client bundles.
- Do not commit `.env.local`, `.mcp.json`, Supabase keys, YouTube keys, AI gateway keys, or Turnstile secrets.
- Prefer server actions or route handlers for mutations that need auth, validation, and role checks.
- Use TSDoc for exported functions, non-trivial types, and reusable modules.

## 3. Target Architecture

```text
Browser
  |
  | localized App Router pages under app/[locale]/
  v
Next.js Server Components / Client Components
  |
  | server actions / route handlers
  v
Supabase clients
  |-- browser client for authenticated client reads where safe
  |-- server client for request-scoped auth operations
  |-- admin client only in server-only modules
  v
Supabase Postgres + Auth + RLS

AI Tutor path:
Client chat component
  -> /api/tutor or server action
  -> Supabase context lookup
  -> Vercel AI Gateway model call
  -> streaming response
  -> Supabase message persistence

YouTube path:
Admin form
  -> URL parser and validator
  -> oEmbed metadata or YouTube Data API
  -> lessons table
```

## 4. Directory And File Structure

Recommended additions inside the existing repository:

```text
app/
  [locale]/
    (public)/
      page.tsx
      courses/
        [courseSlug]/
          page.tsx
    (protected)/
      dashboard/
        page.tsx
      courses/
        [courseSlug]/
          learn/
            [[...lessonSlug]]/
              page.tsx
    admin/
      courses/
        page.tsx
        [courseId]/
          page.tsx
      dashboard/
        page.tsx
    api/
      tutor/
        route.ts
      youtube/
        oembed/
          route.ts
        playlist/
          route.ts
components/
  courses/
  dashboard/
  admin/
  tutor/
  youtube/
  shared/
lib/
  auth/
  courses/
  dashboard/
  progress/
  tutor/
  youtube/
  validation/
  seo/
  i18n/
  supabase/
supabase/
  migrations/
  seed.sql
tests/
  unit/
  integration/
  e2e/
docs/
  planning/
  prompts/
```

Adjust route groups to match the existing project convention after Task 0 verification. Do not force this exact layout if the template already uses a different route grouping strategy.

## 5. Environment Variables

### 5.1 Required

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/server | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client/server | Supabase publishable key. |
| `SUPABASE_SECRET_KEY` | Server only | Supabase secret key. Never expose to client. |
| `AI_GATEWAY_API_KEY` | Server only | Vercel AI Gateway key. |
| `NEXT_PUBLIC_APP_URL` | Client/server | Local and production base URL. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client | Turnstile site key. |
| `TURNSTILE_SECRET_KEY` | Server only | Turnstile verification secret, if backend verification exists. |

### 5.2 Optional

| Variable | Scope | Notes |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | Server only | Required for playlist import and richer metadata. |
| `NEXT_PUBLIC_ENABLE_PWA` | Client/server | Use only if current PWA setup already gates functionality this way. |
| `E2E_BASE_URL` | Test | Playwright target URL. |
| `E2E_STUDENT_EMAIL` | Test | Optional seeded test account. |
| `E2E_STUDENT_PASSWORD` | Test | Optional seeded test account. |
| `E2E_ADMIN_EMAIL` | Test | Optional seeded admin account. |
| `E2E_ADMIN_PASSWORD` | Test | Optional seeded admin account. |

## 6. Database Schema Requirements

### 6.1 Extensions

Use extensions only if available and needed:

```sql
create extension if not exists pgcrypto;
```

### 6.2 Enums

Recommended enum types:

```sql
create type public.user_role as enum ('student', 'admin');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.tutor_message_role as enum ('user', 'assistant', 'system');
```

If the project uses text plus check constraints instead of Postgres enums, document that decision in the migration.

### 6.3 Tables

#### `profiles`

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | uuid primary key references `auth.users(id)` | User profile identity. |
| `email` | text | Optional denormalized email for admin display. |
| `full_name` | text | Display name. |
| `avatar_url` | text | Optional. |
| `role` | `user_role` | Defaults to `student`. |
| `locale` | text | Defaults to `en`; allow `en`, `he`. |
| `created_at` | timestamptz | Default `now()`. |
| `updated_at` | timestamptz | Updated by trigger. |

#### `courses`

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | uuid primary key | Generated. |
| `slug` | text unique | Stable URL slug. |
| `title` | text | Required. |
| `description` | text | Required. |
| `level` | `course_level` | Required. |
| `cover_image_url` | text | Optional fallback in UI. |
| `status` | `course_status` | Default `draft`. |
| `language` | text | `en`, `he`, or `mixed`. |
| `created_by` | uuid references `profiles(id)` | Admin author. |
| `created_at` | timestamptz | Default `now()`. |
| `updated_at` | timestamptz | Updated by trigger. |

#### `lessons`

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | uuid primary key | Generated. |
| `course_id` | uuid references `courses(id)` on delete cascade | Required. |
| `slug` | text | Unique per course. |
| `title` | text | Required. |
| `description` | text | Optional. |
| `youtube_video_id` | text | Required. |
| `youtube_url` | text | Required. |
| `duration_seconds` | integer | Optional. |
| `thumbnail_url` | text | Optional. |
| `sort_order` | integer | Required. |
| `is_preview` | boolean | Default false. |
| `created_at` | timestamptz | Default `now()`. |
| `updated_at` | timestamptz | Updated by trigger. |

Constraint: unique `(course_id, slug)` and `(course_id, sort_order)`.

#### `enrollments`

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | uuid primary key | Generated. |
| `user_id` | uuid references `profiles(id)` on delete cascade | Student. |
| `course_id` | uuid references `courses(id)` on delete cascade | Course. |
| `enrolled_at` | timestamptz | Default `now()`. |
| `completed_at` | timestamptz | Nullable. |
| `last_accessed_lesson_id` | uuid references `lessons(id)` | Nullable. |

Constraint: unique `(user_id, course_id)`.

#### `lesson_progress`

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | uuid primary key | Generated. |
| `user_id` | uuid references `profiles(id)` on delete cascade | Student. |
| `course_id` | uuid references `courses(id)` on delete cascade | Course. |
| `lesson_id` | uuid references `lessons(id)` on delete cascade | Lesson. |
| `watched_at` | timestamptz | Default `now()`. |
| `created_at` | timestamptz | Default `now()`. |

Constraint: unique `(user_id, lesson_id)`.

Validation: lesson must belong to course. Prefer a trigger or composite foreign key strategy if implemented cleanly.

#### `ai_tutor_conversations`

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | uuid primary key | Generated. |
| `user_id` | uuid references `profiles(id)` on delete cascade | Student. |
| `course_id` | uuid references `courses(id)` on delete cascade | Required. |
| `lesson_id` | uuid references `lessons(id)` on delete set null | Optional. |
| `title` | text | Optional generated title. |
| `created_at` | timestamptz | Default `now()`. |
| `updated_at` | timestamptz | Updated by trigger. |

#### `ai_tutor_messages`

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | uuid primary key | Generated. |
| `conversation_id` | uuid references `ai_tutor_conversations(id)` on delete cascade | Required. |
| `role` | `tutor_message_role` | User or assistant. |
| `content` | text | Required. |
| `model` | text | Optional for assistant messages. |
| `metadata` | jsonb | Optional safe metadata. |
| `created_at` | timestamptz | Default `now()`. |

#### Optional: `badges` and `student_badges`

Implement only if dashboard badge logic becomes non-trivial. Simple computed badges can be rendered without persistence for MVP.

### 6.4 Views

Recommended views:

- `course_lesson_counts`: course ID, published lesson count, total duration.
- `student_course_progress`: user ID, course ID, total lessons, completed lessons, progress percent, last watched time.
- `admin_stuck_students`: user ID, course ID, last watched time, days inactive.
- `admin_common_tutor_questions`: normalized recent user questions, count, last asked.

Views must respect RLS or be queried only through admin-guarded server modules.

## 7. RLS Requirements

### 7.1 Helper Function

Create an admin helper function:

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;
```

### 7.2 Policy Matrix

| Table | Student policy | Admin policy |
| --- | --- | --- |
| `profiles` | Read/update own profile. | Read all profiles, update role only if intentionally supported. |
| `courses` | Read published courses. | Full CRUD. |
| `lessons` | Read lessons for published courses. | Full CRUD. |
| `enrollments` | Read/insert/update own enrollments. | Read all, manage if needed. |
| `lesson_progress` | Read/insert own progress only. | Read all progress. |
| `ai_tutor_conversations` | Read/insert/update own conversations only. | Read all or aggregate only. |
| `ai_tutor_messages` | Read/insert messages for own conversations only. | Read all or aggregate only. |

Never rely only on client-side route hiding for admin protection.

## 8. Data Access Requirements

### 8.1 Module Boundaries

Use dedicated modules for data access:

```text
lib/courses/queries.ts
lib/courses/actions.ts
lib/progress/queries.ts
lib/progress/actions.ts
lib/admin/queries.ts
lib/tutor/queries.ts
lib/tutor/actions.ts
lib/youtube/parser.ts
lib/youtube/metadata.ts
lib/auth/guards.ts
```

### 8.2 Validation

Use schema validation for all external input:

- Course creation/update.
- Lesson creation/update.
- YouTube URL parsing.
- Enrollment action.
- Mark watched action.
- AI tutor message submission.

Recommended validation library: use the current project convention if present. If no convention exists, add Zod only if acceptable for the project. Otherwise implement typed validation utilities.

## 9. API And Server Action Requirements

### 9.1 Course Enrollment

- Requires authenticated user.
- Creates enrollment if absent.
- Idempotent by unique constraint.
- Returns enrollment state and target lesson.

### 9.2 Mark Lesson Watched

- Requires authenticated user.
- Requires enrollment or creates enrollment depending on product decision. Recommended: require enrollment.
- Inserts `lesson_progress` idempotently.
- Updates `enrollments.last_accessed_lesson_id`.
- Sets `completed_at` if all lessons are complete.
- Returns progress summary.

### 9.3 Admin Course CRUD

- Requires admin role server-side.
- Validates input.
- Uses Supabase server/admin client only from server-only modules.
- Emits helpful errors for duplicate slug, invalid cover URL, invalid level, or unauthorized access.

### 9.4 YouTube Metadata

Video metadata flow:

1. Parse URL and extract video ID.
2. Validate host and ID shape.
3. Fetch oEmbed metadata when available.
4. Save title, thumbnail, video ID, URL, and optional duration.

Playlist import flow:

1. Parse playlist ID.
2. Verify `YOUTUBE_API_KEY` exists server-side.
3. Fetch playlist items from YouTube Data API.
4. Normalize into lesson drafts.
5. Let admin review before saving or save directly if UX is explicitly designed.
6. Save sequential sort order.

If no API key exists, show a clear message: playlist import requires server-side `YOUTUBE_API_KEY`.

### 9.5 AI Tutor Route

Recommended route: `app/[locale]/api/tutor/route.ts` or existing API convention.

Required behavior:

1. Verify authenticated user.
2. Validate request body: course ID, lesson ID, optional conversation ID, message content.
3. Verify user is enrolled in the course or lesson is preview if preview support exists.
4. Load course and lesson context from Supabase.
5. Load recent messages for the conversation, capped to a safe count.
6. Create conversation if none exists.
7. Persist user message.
8. Call AI model through Vercel AI Gateway.
9. Stream assistant response to the client.
10. Persist assistant response after stream completion.
11. Return safe errors without exposing secrets or stack traces.

System prompt requirements:

- Tutor is an AI programming tutor for Eyal's Coding Academy.
- Tutor must ground answers in the provided course and lesson context.
- Tutor must answer in the active locale unless the student asks otherwise.
- Tutor must avoid claiming to see the full YouTube video or timestamp-specific content unless transcript/timestamp data is provided.
- Tutor should ask one concise clarifying question if the student question is ambiguous.
- Tutor should propose a small exercise when useful.

## 10. UI Requirements

### 10.1 Design System

- Use existing Tailwind tokens and shadcn/Base UI components.
- Use Magic MCP-generated components only after adapting them to existing tokens, accessibility patterns, and localization.
- Support light/dark theme.
- Support RTL in Hebrew.
- Avoid one-off CSS unless it belongs in component-level styling or global tokens.

### 10.2 Required Components

Public/student:

- `CourseCard`
- `CourseCatalog`
- `EnrollmentButton`
- `LessonSidebar`
- `YouTubePlayer`
- `CourseProgressBar`
- `MarkWatchedButton`
- `TutorChat`
- `StudentDashboardCards`
- `BadgeList`

Admin:

- `AdminCourseForm`
- `AdminLessonForm`
- `YouTubeImportPanel`
- `LessonReorderList`
- `TeacherStatsCards`
- `StuckStudentsTable`
- `CommonTutorQuestionsTable`

Shared:

- `LoadingSkeleton`
- `EmptyState`
- `ErrorState`
- `LocalizedPageHeader`

## 11. Localization Requirements

- Add translations for all new strings to English and Hebrew catalogs.
- Use message keys grouped by feature: `Home`, `Courses`, `CoursePage`, `Tutor`, `Dashboard`, `Admin`, `Errors`, `Forms`.
- Avoid hard-coded English strings in components.
- For dates and percentages, use locale-aware formatting helpers.
- Ensure RTL layout does not reverse numerical progress incorrectly.

## 12. SEO Requirements

Public pages:

- Generate metadata for home page and course detail page.
- Use canonical URL with locale awareness.
- Include Open Graph title, description, and image where possible.
- Use structured headings.

Private pages:

- Add `robots: { index: false, follow: false }` or equivalent for dashboards/admin pages.

## 13. PWA Requirements

- Do not break existing manifest or service worker behavior.
- Ensure app shell works with new navigation routes.
- Do not cache authenticated API responses publicly.
- Avoid caching AI tutor responses in a way that leaks data between users.

## 14. TSDoc Requirements

Add TSDoc to:

- Exported utility functions.
- Server actions.
- Route handler helper functions.
- Data access functions.
- Complex types and interfaces.
- YouTube parser and metadata functions.
- Progress calculation functions.
- AI prompt builder functions.

TSDoc must explain:

- Purpose.
- Parameters.
- Return value.
- Auth/security assumptions when relevant.
- Side effects such as database writes.

## 15. Testing Requirements

### 15.1 Unit Tests With Vitest

Required unit coverage:

- YouTube video URL parser.
- YouTube playlist URL parser.
- Slug generation.
- Progress percentage calculation.
- Badge calculation.
- AI tutor prompt builder.
- Form validation schemas.
- Role guard helper functions.

### 15.2 Integration Tests

Required integration coverage:

- Course query functions with mocked Supabase responses.
- Enrollment action behavior.
- Mark watched action behavior.
- Admin course create/update/delete with role guard mocks.
- Tutor persistence flow with mocked AI provider.
- YouTube oEmbed/API route with mocked fetch.

### 15.3 E2E Tests With Playwright

Required e2e flows:

1. Public home loads localized course catalog.
2. Student signs in, enrolls, opens lesson, marks watched, sees progress.
3. Student asks AI tutor question and sees persisted message after refresh, using mocked AI in test mode if needed.
4. Admin creates a course and adds a YouTube lesson.
5. Non-admin cannot access admin routes.
6. Hebrew route renders RTL and translated UI.

## 16. Deployment Requirements

Before deployment:

1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm test` or equivalent unit/integration test command.
4. Run Playwright e2e locally or against preview.
5. Confirm `.env.local` is ignored.
6. Confirm `.mcp.json` is ignored if present.
7. Confirm no secrets appear in source files or generated docs.

Vercel requirements:

- All required environment variables configured.
- Supabase auth redirect URLs updated to production URL.
- App deploys from GitHub main branch.
- Preview deployments work for feature branches.
- Production app can connect to Supabase.
- AI tutor route works in production.

## 17. Acceptance Gate

The technical implementation is accepted only when:

- Existing baseline features still work.
- Required tables, relationships, RLS, and seed data exist.
- Student flow works end to end.
- Teacher flow works end to end.
- AI tutor uses real course/lesson context and stores history.
- Dashboards use Supabase data.
- EN/HE localization is complete for new features.
- Mobile and desktop layouts are usable.
- Tests cover critical logic and core flows.
- Vercel production deployment works.
