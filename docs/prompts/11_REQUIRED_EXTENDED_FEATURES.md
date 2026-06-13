# Prompt: Required Extended Features

```text
Implement the required extended feature set for Eyal's Coding Academy.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 10.1-10.5.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 6.2.1, 6.3, 6.4, 7, 8, 9.1, 10, 11, 14, 15.
- Prompt map: docs/prompts/README.md.

Context:
- These features are part of the required product and must not be deferred.
- They must be designed as first-class requirements and integrated with the
  existing course, dashboard, admin, testing, and deployment flows.
- The earlier batches should already provide courses, progress, dashboards,
  auth, admin guards, localization, and Supabase foundations.
- Preserve existing auth, localization, RTL, accessibility, responsive behavior,
  test coverage, and deployment configuration.

Requirements:
1. Build completion certificates:
   - create certificate eligibility logic when a course is complete
   - persist certificate metadata in Supabase
   - expose a student certificate page and download action
   - ensure students can only access their own certificates unless admin
2. Build smart search:
   - search published course titles, lesson titles, and lesson descriptions
   - include transcript search when transcript data exists
   - keep private/admin-only data out of student search results
3. Build class groups:
   - allow admin to create groups and assign students
   - expose group progress dashboards for admins
   - expose a student group dashboard scoped to the current user's memberships
4. Build reminders:
   - identify inactive students from progress/activity data
   - provide an admin review/queue UI
   - record reminder sends idempotently
   - if no delivery provider is configured, queue reminders visibly instead of
     silently failing
5. Build payments:
   - support paid courses with a complete simulation-only payment flow
   - create simulated checkout sessions server-side
   - mark successful simulated payments as `paid`
   - persist simulated payment events idempotently
   - gate paid-course enrollment by purchase state or admin access
   - clearly label the payment UI as simulated payment
   - require no real credit card, bank, wallet, or payment method details
   - use fake/demo-only payment details anywhere the UI needs payment inputs
6. Add EN/HE translations for every new user-facing string.
7. Add TSDoc for exported helpers, server actions, route helpers, and types.
8. Update docs/planning/IMPLEMENTATION_LOG.md with schema, provider, and
   product decisions.
9. Add focused unit, integration, and e2e coverage for all five features.

Rules:
- Do not treat any of these features as optional or deferred.
- Do not weaken RLS, admin guards, or secret handling.
- Payment is a simulation. No actual payment takes place, no money exchanges
  hands, and no real payment method details may be requested, transmitted, or
  stored.
- Do not introduce real payment provider keys, provider secrets, webhook
  secrets, or real payment SDK requirements for this assignment.
- Do not expose email provider secrets or service role keys to client code.
- Use deterministic mocks for payment, reminder delivery, AI, and YouTube in
  automated tests unless a separate live-test mode is explicitly configured.
- Run npm run lint, npm run typecheck, npm test, and relevant Playwright tests.
```
