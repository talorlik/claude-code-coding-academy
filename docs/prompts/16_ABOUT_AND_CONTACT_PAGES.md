# Prompt: About And Contact Pages

```text
Add two content pages to Eyal's Coding Academy: About and Contact.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md (Batch 16).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Pages are server components: setRequestLocale(locale as Locale) then
  getTranslations("Ns"); exactly one <main id="main-content">, one <h1>,
  semantic landmarks. Links come from @/i18n/navigation (NOT next/link); Base UI
  Button uses render={<Link/>} nativeButton={false}.
- Mirror the existing home page (app/[locale]/page.tsx) and login page for
  structure.
- Tier-2 forms are full no-JS: real <form> + type="submit" + <label for>,
  a FormData server action, and the ?error=/?notice= query-param feedback
  channel resolved to a localized banner (see how existing forms do it).
- New UI strings go in BOTH messages/en-US.json and messages/he-IL.json,
  key-identical (lint:i18n gate). Real Hebrew, RTL via Tailwind logical
  utilities.

Requirements:
1. About page at app/[locale]/about/page.tsx:
   - Structured shell only. The real marketing copy and hero image will be
     supplied later, so leave a single, obvious edit point for the hero image
     (a clearly commented placeholder image region using next/image-friendly
     markup or a labelled placeholder) and for the body copy (i18n keys with
     placeholder text marked as provisional).
   - Hero region, a short mission/section block, and a CTA linking to /courses.
   - New "About" i18n namespace in both catalogs.
2. Contact page at app/[locale]/contact/page.tsx:
   - A contact details block using a FAKE Tel-Aviv address and details
     (e.g. a Rothschild Blvd street address, an Israeli-format phone number,
     an email, and opening hours). Make clear in the implementation log these
     are placeholder/demo details.
   - A static map image placeholder region (no live Google Maps embed, no API
     keys) with appropriate alt text / aria handling.
   - A Tier-2 no-JS contact form: name, email, message fields with <label for>,
     a real submit button, server action submitContactMessage in
     lib/contact/actions.ts validated through a new Zod schema in
     lib/validation/contact.ts (use parseWithSchema and the existing
     ActionResult pattern), returning success/failure through the
     ?notice=/?error= channel.
   - The action does NOT need to send email. Validate, then queue/log the
     message server-side and acknowledge (mirror how reminders queued before a
     provider existed). Forwarding via the existing lib/email/transport.ts is
     OPTIONAL and must not block the batch or require new secrets.
   - New "Contact" i18n namespace in both catalogs.
3. Navigation: add About, Contact, and Courses links to the header
   (components/site-header.tsx textLinks AND drawerLinks) and to the footer
   (components/site-footer.tsx). Use @/i18n/navigation Link. Keep the header
   no-overflow contract and the mobile Sheet drawer behavior intact.
4. Add EN/HE translations for every new user-facing string, key-identical.
5. Add TSDoc for the exported server action, schema, and any exported helpers.
6. Add e2e coverage for /about and /contact: no horizontal overflow at
   390/768/1280 in EN (LTR) and HE (RTL), landmarks/one-h1 present, and the
   contact form renders with labelled fields and a submit button.
7. Update docs/planning/IMPLEMENTATION_LOG.md (placeholder-content decision,
   fake-details note, form-queue decision) and the academy-build-state memory.

Rules:
- New pages live under app/[locale]/ (locale prefix mandatory); do NOT create
  middleware.ts.
- No hardcoded user-facing strings; everything through getTranslations and
  present in BOTH catalogs.
- Do not request, transmit, or store any real personal data; the contact
  details are fake and the form is demo-grade.
- Do not weaken RLS, admin guards, or secret handling; do not add real map or
  email provider keys.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm test, and
  npm run test:e2e. All gates must exit 0.
- Worktree is a sibling ../academy-16-about-contact, branch
  feature/16-about-contact; squash-merge into local main when green.
```
