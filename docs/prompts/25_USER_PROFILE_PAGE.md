# Prompt: User Profile Page

```text
Add a user-facing profile page where any authenticated user (instructor or
student) edits their own details: name, phone, email, password, avatar, and
preferred locale. Adapt directly from the reference repo's profile page and
actions; this project already has the profiles table columns.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-16-ADMIN_PROFILE_FIXES_AND_USER_MANAGEMENT_DESIGN.md (Batch 25).
- Implementation plan: docs/superpowers/plans/2026-06-16-admin-profile-fixes-and-user-management.md (Batch 25).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Reference repo: /Users/talo/www/claude-code-ai-coach-assistant. Adapt
  app/[locale]/profile/page.tsx and lib/profile/profile-actions.ts (FormData
  server actions that redirect with ?notice=/?error= codes resolved via an
  allowlist). The reference repo's ensureProfile/updateProfile/updateEmail/
  updatePassword are the template.
- This project's profiles table already has full_name, phone, email, avatar_url,
  and locale ('en'|'he'). No schema change is needed beyond the avatar storage
  bucket.
- Guards: requireUser() (any authenticated user) from lib/auth. The auth-confirm
  route already exists for the email-change round-trip.
- Feedback channel + allowlist resolver pattern: mirror resolve-auth-message
  (?error=/?notice= -> localized banner). NEVER use JS-only inline state.
- The linked Supabase project is nlqpuppwjtxhfcfyjfre; apply the storage
  migration via the Supabase MCP.

Requirements:
1. Storage bucket: add migration 0006_avatars_storage_bucket.sql creating a
   public-read 'avatars' bucket. RLS: a user reads/writes only objects under
   their own {user_id}/ prefix; public read for display (so <img> works without
   signed URLs). Apply via MCP.
2. Validation: lib/validation/profile.ts Zod schemas - contact (full_name,
   phone), email, password (new + confirm match, min length), locale enum,
   avatar (MIME image/* allowlist, size cap). Server-side validation only;
   inputs are not trusted from HTML attributes.
3. Data layer: lib/profile/profile-actions.ts (import "server-only") -
   ensureProfile (idempotent upsert), updateProfile (full_name, phone ->
   profiles), updateEmail (supabase.auth.updateUser({ email }); effect after
   confirmation), updatePassword (supabase.auth.updateUser({ password })),
   updateAvatar (upload to avatars bucket, store public URL in
   profiles.avatar_url), updateLocale (profiles.locale; on save redirect into the
   chosen locale). Each has a FormData wrapper that redirects with a ?notice=/
   ?error= code. Add lib/profile/resolve-profile-message.ts (code -> localized
   key allowlist; anti-injection).
4. Page: app/[locale]/profile/page.tsx guarded by requireUser(). Five sections,
   each a Tier-2 no-JS <form> with type="submit" and <label for> fields posting
   FormData to its action: Contact details, Email, Password, Avatar, Locale. The
   avatar file input is the only non-no-JS part; the rest degrades gracefully.
5. Header link: add a Profile link to the header user/account menu, visible to
   BOTH roles when authenticated.
6. i18n: new Profile namespace, key-identical in messages/en-US.json and
   messages/he-IL.json. No hardcoded user-facing strings.
7. Accessibility + responsive: one <h1>, semantic landmarks,
   <main id="main-content">, visible focus, prefers-reduced-motion respected,
   jsx-a11y green. No horizontal overflow at 390/768/1280 in EN (LTR) and HE
   (RTL); logical RTL utilities; header nav collapses into the Sheet drawer below
   md. Only DESIGN.md semantic tokens for color; no Tailwind named-color literals
   or raw hex.
8. TSDoc on changed exports.
9. Tests:
   - Unit: each action's feedback-code mapping; resolve-profile-message; the
     validation schemas.
   - e2e: signed-in user sees the Profile link; the page renders all field
     groups; the contact round-trip works (submit -> ?notice banner); no overflow
     at 390/768/1280 in EN+HE.
   - For any mocked Supabase access use the working { ...builder } pattern with
     then:(resolve:(v:unknown)=>unknown), NOT a strict index signature.
   - Mock all external-network and storage calls in the default suite.
   - Run typecheck to its exit code; do not trust a tail of the log.
10. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory;
    append a dated entry to docs/DECISIONS.md.

Rules:
- Adapt from the reference repo's profile page/actions; match this project's
  conventions (next-intl navigation helpers, requireUser, the ?notice/?error
  channel).
- The avatars bucket is public-read by design (avatars display via <img>);
  per-user write is gated by RLS on the {user_id}/ prefix.
- Forms follow the 3-tier no-JS policy; feedback flows only through the query-
  param channel resolved to a localized banner.
- Never create middleware.ts.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm test,
  and npm run test:e2e. All gates must exit 0. Gates need Node 22.16.0; prefix
  PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH".
- Worktree is a sibling ../academy-25-user-profile, branch
  feature/25-user-profile; squash-merge into local main when green.
```
