# Prompt: Reminder Email Delivery via Gmail SMTP

```text
Add real reminder email delivery via Gmail SMTP, replacing the queue-only stub.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 14.1-14.3.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 5, 6.3, 9, 10, 11, 15.
- Builds on batch 11 (lib/reminders/actions.ts, lib/reminders/queries.ts,
  app/[locale]/admin/reminders/page.tsx) which currently queues reminders
  with status='queued' because no provider was configured.

Context:
- SMTP is now configured and VERIFIED working: SMTP_HOST=smtp.gmail.com,
  SMTP_PORT=465 (implicit TLS), SMTP_USER (a gmail.com address), SMTP_PASSWORD
  (a 16-char Gmail App Password). All four are in .env.local and Vercel. A live
  SMTP login (auth only, no send) already succeeded.
- Personal Gmail: ~500 sends/day limit. Fine for 15-25 students/month.
- All four SMTP_* vars are server-only - never NEXT_PUBLIC_, never in client code.
- The reminder_events table (batch 02) has status (reminder_status:
  queued/sent/failed/skipped), sent_at, reason, metadata. RLS: admin-only.

Tasks:
1. Inspect lib/reminders/actions.ts (queueReminder + idempotency window),
   lib/reminders/queries.ts (identifyInactiveStudents from admin_stuck_students),
   app/[locale]/admin/reminders/page.tsx, lib/types/action-result.ts,
   lib/auth/guards.ts (requireAdmin), the reminder DTO + validation.
2. Add nodemailer: npm install nodemailer + npm install -D @types/nodemailer.
3. Create a SERVER-ONLY email transport module lib/email/transport.ts:
   - import "server-only" at the top.
   - A getTransport() that builds a nodemailer transport from SMTP_HOST/PORT/
     USER/PASSWORD (port 465 => secure:true SMTP_SSL; 587 => STARTTLS). Reads
     env at call time, not module load (so tests can stub). Strips spaces from
     the app password defensively.
   - A sendEmail({ to, subject, text, html }) returning ActionResult-style
     result; the From address is SMTP_USER (or an optional EMAIL_FROM if you
     add one to .env.example; default to SMTP_USER). Safe errors only - never
     leak SMTP_PASSWORD or raw transport errors with credentials. TSDoc.
   - If SMTP_* env is missing, return a clear fail (mirrors the old
     missing-provider behavior) so the app degrades to queue-only rather than
     crashing.
4. Wire it into reminders: add a server action sendReminder(reminderId) (or
   extend the existing flow) in lib/reminders/actions.ts that:
   - requireAdmin() (re-check inside the action; never trust the client).
   - loads the queued reminder + the target student's email (from profiles
     email, or auth.users via the admin client if profiles.email is null -
     reuse existing patterns; do not over-fetch private data).
   - composes a localized reminder email (course title, gentle nudge, link to
     the course) - the email body should be localized to the student's locale
     if available (profiles.locale), else default.
   - sends via lib/email/transport.ts; on success sets reminder_events.status
     ='sent' + sent_at=now(); on failure sets status='failed' and surfaces a
     clear error. Idempotent: a reminder already 'sent' is not re-sent.
   - KEEP the existing queue behavior: queueReminder still creates 'queued'
     rows; sending is the explicit second step (two-step: queue, then send),
     so admin reviews before anything goes out. Do NOT auto-send on queue.
5. Admin reminders UI: add a "Send" action per queued reminder (and reflect
   sent/failed status with the existing status display). Confirm-before-send is
   a plus. Localized button + toasts. Server action via form/useTransition.
6. Tests (deterministic - MOCK nodemailer; never send a real email in the suite):
   - Unit/integration for sendEmail: vi.mock('nodemailer') so createTransport
     returns a fake whose sendMail resolves/rejects; assert getTransport uses
     465=>secure, 587=>starttls, missing-env => fail, password space-strip.
   - Integration for sendReminder: mock @/lib/supabase/server + the transport;
     assert requireAdmin gate, status flips queued->sent on success and
     queued->failed on transport error, already-sent is idempotent, and no
     SMTP_PASSWORD appears in any returned error.
   - Optional opt-in LIVE send test guarded behind SMTP_LIVE_TEST=true sending
     to SMTP_USER itself (self-send), test.skip by default. Document it.
7. EN/HE strings for the email subject/body and the admin Send UI; catalogs
   key-identical (npm run lint:i18n).
8. Update .env.example with the SMTP_* vars (placeholders, scope server-only,
   note Gmail App Password + the 465/587 choice + the ~500/day personal limit)
   and optional EMAIL_FROM.
9. Update docs/planning/IMPLEMENTATION_LOG.md: the SMTP transport design,
   two-step send (no auto-send), status state machine, the deliverability /
   Vercel-serverless caveat (if Gmail SMTP is blocked from Vercel's IPs in
   production, the fallback is an HTTP email API like Resend - note it as a
   known risk to verify post-deploy), and the live-test opt-in flag.

Acceptance criteria:
- Admin can send a queued reminder; the student receives a localized email;
  reminder_events.status flips to 'sent' with sent_at.
- A send failure marks 'failed' with a clear localized error and never leaks
  the SMTP password.
- Sending requires admin server-side; queue-then-send is two-step.
- Default test suite passes with nodemailer fully mocked (no real send).
- npm run lint, lint:i18n, typecheck, test, build, and test:e2e all pass.

Rules:
- SMTP_* are server-only. Never expose them to the client; never log the
  password or a raw error containing it.
- Mock nodemailer in the default test suite; any real send is opt-in only.
- Payments/reminders remain a real product flow; do not introduce real payment
  provider keys. This batch is about email delivery only.
- Reuse requireAdmin, ActionResult, the existing reminder modules; this is an
  additive feature, not a rewrite.
```
