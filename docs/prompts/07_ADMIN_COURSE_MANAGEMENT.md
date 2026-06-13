# Prompt: Admin Course Management

```text
Use frontend-design, ui-ux-pro-max, Magic MCP, and supabase-postgres-best-practices.

Build the admin course management flow for Eyal's Coding Academy.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 6.1-6.6.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 4, 7, 9.3, 9.4, 10, 11, 15.
- Prompt map: docs/prompts/README.md.

Context:
- Admin pages must be protected server-side using the existing Supabase auth/session pattern.
- Eyal/admin users can manage courses and lessons.
- Students must not access admin routes or admin data.
- Lessons are based on YouTube videos and optional playlist import.

Requirements:
1. Inspect existing auth guard and route protection patterns.
2. Implement or reuse an admin guard that checks the user's role from Supabase profiles.
3. Build admin course list page.
4. Build create/edit course form with:
   - title
   - slug
   - description
   - level
   - cover image URL
   - language
   - status
5. Build lesson management UI for a course:
   - add lesson from YouTube video URL
   - edit lesson title/description/duration/video URL/sort order
   - delete mistaken lesson
   - reorder lessons
6. Build playlist import UI:
   - parse playlist URL
   - use server-side YOUTUBE_API_KEY when configured
   - show clear missing-key message if not configured
   - import multiple lessons with correct sort order
7. Add form validation and localized errors.
8. Add loading, empty, success, and error states.
9. Add EN/HE translations and verify RTL.
10. Add TSDoc for exported admin actions and YouTube helpers.
11. Add tests:
   - admin guard tests
   - course validation tests
   - lesson creation tests
   - YouTube parser tests
   - e2e non-admin route denial
   - e2e admin create course and lesson flow

Rules:
- Do not expose YOUTUBE_API_KEY to the browser.
- Do not rely on client-side hiding for admin protection.
- Do not bypass RLS with admin client unless the module is server-only and role-guarded.
- Keep the UI consistent with existing theme and component conventions.
```
