# Prompt: Theme Surface Sweep And Polish

```text
Sweep every remaining surface so light and dark both look intentional and
DESIGN.md-conformant: remove the last hardcoded colors, give the AI tutor the
signature Terminal Code Panel treatment, polish the cards/dashboards/admin/auth/
certificate surfaces, and run a WCAG AA contrast pass on every interactive
pairing.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md (Batch 22).
- Style reference: docs/design/DESIGN.md (Terminal Code Panel, Feature Card,
  Stats Block, the surfaces/elevation tables, the Do's and Don'ts).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Batches 20-21 installed the token bridge and styled the hero + chrome. Because
  93 files consume the shadcn tokens, most surfaces are ALREADY themed via the
  bridge; this batch is targeted conformance + contrast polish, NOT layout
  rewrites.
- Verified hardcoded-color hot spots (the only files with literal colors):
  - app/[locale]/admin/groups/page.tsx: a bg-green-50 / text-green-800 status
    banner (and its dark: variant).
  - app/[locale]/admin/reminders/page.tsx: green/red status pills
    (bg-green-100/text-green-800, bg-red-100/text-red-800, and dark: variants).
- Batch 20 exposed a DESIGN.md palette-green passthrough via @theme inline
  (from --color-success-green light / --color-specimen-green dark) for
  "success/sent" states; --color-danger-bg / --color-danger-text already exist
  semantically for "failed/error" states.
- The AI tutor UI is components/tutor/tutor-chat.tsx (developer Q&A - the natural
  home for the Terminal Code Panel). It is a Tier-3 client island.

Requirements:
1. Replace the hardcoded status colors with DESIGN.md palette colors only:
   - admin/groups status banner and admin/reminders "sent/success" pills ->
     the DESIGN.md success-green passthrough exposed in Batch 20 (NOT a Tailwind
     green-* literal).
   - admin/reminders "failed/error" pills -> var(--color-danger-bg) /
     var(--color-danger-text).
   - Remove every green-*/red-* Tailwind literal and dark: color override in
     these two files. If any themeColor or other literal hex remains anywhere
     from earlier batches, fix it here too.
2. Tutor chat (components/tutor/tutor-chat.tsx): apply the DESIGN.md Terminal
   Code Panel treatment where it renders the assistant's technical output -
   var(--color-code-bg) background, --radius-code-panels, JetBrains Mono, and
   the syntax colors (--color-code-key/string/keyword/alert) for any rendered
   code/JSON. Keep the existing streaming, a11y, and RTL behavior; this is
   presentation only.
3. Verify and polish in BOTH themes for DESIGN.md conformance + legibility,
   editing only presentation classes (the bridge already supplies the colors):
   - Course/catalog cards (components/courses/course-card.tsx,
     course-catalog.tsx): Feature Card geometry (surface bg, hairline border,
     12px radius, 24px padding).
   - Dashboards (components/dashboard/*): render the big numbers as DESIGN.md
     Stats Blocks - Inter 600 36px in var(--color-accent), caption in
     var(--color-text-muted); charts read in both themes (the --chart-* mapping
     from Batch 20).
   - Admin tables (components/admin/*), auth forms (login/register/forgot/reset
     pages and their fields), and the certificate page - confirm surfaces,
     borders, and text use the semantic tokens and read in light + dark.
4. WCAG AA contrast pass on every interactive pairing, with attention to the
   dark-theme cases DESIGN.md specifies: secondary button = Terminal Amber
   (#733e0a) bg with cream text; danger = Crimson (#8b0836) / Fault Red
   (#ff2056); primary = Bioluminescent Green (#004f3b) on Ice Blue. Implement
   the DESIGN.md value; where a literal pairing fails AA (text on its
   background below 4.5:1, or 3:1 for large text/UI), log it to
   docs/planning/TECH_DEBT.md and docs/DECISIONS.md with the measured ratio and
   the surface - do NOT silently alter the DESIGN.md palette.
5. Mobile-first and RTL still hold across every swept page: min-w-0 on
   shrinkable flex children, shrink-0 on fixed controls, flex-wrap on rows,
   break long strings, logical RTL utilities. No horizontal overflow at
   390/768/1280 in EN (LTR) and HE (RTL). Follow docs/RESPONSIVE.md.
6. Any new user-facing strings go to BOTH messages/en-US.json and
   messages/he-IL.json, key-identical.
7. TSDoc on any changed export.
8. Tests:
   - Unit tests for any logic touched (none expected; if a status-color helper
     is extracted, test its mapping).
   - e2e visual-contract regression across the swept pages: theme toggle flips
     .light/.dark, no overflow at 390/768/1280 in EN and HE, and the admin
     status pills render without any green-*/red-* literal class.
   - For any mocked Supabase access use the working { ...builder } pattern with
     then:(resolve:(v:unknown)=>unknown), NOT a strict index signature.
   - Run typecheck to its exit code; do not trust a tail of the log.
9. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory;
   record any logged contrast deviation in DECISIONS.md.

Rules:
- Every element uses only DESIGN.md .light/.dark palette colors via the semantic
  tokens. No Tailwind named-color literals (green-*, red-*, blue-*, ...) and no
  raw hex anywhere in app code after this batch. Inside .dark use only the dark
  palette; inside .light only the light palette.
- Use --color-code-bg / --color-code-surface for any code or terminal content;
  code blocks never sit directly on the page canvas (DESIGN.md).
- Presentation only: do not change data access, RLS, domain logic, or routing.
- Log contrast misses to TECH_DEBT + DECISIONS rather than re-coloring the
  palette.
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm
  test, and npm run test:e2e. All gates must exit 0.
- Worktree is a sibling ../academy-22-surface-sweep, branch
  feature/22-surface-sweep; squash-merge into local main when green.
```
