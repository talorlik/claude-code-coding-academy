# Prompt: Planning Alignment And Test Harness

```text
Stabilize the project planning and test harness before building new course
platform features.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 1.1-1.3.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 1, 2, 14, 15, 17.
- Prompt map: docs/prompts/README.md.

Context:
- Task 0 should already have verified the existing project foundation.
- The implementation log is the shared memory for later Claude Code runs.
- Test tooling should follow the existing package scripts and project style.
- Do not add product features in this prompt.

Requirements:
1. Read docs/planning/TASK_BREAKDOWN.md and the Task 0 findings in
   docs/planning/IMPLEMENTATION_LOG.md if it already exists.
2. Create or update docs/planning/IMPLEMENTATION_LOG.md with:
   - Task 0 baseline findings.
   - Known constraints.
   - Open risks.
   - Implementation decisions.
   - Verification results.
3. Inspect the current Vitest, Testing Library, jsdom, and Playwright setup.
4. Add missing test configuration only when the repository does not already have
   an equivalent convention.
5. Establish test directories only if missing:
   - tests/unit
   - tests/integration
   - tests/e2e
6. Add or update shared test setup only if needed by the current toolchain.
7. Add shared factories for course, lesson, and user data:
   - tests/factories/course.ts
   - tests/factories/lesson.ts
   - tests/factories/user.ts
8. Keep factories typed and deterministic.
9. Do not use real secrets or external services in tests or factories.
10. Update docs/planning/IMPLEMENTATION_LOG.md with test harness decisions.

Verification:
1. Run npm test if the script exists.
2. Run npx playwright test --list.
3. Run npm run lint.
4. Run npm run typecheck.
5. Document any missing prerequisites instead of ignoring failures.

Rules:
- Preserve existing functionality and project conventions.
- Do not expose secrets.
- Do not add brittle tests that depend on implementation details.
- Keep this prompt focused on planning alignment and reusable test foundations.
```
