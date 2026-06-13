# Prompt: Course Page, YouTube Player, And Progress Tracking

```text
Use frontend-design, ui-ux-pro-max, and Magic MCP.

Build the student course learning experience for Eyal's Coding Academy.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 5.1-5.5.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 4, 6.3, 8, 9.1, 9.2, 10, 11, 15.
- Prompt map: docs/prompts/README.md.

Context:
- Existing auth, Supabase clients, localization, theme, accessibility, and PWA functionality must be preserved.
- Courses and lessons are stored in Supabase.
- Progress is tracked per student and per lesson.
- The course page must work on desktop and mobile.

Requirements:
1. Inspect existing route conventions and protected page conventions.
2. Add a localized course learning route using the existing app/[locale]/ pattern.
3. Load the selected course, ordered lessons, enrollment state, and current user's progress from Supabase.
4. Build components:
   - LessonSidebar
   - YouTubePlayer
   - CourseProgressBar
   - MarkWatchedButton
   - LessonDetails
   - CourseCompletionState
5. The page must show:
   - course title and description
   - lesson sidebar
   - selected lesson title and description
   - embedded YouTube player
   - progress bar
   - completed lesson checkmarks
   - mark as watched action
6. Implement mark-as-watched server action:
   - require authenticated user
   - require enrollment
   - insert progress idempotently
   - update last accessed lesson
   - set enrollment completed_at when all lessons are completed
   - return updated progress summary
7. Automatically move to the next lesson after marking watched when available.
8. Add loading, empty, and error states.
9. Add EN/HE translations and verify RTL.
10. Add TSDoc for exported progress helpers/actions.
11. Add unit tests for progress calculation.
12. Add integration tests for mark-as-watched behavior.
13. Add Playwright e2e for the student enrollment and progress flow.

Rules:
- Do not trust user IDs from the client.
- Do not allow users to write progress for other users.
- Do not hard-code lessons in the page.
- Do not break existing PWA/auth/theme behavior.
```
