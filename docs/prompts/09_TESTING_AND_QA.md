# Prompt: Testing And QA Completion

```text
Complete the testing and QA layer for Eyal's Coding Academy.

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

Required integration tests:
1. Course catalog query with mocked Supabase.
2. Enrollment action.
3. Mark lesson watched action.
4. Admin course create/update action.
5. Admin lesson create/reorder/delete action.
6. YouTube metadata route/helper with mocked fetch.
7. AI tutor route with mocked AI stream and mocked Supabase persistence.

Required Playwright e2e tests:
1. Public home loads course catalog.
2. Student logs in, enrolls, opens course, marks lesson watched, sees progress.
3. Student asks AI tutor question and sees persisted history after refresh.
4. Admin creates course and adds YouTube lesson.
5. Non-admin cannot access admin pages.
6. Hebrew route renders translated RTL UI.

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
