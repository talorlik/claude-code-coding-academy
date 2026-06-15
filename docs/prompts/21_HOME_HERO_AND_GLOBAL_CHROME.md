# Prompt: Home Hero And Global Chrome

```text
Apply the DESIGN.md look to the home hero and the global chrome: a centered
editorial hero with the user-supplied header banner as its wide artifact, the
benefits as DESIGN.md Feature Cards, and the theme-scoped logo placed in the
header and footer with DESIGN.md nav geometry.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md (Batch 21).
- Style reference: docs/design/DESIGN.md (Hero/Layout sections, Feature Card,
  Navigation Bar, Eyebrow Label, Inline Highlighted Word, the two button specs).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Batch 20 installed the DESIGN.md token system (the shadcn bridge), JetBrains
  Mono on --font-mono, Inter with calt/liga 0, the real favicon, the brand
  assets in public/brand/ (logo_dark.png, logo_light.png, header_banner.png),
  and the <Logo /> component in components/logo.tsx (theme-swapped, no-JS safe).
- app/[locale]/page.tsx today: a hero <section> with an <h1> headline + subhead
  + two Buttons (Browse / Get started), a benefits grid (BookOpen/Video/Code2/
  Users icons), and a Suspense-wrapped CourseCatalog section. Strings come from
  the Home namespace via getTranslations.
- components/site-header.tsx today: a text-only wordmark
  (font-mono common("appName")) on the left; inline nav (md+) with a search
  icon; a controls cluster (InstallPrompt, LanguageSwitcher, ModeToggle); a
  hamburger Sheet drawer below md; a Sign in / Sign out control pinned to the
  inline end. It is a server component reading auth state. Preserve all of this
  behavior; only restyle and swap the wordmark for the logo.
- components/site-footer.tsx renders the footer.

Requirements:
1. Home hero (app/[locale]/page.tsx):
   - Keep the single <h1>. Apply DESIGN.md display type (--text-display 48px,
     tracking -2.98px, Inter 600) on the headline, with ONE inline-highlighted
     word in var(--color-accent) (the inline-highlight pattern), same size/
     weight as the surrounding text. Add a JetBrains Mono eyebrow label above
     the headline (--text-eyebrow 11px, uppercase, tracking 0.88px,
     var(--color-text-muted) or var(--color-accent)).
   - Render header_banner.png as the wide hero artifact via next/image
     (public/brand/header_banner.png), framed at --radius-large-blocks (16px),
     placed under the text stack. It is a dark IDE mockup: in dark mode it sits
     flush on the canvas; in light mode it reads as a framed dark code panel on
     cream (intentional per DESIGN.md). Give it explicit width/height (or
     fill+aspect) so there is no layout shift, sized to avoid overflow at
     390/768/1280.
   - Dual CTA: primary filled button (Browse courses) + secondary ghost/outline
     button (Get started). DESIGN.md button geometry: 4px radius, 12x24 padding,
     Inter 500 14px. Never a lone primary.
   - Benefits section -> DESIGN.md Feature Cards: each card uses
     var(--color-surface) bg, 1px var(--color-border), --radius-cards (12px),
     24px padding, an accent icon (var(--color-accent)) top-left, an Inter 600
     16px title in var(--color-text-strong), and Inter 400 14px body in
     var(--color-text-muted).
2. Header (components/site-header.tsx):
   - Replace the text wordmark with <Logo /> (linked to "/"). Keep it shrink-0.
   - Apply DESIGN.md nav geometry: ~64px height, var(--color-nav-bg) with the
     existing backdrop blur, a hairline bottom border (var(--color-border)),
     nav links Inter 14px weight 500.
   - PRESERVE: the inline md+ nav and search icon control, the controls cluster
     (InstallPrompt hidden sm:flex, LanguageSwitcher, ModeToggle), the hamburger
     Sheet drawer below md, the Sign in / Sign out control, and ALL RTL/logical
     utilities and aria labels. This is restyle-only; do not change the
     responsive collapse or auth behavior.
3. Footer (components/site-footer.tsx): place <Logo /> and render the links on
   var(--color-surface) with var(--color-text-muted) text.
4. Mobile-first and RTL: base styles target narrow screens with sm:/md:/lg:
   overrides upward; min-w-0 on shrinkable flex children, shrink-0 on fixed
   controls, flex-wrap on button rows, break long strings, logical RTL
   utilities. No horizontal overflow at 390/768/1280 in EN (LTR) and HE (RTL).
   Follow docs/RESPONSIVE.md.
5. Add any new user-facing strings (the hero eyebrow text, the highlighted-word
   split if it needs its own key, logo alt if not already in Brand) to BOTH
   messages/en-US.json and messages/he-IL.json, key-identical.
6. Add/keep TSDoc on changed exports (the page is default-export; document the
   header/footer changes where exports change).
7. Tests:
   - e2e: the home page renders the banner image, exactly one <h1>, and both
     CTAs; the header shows the logo (img with the localized alt) instead of the
     text wordmark; the mobile drawer still opens below md. No overflow at
     390/768/1280 in EN and HE; theme toggle still flips .light/.dark.
   - For any mocked Supabase access in unit tests use the working { ...builder }
     pattern with then:(resolve:(v:unknown)=>unknown), NOT a strict index
     signature.
   - Run typecheck to its exit code; do not trust a tail of the log.
8. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory.

Rules:
- The home hero MUST display header_banner.png (from public/brand/). No other
  image - and specifically no Unsplash photo (Batch 23) - may replace or stand
  in for it, in any theme.
- Pair every primary CTA with a secondary button; never show a lone primary in
  the hero or nav (DESIGN.md).
- Apply the inline-highlight pattern to exactly ONE word in the headline using
  var(--color-accent).
- Restyle only: preserve the header's mobile Sheet drawer, the search control,
  the controls cluster, the auth control, and all RTL behavior.
- Every element uses only DESIGN.md theme palette colors via the semantic
  tokens; no Tailwind named-color literals, no raw hex.
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm
  test, and npm run test:e2e. All gates must exit 0.
- Worktree is a sibling ../academy-21-hero-and-chrome, branch
  feature/21-hero-and-chrome; squash-merge into local main when green.
```
