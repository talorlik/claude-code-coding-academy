# Design System And UX/UI Overhaul Design

## Goal

Adopt the Fingerprint "warm CRT terminal on cream / deep-ocean terminal dark"
design system defined in `docs/design/DESIGN.md` across the entire application,
in both the light and dark themes, while preserving the existing `:root` /
`.light` / `.dark` CSS structure and the no-JS theming contract. Install the
real brand assets (favicon, theme-scoped logos, home hero banner) and the
DESIGN.md typography (Inter + JetBrains Mono). The result is a deliberately
styled, on-brand product surface everywhere - marketing, chrome, course pages,
dashboards, admin, and the AI tutor - with light and dark each looking
intentional, not defaulted.

This work is decomposed into three sequential, independently mergeable build
batches (20, 21, 22) executable via `/run-batch NN`.

## Context And Constraints

- The app currently styles itself with shadcn's default grayscale OKLCH tokens
  (`--background`, `--foreground`, `--primary`, `--border`, etc.) defined in
  `app/globals.css`. A verified `grep` shows **93 files** consume these tokens
  via Tailwind utilities (`bg-background`, `text-primary`, `border-border`,
  `text-muted-foreground`, ...). Restyling must flow through these tokens, not
  per-component edits.
- `docs/design/DESIGN.md` defines a different, richer semantic token system
  (`--color-bg`, `--color-surface`, `--color-accent`, `--color-code-key`, ...)
  with raw palettes scoped to `.light` and `.dark`, and a hard rule: no
  theme-specific color in `:root`. It ships a Quick Start with the exact
  `:root` / `.light` / `.dark` / `@theme inline` blocks to use.
- next-themes is configured (`components/theme-provider.tsx`) with
  `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and
  `value={{ light: "light", dark: "dark" }}`. It writes `class="light"` or
  `class="dark"` on `<html>`. The DESIGN.md `.light`/`.dark` structure matches
  this contract exactly.
- `app/globals.css` today also carries a no-JS theming path: `:root` holds the
  light defaults and an `@media (prefers-color-scheme: dark)` block flips
  `:root` to dark for JS-disabled visitors whose OS prefers dark. This path is
  required by `docs/ACCESSIBILITY.md` (progressive enhancement) and must be
  preserved.
- Fonts: `app/[locale]/layout.tsx` loads `Inter` bound to `--font-sans` and
  `Geist_Mono` bound to `--font-mono`. DESIGN.md requires Inter (with
  OpenType `"calt" 0, "liga" 0`) and **JetBrains Mono**. `--font-heading`
  currently aliases `--font-sans` (Inter); DESIGN.md keeps headings in Inter, so
  that alias stays.
- Brand assets exist only as source files in `docs/design/`: `favicon.ico`
  (the real favicon), `logo_dark.png` (white mark + wordmark for dark),
  `logo_light.png` (black/orange mark + wordmark for light), and
  `header_banner.png` (a deep-ocean IDE/dashboard mockup matching the `.dark`
  palette). `app/favicon.ico` currently holds a placeholder; PWA/touch icons
  are placeholder "CA" marks (`docs/DECISIONS.md`).
- Verified hardcoded-color hot spots (the only per-file color fixes needed):
  - `app/[locale]/admin/groups/page.tsx` - `bg-green-50`/`text-green-800`
    status banner.
  - `app/[locale]/admin/reminders/page.tsx` - green/red status pills.
  - `app/[locale]/layout.tsx` - viewport `themeColor` literals
    `#ffffff` / `#0a0a0a`.
- Stack constraints (PRD, TECHNICAL_REQUIREMENTS 10.1): Tailwind CSS 4,
  shadcn 4 + Base UI, Lucide, next-themes, Recharts. Support light/dark via
  theme tokens. Avoid one-off CSS. No hard-coded unreadable colors.
- Localization: every new user-facing string goes through next-intl and into
  BOTH `messages/en-US.json` and `messages/he-IL.json`, key-identical
  (`npm run lint:i18n`). Hebrew is RTL via Tailwind logical utilities.
- Responsive: no horizontal overflow at 390 / 768 / 1280 px in EN (LTR) and
  HE (RTL); the header nav collapses into the Sheet drawer below `md`
  (`docs/RESPONSIVE.md`, enforced by `npm run test:e2e`).
- Accessibility: one `<h1>` per page, semantic landmarks, icon-only controls
  carry `sr-only` text, focus visible, `prefers-reduced-motion` respected,
  `jsx-a11y` green (`docs/ACCESSIBILITY.md`).

## Decisions

1. **Bridge layer, not full replacement.** DESIGN.md's `--color-*` tokens are
   the source of truth, defined in `.light` and `.dark`. A bridge block remaps
   the ~30 shadcn structural tokens onto the DESIGN.md semantics. Because 93
   files already consume the shadcn tokens, this restyles the whole app with
   zero per-component edits and is reversible by reverting one CSS file. Full
   token replacement (rewriting every component to consume `--color-*`
   directly) was rejected as high-risk for no benefit.

2. **Preserve `:root` / `.light` / `.dark` structure.** Per the user's explicit
   instruction and DESIGN.md's rules: `:root` carries only theme-agnostic
   structure (typography, spacing, radius, layout, font vars, `--radius`);
   all color lives in `.light` and `.dark`. The no-JS `@media
   (prefers-color-scheme: dark)` block on `:root` is preserved and updated to
   the dark palette so JS-disabled dark-OS visitors still get dark.

3. **The shadcn bridge map** (defined once per theme, inheriting the
   `--color-*` values of the active `.light`/`.dark` block):

   | shadcn token | maps to DESIGN.md token |
   | --- | --- |
   | `--background` | `--color-bg` |
   | `--foreground` | `--color-text` |
   | `--card`, `--popover` | `--color-surface` |
   | `--card-foreground`, `--popover-foreground` | `--color-text-strong` |
   | `--primary` | `--color-primary-bg` |
   | `--primary-foreground` | `--color-primary-text` |
   | `--secondary` | `--color-secondary-bg` |
   | `--secondary-foreground` | `--color-secondary-text` |
   | `--muted` | `--color-surface-muted` |
   | `--muted-foreground` | `--color-text-muted` |
   | `--accent` | `--color-surface-elevated` (shadcn "accent" = hover surface) |
   | `--accent-foreground` | `--color-text-strong` |
   | `--border`, `--input` | `--color-border` |
   | `--ring` | `--color-accent` |
   | `--destructive` | `--color-danger-text` |
   | `--sidebar` | `--color-surface` |
   | `--sidebar-foreground` | `--color-text` |
   | `--sidebar-primary` | `--color-accent` |
   | `--sidebar-accent` | `--color-surface-elevated` |
   | `--sidebar-border` | `--color-border` |
   | `--sidebar-ring` | `--color-accent` |

   `--chart-1..5` map to a legible spread of DESIGN.md accent/syntax tokens per
   theme (accent, code-string, code-keyword, code-key, text-muted) so Recharts
   reads in both themes.

4. **shadcn `--accent` is NOT the brand accent.** shadcn's `--accent` is the
   neutral hover/active surface; DESIGN.md's `--color-accent` is the brand
   highlight (orange/portal-blue). The bridge maps shadcn `--accent` to
   `--color-surface-elevated`. Brand-accent utilities for new marketing
   components come from the extended `@theme inline` (`--color-brand-accent`),
   not from shadcn `--accent`.

5. **Fonts.** Keep Inter on `--font-sans`, add `"calt" 0, "liga" 0`. Replace
   `Geist_Mono` with `JetBrains_Mono` on `--font-mono`. Keep `--font-heading`
   aliased to Inter. The existing `font-mono` utility usages (header wordmark,
   chart tooltips, reminders table, eyebrow labels) become JetBrains Mono
   automatically.

6. **Brand assets.**
   - `favicon.ico`: copy `docs/design/favicon.ico` to `app/favicon.ico`
     (Next serves it automatically). Wire it explicitly in `metadata.icons` for
     older browsers, and use it as the source for the PWA/touch icons so the
     install icon stops being the placeholder.
   - Logos: copy both PNGs to `public/brand/`. A new `<Logo />` component
     renders both `<Image>`s and shows the correct one per theme via CSS
     (`hidden` toggled by the `.light`/`.dark` ancestor class), so it works with
     no JS and no theme-flash. Replaces the text wordmark in the header and the
     footer. Served via `next/image`.
   - Banner: copy `header_banner.png` to `public/brand/`, used as the home hero
     artifact via `next/image`.

7. **Hero layout.** Centered editorial text stack (display type, one
   inline-highlighted word in `--color-accent`, JetBrains Mono eyebrow above)
   followed by the `header_banner.png` rendered as a wide framed artifact
   (`--radius-large-blocks`). Dark mode: banner sits flush on the cosmic-void
   canvas. Light mode: banner reads as a framed dark code panel on cream -
   intentional per DESIGN.md's "dark panels breaking up light prose" cadence.
   Dual CTA (primary filled + secondary ghost); never a lone primary. Benefits
   become DESIGN.md Feature Cards.

8. **Tutor chat = Terminal Code Panel.** The AI tutor is developer Q&A, the
   natural home for DESIGN.md's signature Terminal Code Panel
   (`--color-code-bg`, JetBrains Mono, syntax colors). Applied in the sweep.

9. **Follow DESIGN.md literally; flag exceptions.** Implement the spec verbatim
   (palette, CTA colors including dark Bioluminescent-Green primary and
   Terminal-Amber secondary). Where a literal value fails WCAG AA contrast or
   clearly hurts usability, implement the spec but record the deviation/risk in
   `docs/planning/TECH_DEBT.md` and `docs/DECISIONS.md` for the user's call. Do
   not silently alter the palette.

10. **Asset weight.** Source PNGs are large (logos ~0.8-0.9 MB, banner 1.7 MB).
    Serve via `next/image` for automatic resize/AVIF/WebP. Record optional SVG
    conversion of the logo mark as a TECH_DEBT follow-up; do not block on it.

11. **Every element uses only DESIGN.md theme palette colors.** No element -
    including status pills, banners, badges, and one-off states - may use a
    Tailwind named-color literal (`green-*`, `red-*`, `blue-*`, ...) or a raw
    hex outside the DESIGN.md `.light`/`.dark` palettes. Use the semantic
    `--color-*` tokens; where DESIGN.md lacks a semantic name for a state that
    a palette color clearly covers (e.g. "success/sent" -> the palette green),
    expose that existing palette value through `@theme inline` and consume it -
    never introduce a new hue. This supersedes any prior wording that implied a
    newly-invented success token.

## Batch Decomposition

### Batch 20 - Design tokens, fonts, and brand assets

Branch prefix `feature/`. Slug `design-system`.

- Rewrite `app/globals.css` to the DESIGN.md structure:
  - `:root`: theme-agnostic structure only (typography families + scale,
    weights, spacing, layout, named radii, `--radius`). No color.
  - `@media (prefers-color-scheme: dark) :root`: no-JS dark palette (DESIGN.md
    `.dark` values) so JS-disabled dark-OS visitors get dark.
  - `.light`: full light raw palette + semantic `--color-*` tokens + the shadcn
    bridge (Decision 3) + `color-scheme: light`.
  - `.dark`: full dark raw palette + semantic `--color-*` tokens + the shadcn
    bridge + `color-scheme: dark`.
  - Expose the DESIGN.md palette greens that already exist
    (`--color-success-green` `#62b06d` / `--color-forest` `#165424` in light,
    `--color-specimen-green` `#00bc7d` in dark) as a `@theme inline` utility so
    Batch 22's "success/sent" status pills can reference a DESIGN.md value
    rather than a Tailwind `green-*` literal. This is a passthrough of an
    existing palette color, not a new hue.
  - Extend `@theme inline` with DESIGN.md additions (`--color-brand-accent`,
    `--color-brand-accent-strong`, `--color-code-*`, `--color-syntax-*`, the
    success-green passthrough above, typography scale tokens
    `--text-eyebrow|heading-sm|heading|display` and their leading/tracking)
    WITHOUT removing the existing shadcn `@theme inline` mappings the 93 files
    depend on. Keep `--radius-*` working.
  - Preserve the existing `@layer base`, `sr-only-focusable` utility, and
    `prefers-reduced-motion` block.
- `app/[locale]/layout.tsx`: import `JetBrains_Mono` instead of `Geist_Mono`
  (bind to `--font-mono`); add Inter `"calt" 0, "liga" 0` via CSS
  (`font-feature-settings`) in `@layer base`; fix viewport `themeColor`
  literals to the real DESIGN.md bg values (`#fafaf8` light, `#06051d` dark).
- Brand assets: copy `docs/design/favicon.ico` to `app/favicon.ico`; copy
  `logo_dark.png`, `logo_light.png`, `header_banner.png` to `public/brand/`;
  add `<Logo />` component (`components/logo.tsx`) with the no-JS theme swap;
  wire `metadata.icons` to the favicon; regenerate or re-point the PWA/touch
  icons to the real mark (extend `scripts/generate-pwa-icons.mjs` if it sources
  the placeholder).
- Translations: add a `Brand` namespace with the logo `alt` text, key-identical
  in both catalogs.
- TSDoc on the new `<Logo />` export.
- Tests: a unit test asserting `<Logo />` renders both theme variants with the
  correct alt text and a single `<h1>`-safe (non-heading) structure; e2e theme
  + RTL + no-overflow regression must stay green; assert the favicon and
  manifest icons resolve.
- Gates: lint, lint:i18n, typecheck, build, test, test:e2e. Highest risk batch
  (CSS contract) - the e2e theme/RTL/no-overflow suite is the proof.

### Batch 21 - Home hero and global chrome

Branch prefix `feature/`. Slug `hero-and-chrome`.

- Home hero (`app/[locale]/page.tsx`): display type, JetBrains Mono eyebrow,
  one inline-highlighted word in `--color-accent`, the `header_banner.png`
  artifact (`next/image`, `--radius-large-blocks`), dual CTA with DESIGN.md
  button geometry (4px radius, 12x24 padding). Benefits section -> Feature
  Cards (surface bg, hairline border, 12px radius, accent icon top-left).
- Header (`components/site-header.tsx`): replace the text wordmark with
  `<Logo />`; apply DESIGN.md nav geometry (~64px height, `--color-nav-bg`
  backdrop blur already present, hairline bottom border, links Inter 14px/500).
  Preserve the mobile Sheet drawer, the search icon control, the controls
  cluster, and all RTL behavior.
- Footer (`components/site-footer.tsx`): logo + links on `--color-surface`,
  muted text.
- Translations: eyebrow text and any new labels, key-identical.
- TSDoc on changed exports.
- Tests: e2e for hero render (banner present, dual CTA, single `<h1>`), header
  logo render, theme + RTL + no-overflow at 390/768/1280 EN+HE.
- Gates: lint, lint:i18n, typecheck, build, test, test:e2e.

### Batch 22 - Theme surface sweep and polish

Branch prefix `feature/`. Slug `surface-sweep`.

- Fix the hardcoded-color hot spots: `admin/groups` and `admin/reminders`
  status pills/banners -> DESIGN.md palette colors only (no Tailwind `green-*`
  or `red-*` literals). "Success/sent" states use the DESIGN.md palette green
  exposed in Batch 20 (`--color-success-green` light / `--color-specimen-green`
  dark); "failed/error" states use the existing semantic `--color-danger-bg` /
  `--color-danger-text`. (The `layout.tsx` `themeColor` fix lands in Batch 20;
  if any literal remains, fix here.)
- Verify and polish in BOTH themes for DESIGN.md conformance + WCAG AA:
  course/catalog cards, dashboards (stats blocks with accent numbers), admin
  tables, auth forms, certificates.
- Tutor chat (`components/tutor/tutor-chat.tsx`): apply the Terminal Code Panel
  treatment (`--color-code-bg`, JetBrains Mono, syntax colors) where it renders
  the assistant's technical output.
- WCAG AA contrast pass on every interactive pairing (notably dark secondary
  Terminal-Amber and dark danger Crimson). Log any miss to TECH_DEBT +
  DECISIONS; do not alter the palette silently.
- Translations: any new labels, key-identical.
- TSDoc on changed exports.
- Tests: e2e visual-contract regression (theme + RTL + no-overflow) across the
  swept pages; unit tests for any logic touched.
- Gates: lint, lint:i18n, typecheck, build, test, test:e2e.

## File Structure (created / modified)

Batch 20:

- Modified: `app/globals.css` (full rewrite of token blocks + `@theme inline`).
- Modified: `app/[locale]/layout.tsx` (fonts, viewport `themeColor`).
- Modified: `app/favicon.ico` (replace placeholder with real favicon).
- Created: `public/brand/logo_dark.png`, `public/brand/logo_light.png`,
  `public/brand/header_banner.png`.
- Created: `components/logo.tsx`.
- Modified: `messages/en-US.json`, `messages/he-IL.json` (`Brand` namespace).
- Modified: `scripts/generate-pwa-icons.mjs` and/or `public/icons/*` (real mark)
  - only if the placeholder is sourced there.
- Created: a `<Logo />` unit test under the existing test location.

Batch 21:

- Modified: `app/[locale]/page.tsx` (hero + benefits).
- Modified: `components/site-header.tsx` (logo + nav geometry).
- Modified: `components/site-footer.tsx` (logo).
- Modified: `messages/en-US.json`, `messages/he-IL.json`.
- Modified/created: `e2e/*` (hero + header specs).

Batch 22:

- Modified: `app/[locale]/admin/groups/page.tsx`,
  `app/[locale]/admin/reminders/page.tsx` (status colors).
- Modified: `components/tutor/tutor-chat.tsx` (terminal panel).
- Modified (as needed for polish/contrast): course/catalog cards, dashboard
  components, admin tables, auth form components, certificate page.
- Modified: `messages/en-US.json`, `messages/he-IL.json` (if new labels).
- Modified/created: `e2e/*`.

## Cross-Cutting Per-Batch Footer

Every batch in this group:

- Adds/updates EN + HE translations key-identical (`npm run lint:i18n`).
- Adds TSDoc to new/changed exports.
- Adds/updates tests for changed behavior; mocks all AI calls.
- Keeps the responsive contract (no overflow 390/768/1280 EN+HE; header
  collapses below `md`) and the accessibility contract (one `<h1>`, landmarks,
  `sr-only` for icon-only controls, focus visible, reduced-motion).
- Runs all five gates to exit 0: `npm run lint`, `npm run lint:i18n`,
  `npm run typecheck`, `npm test`, `npm run test:e2e` (plus `npm run build`).
- Updates `docs/planning/IMPLEMENTATION_LOG.md` and the `academy-build-state`
  memory; captures non-obvious decisions to `docs/DECISIONS.md`.
- Logs any DESIGN.md literal that fails WCAG AA to `docs/planning/TECH_DEBT.md`.

## Coverage Check

- DESIGN.md token system adopted in `.light` + `.dark`, structure preserved:
  Batch 20.
- `:root` / `.light` / `.dark` structure maintained: Batch 20 (Decision 2).
- Header banner used for home hero: Batch 21.
- Theme-scoped logos used: Batch 20 (component) + Batch 21 (placement).
- Real favicon installed: Batch 20.
- Inter + JetBrains Mono: Batch 20.
- Whole-app themed surfaces, light + dark: Batch 20 (bridge) + Batch 22
  (polish/contrast).
- Executable via `/run-batch`: prompts `20`/`21`/`22`, TASK_BREAKDOWN, RUNBOOK,
  and README rows added (see the implementation plan).

## Out Of Scope / Deferred

- SVG conversion of the logo mark (TECH_DEBT follow-up; PNGs are used now).
- Any new pages or features; this is purely visual/structural restyling of
  existing surfaces.
- Changing the next-themes configuration, the proxy/locale routing, RLS, or any
  data/domain logic.
- Redesigning page information architecture beyond the hero and chrome; the
  sweep is conformance + contrast polish, not layout rewrites.
- A bespoke chart redesign beyond mapping `--chart-*` to legible theme tokens.
