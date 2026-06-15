# Prompt: About Content And Contact Google Maps

```text
Replace the provisional About copy with the real supplied content (EN + HE) and
replace the Contact page's dashed map placeholder with a real Google Maps Embed.
Fully independent of the other batches. Needs the new
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY (with a graceful fallback when absent).

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-16-ADMIN_PROFILE_FIXES_AND_USER_MANAGEMENT_DESIGN.md (Batch 27).
- Implementation plan: docs/superpowers/plans/2026-06-16-admin-profile-fixes-and-user-management.md (Batch 27).
- Source content: docs/content/ABOUT_EN.md and docs/content/ABOUT_HE.md.
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- #5: app/[locale]/about/page.tsx currently renders provisional inline i18n keys.
  The real content lives in docs/content/ABOUT_EN.md and ABOUT_HE.md. Both files
  have the SAME six sections, in order:
    1. Learn To Code With Structure, Clarity, And Personal Attention (intro)
    2. A Smarter Way To Learn Programming
    3. Professional Teaching, Personal Guidance
    4. Built For Real Coding Skills (includes a 5-step ordered list)
    5. AI Tutor Support Inside The Learning Context
    6. For Students Who Want To Build, Not Just Watch
- #6: app/[locale]/contact/page.tsx renders a dashed placeholder box
  (role="img", aria-label) where the map should be. Replace it with a Maps Embed
  API iframe. The Embed API key is client-visible by design and secured by
  HTTP-referrer restriction; it is a PLAIN (not Sensitive) env var.

Requirements:
1. About content (#5): port the six sections from ABOUT_EN.md and ABOUT_HE.md into
   the About i18n namespace as DISCRETE keys - a heading key plus body-paragraph
   keys per section (NOT one blob), so RTL and typography stay controllable.
   English structure is canonical; Hebrew maps key-for-key (lint:i18n requires
   identical keys). Section 4's 5-step ordered list becomes ordered list-item
   keys. Render the keys in order in app/[locale]/about/page.tsx, keeping the
   existing hero-image slot and overall layout. Replace the provisional copy.
2. Contact Google Maps (#6): in app/[locale]/contact/page.tsx, render a Maps
   Embed API iframe when NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY is set:
   src="https://www.google.com/maps/embed/v1/place?key=<key>&q=<address>", with a
   localized title attribute for accessibility, loading="lazy", and a referrer
   policy appropriate for an embed. Use the Contact address already on the page
   for q. When the key env var is ABSENT, fall back to the existing placeholder
   box (do NOT render a broken iframe), so CI without secrets stays green.
3. i18n: any new keys (the expanded About namespace and the Contact map
   title/labels) go to BOTH messages/en-US.json and messages/he-IL.json,
   key-identical. No hardcoded user-facing strings.
4. Accessibility + responsive: one <h1>, semantic landmarks,
   <main id="main-content">, the iframe has a descriptive localized title; no
   horizontal overflow at 390/768/1280 in EN (LTR) and HE (RTL); logical RTL
   utilities. Only DESIGN.md semantic tokens for any framing; no Tailwind
   named-color literals or raw hex.
5. Env: document NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY in the batch capture -
   plain (not Sensitive) in Vercel because NEXT_PUBLIC_ values are inlined into
   the client bundle; secure it by HTTP-referrer restriction in Google Cloud
   Console (Vercel domains + localhost) and by restricting the key to the Maps
   Embed API. Add it to .env.local and Vercel (all environments).
6. TSDoc on changed exports.
7. Tests:
   - e2e: the real About section headings render in EN and HE with no overflow at
     390/768/1280; the Contact page renders the map iframe when the key is present
     and the placeholder box when it is absent (drive both branches).
   - Run typecheck to its exit code; do not trust a tail of the log.
8. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory;
   append a dated entry to docs/DECISIONS.md.

Rules:
- The Maps Embed key is public by necessity (it rides in the iframe src) and safe
  via referrer + API-scope restriction; it is PLAIN, not Sensitive. Do not put it
  behind a server-only boundary.
- The absent-key fallback to the placeholder is mandatory so batches stay green
  without the secret.
- Preserve the About hero-image slot and layout; this is a content swap, not a
  redesign.
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs.
- Never create middleware.ts.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm test,
  and npm run test:e2e. All gates must exit 0. Gates need Node 22.16.0; prefix
  PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH".
- Worktree is a sibling ../academy-27-about-content-and-maps, branch
  feature/27-about-content-and-maps; squash-merge into local main when green.
```
