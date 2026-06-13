# Prompt: Student And Teacher Dashboards

```text
Use frontend-design, ui-ux-pro-max, and Magic MCP.

Build student and teacher dashboards for Eyal's Coding Academy.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 8.1-8.4.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 6.4, 8, 10, 11, 15.
- Prompt map: docs/prompts/README.md.

Context:
- Student dashboard is available at /dashboard under the localized route structure.
- Teacher dashboard is available at /admin/dashboard under the localized route structure.
- Dashboard data must come from Supabase, not hard-coded arrays.
- Teacher dashboard requires admin role server-side.

Student dashboard requirements:
1. Show enrolled courses.
2. Show completion percentage for each course.
3. Show weekly progress summary.
4. Show recently watched lessons.
5. Show achievement badges:
   - Completed my first course
   - Watched five lessons this week
   - Finished a beginner course
6. Show empty states when there is no activity.

Teacher dashboard requirements:
1. Show total students.
2. Show total enrollments.
3. Show course completion rates.
4. Show students who have not watched a lesson in over a week.
5. Show common AI tutor questions.
6. Show recent course activity.
7. Add course filter if simple to implement.

Technical requirements:
1. Build dedicated dashboard query modules.
2. Scope student queries to current user.
3. Guard teacher queries with admin role.
4. Use efficient Supabase queries or SQL views.
5. Use Recharts only where a chart adds clarity.
6. Add localized strings in EN and HE.
7. Verify RTL and mobile layout.
8. Add loading, empty, and error states.
9. Add TSDoc for exported query helpers.
10. Add tests for badge/progress calculations and dashboard query behavior.
11. Add e2e smoke tests for student and admin dashboards.

Rules:
- Do not expose admin analytics to students.
- Do not fetch all private student data into client components unnecessarily.
- Keep charts readable in dark and light mode.
```
