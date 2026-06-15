# Prompt: Design Tokens, Fonts, And Brand Assets

```text
Adopt the docs/design/DESIGN.md design system as the app's token foundation in
both themes: rewrite app/globals.css into the :root / .light / .dark structure
with a shadcn bridge, switch the mono font to JetBrains Mono, and install the
real favicon, theme-scoped logos, and hero banner. This is the highest-risk
batch (it changes the CSS contract every component reads), so the e2e
theme/RTL/no-overflow suite is the proof.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md (Batch 20).
- Style reference: docs/design/DESIGN.md (the Quick Start CSS is the canonical
  source for the .light/.dark blocks and @theme inline).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- Today the app styles itself with shadcn's grayscale OKLCH tokens
  (--background, --foreground, --primary, --border, ...) defined in
  app/globals.css. A grep shows 93 files consume these via Tailwind utilities
  (bg-background, text-primary, border-border, text-muted-foreground, ...).
- next-themes is configured in components/theme-provider.tsx with
  attribute="class", defaultTheme="system", enableSystem, and
  value={{ light: "light", dark: "dark" }} - it writes class="light"/"dark" on
  <html>. The .light/.dark structure matches this exactly.
- app/globals.css also carries the no-JS path: :root holds light defaults and an
  @media (prefers-color-scheme: dark) block flips :root to dark for JS-disabled
  dark-OS visitors. docs/ACCESSIBILITY.md requires this path stay working.
- Fonts: app/[locale]/layout.tsx loads Inter -> --font-sans and Geist_Mono ->
  --font-mono. --font-heading currently aliases --font-sans (Inter).
- Brand source files live in docs/design/: favicon.ico, logo_dark.png,
  logo_light.png, header_banner.png. app/favicon.ico is a placeholder; PWA/touch
  icons are placeholder "CA" marks (scripts/generate-pwa-icons.mjs).
- The viewport themeColor in app/[locale]/layout.tsx is hardcoded #ffffff /
  #0a0a0a.

Requirements:
1. Rewrite app/globals.css to the DESIGN.md structure, preserving the existing
   :root / .light / .dark triplet and the no-JS path:
   - :root holds ONLY theme-agnostic structure: typography families
     (--font-inter, --font-jetbrains-mono and the --font-sans/--font-mono/
     --font-heading aliases the app uses), the type scale + leading + tracking
     (--text-eyebrow|heading-sm|heading|display etc.), weights, spacing scale,
     layout (--page-max-width, --section-gap, --card-padding, --element-gap),
     named radii, and --radius. NO color in :root (DESIGN.md hard rule).
   - @media (prefers-color-scheme: dark) :root: set color-scheme: dark and the
     DESIGN.md dark semantic --color-* values so JS-disabled dark-OS visitors
     get dark.
   - .light: color-scheme: light; the full DESIGN.md light raw palette; the
     semantic --color-* tokens mapped to it (verbatim from DESIGN.md Quick
     Start); then the shadcn bridge (item 2).
   - .dark: color-scheme: dark; the full DESIGN.md dark raw palette; the
     semantic --color-* tokens; then the shadcn bridge.
   - Keep the existing @layer base block, the sr-only-focusable @utility, and
     the prefers-reduced-motion block at the end.
2. Add the shadcn bridge inside BOTH .light and .dark (the values resolve to
   that theme's --color-* tokens). Map every shadcn token the 93 files use:
   --background->--color-bg; --foreground->--color-text;
   --card,--popover->--color-surface;
   --card-foreground,--popover-foreground->--color-text-strong;
   --primary->--color-primary-bg; --primary-foreground->--color-primary-text;
   --secondary->--color-secondary-bg;
   --secondary-foreground->--color-secondary-text;
   --muted->--color-surface-muted; --muted-foreground->--color-text-muted;
   --accent->--color-surface-elevated (shadcn "accent" is the hover surface,
   NOT the brand accent); --accent-foreground->--color-text-strong;
   --border,--input->--color-border; --ring->--color-accent;
   --destructive->--color-danger-text; --sidebar->--color-surface;
   --sidebar-foreground->--color-text; --sidebar-primary->--color-accent;
   --sidebar-primary-foreground->--color-primary-text;
   --sidebar-accent->--color-surface-elevated;
   --sidebar-accent-foreground->--color-text-strong;
   --sidebar-border->--color-border; --sidebar-ring->--color-accent;
   --chart-1..5 -> a legible spread per theme
   (--color-accent, --color-code-string, --color-code-keyword,
   --color-code-key, --color-text-muted).
3. Expose, via @theme inline, the DESIGN.md palette green that already exists
   (--color-success-green #62b06d / --color-forest #165424 in light,
   --color-specimen-green #00bc7d in dark) as a utility (e.g. --color-success /
   --color-success-foreground) so a later batch can color "success/sent" status
   pills with a DESIGN.md value instead of a Tailwind green-* literal. This is a
   passthrough of an existing palette color, not a new hue.
4. Extend @theme inline with the DESIGN.md additions (--color-brand-accent,
   --color-brand-accent-strong, --color-code-* / --color-syntax-*, the success
   passthrough above, and the typography scale tokens) WITHOUT removing any of
   the existing shadcn @theme inline mappings the 93 files depend on; keep all
   --radius-* working.
5. app/[locale]/layout.tsx:
   - Replace Geist_Mono with JetBrains_Mono from next/font/google, bound to
     --font-mono (keep the Inter import bound to --font-sans).
   - Give Inter the DESIGN.md engineered feel by setting
     font-feature-settings: "calt" 0, "liga" 0 on the base typography (in
     @layer base in globals.css is acceptable; the goal is calt/liga disabled).
   - Change the viewport themeColor literals to the real DESIGN.md bg values:
     #fafaf8 (light) and #06051d (dark).
6. Brand assets:
   - Copy docs/design/favicon.ico to app/favicon.ico (Next serves it). Also wire
     metadata.icons in app/[locale]/layout.tsx so older browsers pick it up.
   - Copy logo_dark.png, logo_light.png, header_banner.png to public/brand/.
   - Re-point the PWA/touch icons to the real brand mark: if
     scripts/generate-pwa-icons.mjs sources the placeholder, update it to source
     the real favicon/logo and regenerate public/icons/*; otherwise replace the
     placeholder PNGs directly.
7. Add components/logo.tsx exporting <Logo />: renders BOTH logo PNGs via
   next/image and shows the correct one per theme purely with CSS so it works
   with no JS and no flash (e.g. one hidden in .light, the other hidden in
   .dark using the dark: variant / the .light ancestor). Localized alt text via
   the new Brand namespace; intrinsic width/height from the PNGs. Do not place
   it yet (placement is Batch 21); just create the component + a unit test.
8. Mobile-first and RTL still hold: base styles target narrow screens with
   sm:/md:/lg: overrides upward; let flex children shrink (min-w-0), keep fixed
   controls shrink-0, wrap rows (flex-wrap), break long strings, use logical RTL
   utilities. No horizontal overflow at 390/768/1280 in EN (LTR) and HE (RTL).
   Follow docs/RESPONSIVE.md.
9. Add a Brand namespace with the logo alt text to BOTH messages/en-US.json and
   messages/he-IL.json, key-identical.
10. Add TSDoc to the <Logo /> export.
11. Tests:
    - A <Logo /> unit/render test asserting both theme variants render with the
      correct localized alt text and that the component contributes no heading
      (it is not an <h1>). For any mocked Supabase access use the working
      { ...builder } pattern with then:(resolve:(v:unknown)=>unknown), NOT a
      strict index signature.
    - Assert the favicon and the manifest icons resolve (app/favicon.ico exists;
      the manifest references real icon files).
    - The e2e theme + RTL + no-overflow regression (e2e/responsive.spec.ts and
      the theme spec) must stay green - the token rewrite must not break it.
    - Run typecheck to its exit code; do not trust a tail of the log.
12. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory
    (note: the shadcn bridge is the styling contract from now on; all later UI
    consumes --color-* via the shadcn tokens).

Rules:
- Preserve the :root / .light / .dark structure and the no-JS @media path. NEVER
  put theme-specific color in :root (DESIGN.md hard rule).
- Do NOT remove any existing shadcn @theme inline mapping or shadcn token name;
  93 files depend on them. You are remapping their VALUES, not their names.
- Every element uses only DESIGN.md .light/.dark palette colors. No Tailwind
  named-color literals (green-*, red-*, blue-*, ...) and no raw hex outside the
  DESIGN.md palettes. Inside .dark use only the dark palette; inside .light only
  the light palette.
- Dark mode imports DESIGN.md color only, not pill geometry; no rounded corners
  above 16px.
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm
  test, and npm run test:e2e. All gates must exit 0.
- Worktree is a sibling ../academy-20-design-system, branch
  feature/20-design-system; squash-merge into local main when green. After the
  squash-merge, run git diff --name-only HEAD~1 HEAD -- package.json
  package-lock.json; if either changed (a font/image dep), run npm install in
  the primary checkout before any gate, and rm -rf .next if route types are
  stale.
```
