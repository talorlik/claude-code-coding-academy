# Prompt: Testing And QA Completion

```text
Complete the testing and QA layer for Eyal's Coding Academy.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 11.1-11.3.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 15, 17.
- Prompt map: docs/prompts/README.md.

Context:
- The project uses Vitest, jsdom, Testing Library, and Playwright.
- Core implementation should already exist.
- Do not call real external AI or YouTube services in normal automated tests unless explicitly configured for a separate live test mode.

Required unit tests:
1. YouTube video URL parser.
2. YouTube playlist URL parser.
3. Slug generation.
4. Course and lesson validation.
5. Progress percentage calculation.
6. Badge calculation.
7. AI tutor prompt builder.
8. Role guard helpers.
9. Certificate eligibility.
10. Search query normalization.
11. Group membership helpers.
12. Reminder inactivity detection.
13. Payment state mapping.

Required integration tests:
1. Course catalog query with mocked Supabase.
2. Enrollment action.
3. Mark lesson watched action.
4. Admin course create/update action.
5. Admin lesson create/reorder/delete action.
6. YouTube metadata route/helper with mocked fetch.
7. AI tutor route with mocked AI stream and mocked Supabase persistence.
8. Certificate creation and access control.
9. Search result scoping.
10. Group creation and membership management.
11. Reminder queue idempotency.
12. Simulated checkout and payment-state handling.

Required Playwright e2e tests:
1. Public home loads course catalog.
2. Student logs in, enrolls, opens course, marks lesson watched, sees progress.
3. Student asks AI tutor question and sees persisted history after refresh.
4. Admin creates course and adds YouTube lesson.
5. Non-admin cannot access admin pages.
6. Hebrew route renders translated RTL UI.
7. Student downloads a certificate after course completion.
8. Search finds a course or lesson.
9. Admin creates a class group and student sees the group dashboard.
10. Admin reviews inactive-student reminders.
11. Paid-course purchase/enrollment state works with fake payment details and
    simulated `paid` state.

QA checklist:
1. Run npm run lint.
2. Run npm run typecheck.
3. Run unit/integration tests.
4. Run Playwright tests.
5. Run npm run build.
6. Manually test desktop and mobile viewport.
7. Manually test light/dark theme.
8. Manually test EN/HE routes.
9. Manually test deployed preview if available.
10. Confirm no secrets are printed in test output or committed files.

Rules:
- Prefer deterministic mocks.
- Do not make tests brittle by asserting internal implementation details.
- Cover behavior and user flows.
- Document any intentionally skipped live-service tests.
```
