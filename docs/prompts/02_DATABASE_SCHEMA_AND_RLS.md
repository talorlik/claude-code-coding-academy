# Prompt: Database Schema, RLS, And Seed Data

```text
Use supabase-postgres-best-practices.

Build the Supabase database foundation for Eyal's Coding Academy inside the
existing project.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 2.1-2.5.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 5, 6, 7, 15, 16.
- Prompt map: docs/prompts/README.md.

Context:
- Preserve existing Supabase client structure and auth setup.
- The app needs courses, lessons, enrollments, progress, AI tutor conversations,
  AI tutor messages, student dashboard data, teacher dashboard data, completion
  certificates, smart search, class groups, reminders, and paid-course payment
  state.
- Students must only access their own private data.
- Admin users must manage courses/lessons and view student progress.
- The app uses Supabase Auth, so profiles should reference auth.users.

Requirements:
1. First inspect existing Supabase files, migrations, seed files, generated types, and profile/auth conventions.
2. Propose a schema plan before writing SQL.
3. Implement tables:
   - profiles
   - courses
   - lessons
   - enrollments
   - lesson_progress
   - ai_tutor_conversations
   - ai_tutor_messages
   - certificates
   - class_groups
   - class_group_members
   - reminder_events
   - course_prices
   - payments
4. Add support views only if useful and not over-engineered:
   - course_lesson_counts
   - student_course_progress
   - admin_stuck_students
   - admin_common_tutor_questions
   - group_progress_summary
   - search_documents
5. Add constraints:
   - unique course slug
   - unique lesson slug per course
   - unique lesson sort order per course
   - unique enrollment per user/course
   - unique progress per user/lesson
   - unique certificate per user/course
   - unique group slug or stable group identifier
   - unique group membership per user/group
   - unique simulated payment event id for idempotent payment confirmation
6. Add indexes for common reads.
7. Add updated_at trigger where needed.
8. Enable RLS on all private tables.
9. Add policies:
   - students can read published courses/lessons
   - students can manage only their own enrollments
   - students can manage only their own lesson progress
   - students can read/write only their own tutor conversations/messages
   - students can read only their own certificates
   - students can read only their own group memberships and allowed group data
   - students can read only their own payment state
   - admins can manage courses/lessons
   - admins can manage class groups and reminders
   - admins can view student progress, certificates, payments, and tutor question
     summaries
10. Add seed data:
   - two sample courses
   - at least three lessons per course
   - realistic YouTube lesson records using sample playlist/video data
   - at least one sample class group when auth seeding supports it safely
   - sample paid/free course states without real payment secrets
   - payment simulation records only, never real payment method details
11. Generate or update Supabase TypeScript types according to the existing
    project convention.
12. Add TSDoc to any new exported TypeScript database helpers.
13. Add tests or SQL verification steps for RLS behavior.

Rules:
- Do not use hard-coded final data in React components.
- Do not disable RLS to make development easier.
- Do not expose service/secret keys to client code.
- Do not break existing auth/session refresh.
- Payments are simulation-only: no actual payment, no money exchange, no real
  credit card, bank, wallet, or other payment method details. Successful
  simulated payment should mark the payment state as `paid`.

Deliverables:
- Migration SQL under supabase/migrations.
- Seed SQL if the project uses it.
- Updated generated database types.
- Updated docs/planning/IMPLEMENTATION_LOG.md with schema decisions.
- Verification commands and manual Supabase checks.
```
