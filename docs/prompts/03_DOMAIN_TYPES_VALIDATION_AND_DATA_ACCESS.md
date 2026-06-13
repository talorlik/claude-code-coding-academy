# Prompt: Domain Types, Validation, And Data Access

```text
Build the shared TypeScript domain layer that later UI, admin, dashboard, and
AI tutor prompts depend on.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md,
  Tasks 3.1, 3.2, 3.4, 3.5.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 6.3, 6.4, 8, 14, 15.
- Prompt map: docs/prompts/README.md.

Context:
- The Supabase schema and generated database types should already exist.
- Course, lesson, progress, tutor, certificate, search, group, reminder, and
  payment code must use typed DTOs and validation.
- Public reads must only expose published course data.
- Private reads and writes must be scoped to the authenticated user.
- This prompt does not replace the YouTube parser prompt. Use
  docs/prompts/04_YOUTUBE_PARSER_AND_METADATA.md for YouTube URL parsing and
  metadata helpers.

Requirements:
1. Inspect existing Supabase type locations, data access conventions, and
   validation library usage.
2. Add shared domain types:
   - lib/courses/types.ts
   - lib/progress/types.ts
   - lib/tutor/types.ts
   - lib/certificates/types.ts
   - lib/search/types.ts
   - lib/groups/types.ts
   - lib/reminders/types.ts
   - lib/payments/types.ts
3. Map Supabase rows to UI-safe DTOs without leaking private fields.
4. Add validation schemas:
   - lib/validation/course.ts
   - lib/validation/lesson.ts
   - lib/validation/tutor.ts
   - lib/validation/group.ts
   - lib/validation/reminder.ts
   - lib/validation/payment.ts
5. Validate course, lesson, enrollment, progress, tutor, certificate, search,
   group, reminder, and payment inputs.
6. Add or update course query functions in lib/courses/queries.ts:
   - public course catalog reads published courses only
   - course detail includes ordered lessons
   - lesson count is included where useful
7. Add progress calculation utilities:
   - lib/progress/calculate.ts
   - tests/unit/progress.test.ts
8. Progress calculation must handle:
   - zero lessons
   - partial completion
   - full completion
9. Add focused tests for validation, course query behavior, and progress
   calculation using mocks where external services would otherwise be needed.
10. Include first-class DTO and validation support for required extended
    features so later prompts do not have to retrofit the type layer.
11. Add TSDoc to exported domain types, query functions, validation schemas, and
    progress helpers.
12. Update docs/planning/IMPLEMENTATION_LOG.md with domain-layer decisions.

Verification:
1. Run npm test.
2. Run npm run lint.
3. Run npm run typecheck.
4. Document any missing prerequisites or intentionally deferred coverage.

Rules:
- Do not hard-code course data in React components.
- Do not trust user IDs from the client.
- Do not expose service-role or secret environment variables to client code.
- Keep client components out of the shared server data layer unless the existing
  project already has a clear client-safe pattern.
```
