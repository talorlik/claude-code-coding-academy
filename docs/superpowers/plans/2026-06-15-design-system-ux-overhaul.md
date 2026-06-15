# Design System And UX/UI Overhaul Implementation Plan

> **For agentic workers:** This plan is executed through the project's
> `/run-batch NN` system, not a generic per-task subagent loop. The
> step-by-step execution brief for each batch is its prompt file
> (`docs/prompts/NN_*.md`); the per-batch acceptance checklist is the matching
> section of `docs/planning/TASK_BREAKDOWN.md`; the git workflow and gates are
> in `docs/planning/RUNBOOK.md`. Run a batch with `/run-batch 20` (then 21, 22,
> 23 in order). This plan is the map; the prompt files are the territory.

**Goal:** Adopt the `docs/design/DESIGN.md` design system across the whole app
in both themes, install the real brand assets (favicon, theme logos, hero
banner) and DESIGN.md fonts, and place curated Unsplash coding photography on
scoped surfaces - all delivered as four runnable batches (20-23).

**Architecture:** A CSS-variable bridge maps the ~30 shadcn structural tokens
the 93 token-consuming files already use onto the DESIGN.md semantic
`--color-*` tokens, scoped inside the preserved `:root` / `.light` / `.dark`
structure. Because every component reads the shadcn tokens, the bridge restyles
the entire app with zero per-component edits; bespoke work is then layered on
the hero, chrome, and specific surfaces. Photography is self-hosted content
media with theme-token framing and attribution.

**Tech Stack:** Next.js App Router, Tailwind CSS 4, shadcn 4 + Base UI,
next-themes (`attribute="class"`), next-intl (EN/HE), `next/font` (Inter +
JetBrains Mono), `next/image`, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md`
(read it first; the Decisions and Imagery sections are binding).

---

## File Structure

Tokens and fonts (Batch 20):

- `app/globals.css` - the single source of the token system. Holds `:root`
  (structure only), the no-JS `@media (prefers-color-scheme: dark)` block,
  `.light`, `.dark` (full DESIGN.md palettes + semantic tokens + the shadcn
  bridge), and the extended `@theme inline`. One file, one responsibility:
  theming.
- `app/[locale]/layout.tsx` - font wiring (JetBrains Mono) and the viewport
  `themeColor` values.
- `app/favicon.ico` - the real favicon (binary replacement).
- `public/brand/{logo_dark,logo_light,header_banner}.png` - served brand
  assets.
- `components/logo.tsx` - `<Logo />`, the no-JS theme-swapped logo.

Hero and chrome (Batch 21):

- `app/[locale]/page.tsx` - home hero + benefits (Feature Cards).
- `components/site-header.tsx`, `components/site-footer.tsx` - logo placement +
  DESIGN.md geometry.

Surface sweep (Batch 22):

- `app/[locale]/admin/groups/page.tsx`,
  `app/[locale]/admin/reminders/page.tsx` - replace hardcoded `green-*`/`red-*`
  with DESIGN.md palette colors.
- `components/tutor/tutor-chat.tsx` - Terminal Code Panel treatment.
- Course/catalog cards, dashboard components, admin tables, auth forms,
  certificate page - contrast/conformance polish (token-driven, minimal edits).

Photography (Batch 23):

- `scripts/fetch-unsplash-images.mjs` - idempotent downloader (committed).
- `public/images/unsplash/*.jpg` - seven committed photos.
- `lib/images/unsplash.ts` - typed attribution map (single source of truth).
- `components/unsplash-image.tsx` - `<UnsplashImage />` (frame + scrim +
  credit line).
- `components/courses/course-card.tsx` - cover fallback (existing else branch).
- `app/[locale]/courses/[courseSlug]/page.tsx` - detail header photo.
- `app/[locale]/about/page.tsx`, `app/[locale]/contact/page.tsx` - one photo
  each.
- `app/[locale]/login/page.tsx`, `app/[locale]/register/page.tsx` - optional
  `md+` side panel.

Documents that make the batches runnable (this plan's own deliverables):

- `docs/prompts/20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md`
- `docs/prompts/21_HOME_HERO_AND_GLOBAL_CHROME.md`
- `docs/prompts/22_THEME_SURFACE_SWEEP_AND_POLISH.md`
- `docs/prompts/23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md`
- `docs/planning/TASK_BREAKDOWN.md` (append Batch 20-23 sections + map rows)
- `docs/planning/RUNBOOK.md` (append 4 batch-order rows + bump snapshot + add
  design-spec authority)
- `docs/prompts/README.md` (append 4 recommended-order rows + spec note)
- `docs/DECISIONS.md` (seed the bridge-layer + DESIGN.md adoption decision)

---

## Task A: Author prompt file 20 (design tokens, fonts, brand assets)

**Files:**

- Create: `docs/prompts/20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md`

- [ ] **Step 1: Mirror the batch-19 prompt format exactly**

H1 `# Prompt: Design Tokens, Fonts, And Brand Assets` followed by a single
fenced ` ```text ` block containing, in order: a 1-2 sentence summary;
`Planning anchors:` (design spec line with `(Batch 20)`, the I18N/ACCESSIBILITY/
RESPONSIVE conventions line, the cross-batch-state line); `Context:`;
`Requirements:` (ordered); `Rules:`.

- [ ] **Step 2: Write the Requirements list from spec Batch 20**

Cover, as numbered items with file-level sub-bullets: rewrite `app/globals.css`
(`:root` structure-only; no-JS `@media` dark; `.light`/`.dark` full palettes +
semantic tokens + the shadcn bridge from spec Decision 3; success-green
passthrough; extended `@theme inline`; preserve `@layer base`,
`sr-only-focusable`, reduced-motion); `app/[locale]/layout.tsx` JetBrains Mono +
Inter `calt/liga 0` + `themeColor` `#fafaf8`/`#06051d`; copy favicon to
`app/favicon.ico` + wire `metadata.icons` + re-point PWA/touch icons; copy
logos + banner to `public/brand/`; `<Logo />` no-JS swap via `next/image`;
`Brand` namespace alt text key-identical; TSDoc on `<Logo />`; tests (`<Logo />`
both variants + favicon/manifest resolve + e2e theme/RTL/no-overflow stays
green); IMPLEMENTATION_LOG + memory update.

- [ ] **Step 3: Write the Rules block**

Batch-specific invariants first (preserve `:root`/`.light`/`.dark`; no theme
color in `:root`; do NOT remove existing shadcn `@theme inline` mappings;
DESIGN.md palette colors only, no Tailwind literals - spec Decision 11), then
the templated bullets verbatim from batch 19: no hardcoded strings through
getTranslations in BOTH catalogs; run all five gates + build to exit 0; worktree
`../academy-20-design-system`, branch `feature/20-design-system`, squash-merge
when green; include the dep-reconcile sentence (this batch may touch
`package.json` if a font/image dep is added).

- [ ] **Step 4: Commit**

```bash
git add docs/prompts/20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md
git commit -m "docs(prompts): add batch 20 prompt (design tokens, fonts, brand assets)"
```

---

## Task B: Author prompt file 21 (home hero + global chrome)

**Files:**

- Create: `docs/prompts/21_HOME_HERO_AND_GLOBAL_CHROME.md`

- [ ] **Step 1: Same prompt skeleton as Task A**

`# Prompt: Home Hero And Global Chrome`, ` ```text ` block, the four labels.

- [ ] **Step 2: Write Requirements from spec Batch 21**

Home hero in `app/[locale]/page.tsx`: display type, JetBrains Mono eyebrow, one
inline-highlighted word in `--color-accent`, the `header_banner.png` artifact
via `next/image` at `--radius-large-blocks`, dual CTA with DESIGN.md button
geometry; benefits -> Feature Cards. Header `components/site-header.tsx`:
`<Logo />` replaces the text wordmark, ~64px nav, `--color-nav-bg` blur,
hairline border, links Inter 14px/500, preserve the Sheet drawer + search +
controls cluster + RTL. Footer `components/site-footer.tsx`: logo + muted links
on `--color-surface`. Eyebrow/label i18n key-identical; TSDoc; tests (hero
renders banner + dual CTA + single `<h1>`; header logo; theme/RTL/no-overflow
390/768/1280 EN+HE); IMPLEMENTATION_LOG + memory.

- [ ] **Step 3: Write Rules block**

Batch-specific: the home hero MUST display `header_banner.png` and nothing may
replace it (spec Decision 7); preserve the header's mobile Sheet drawer and RTL;
DESIGN.md palette + tokens only. Then the templated gate/i18n/worktree bullets
(worktree `../academy-21-hero-and-chrome`, branch `feature/21-hero-and-chrome`).

- [ ] **Step 4: Commit**

```bash
git add docs/prompts/21_HOME_HERO_AND_GLOBAL_CHROME.md
git commit -m "docs(prompts): add batch 21 prompt (home hero and global chrome)"
```

---

## Task C: Author prompt file 22 (theme surface sweep + polish)

**Files:**

- Create: `docs/prompts/22_THEME_SURFACE_SWEEP_AND_POLISH.md`

- [ ] **Step 1: Same prompt skeleton**

`# Prompt: Theme Surface Sweep And Polish`.

- [ ] **Step 2: Write Requirements from spec Batch 22**

Fix hot spots: `admin/groups` + `admin/reminders` status pills/banners ->
DESIGN.md palette only (success-green passthrough for sent/success; semantic
`--color-danger-*` for failed; no `green-*`/`red-*` literals). Tutor chat
Terminal Code Panel (`--color-code-bg`, JetBrains Mono, syntax colors). Verify
+ polish course/catalog cards, dashboards (stats blocks, accent numbers), admin
tables, auth forms, certificates in BOTH themes. WCAG AA contrast pass on every
interactive pairing (dark Terminal-Amber secondary, dark Crimson danger); log
misses to TECH_DEBT + DECISIONS, do not alter the palette. i18n; TSDoc; e2e
visual-contract regression; IMPLEMENTATION_LOG + memory.

- [ ] **Step 3: Write Rules block**

Batch-specific: DESIGN.md palette colors only, no Tailwind literals anywhere
(spec Decision 11); do not change data/domain logic, only presentation; log
contrast deviations rather than silently re-coloring. Then templated bullets
(worktree `../academy-22-surface-sweep`, branch `feature/22-surface-sweep`).

- [ ] **Step 4: Commit**

```bash
git add docs/prompts/22_THEME_SURFACE_SWEEP_AND_POLISH.md
git commit -m "docs(prompts): add batch 22 prompt (theme surface sweep and polish)"
```

---

## Task D: Author prompt file 23 (Unsplash coding photography)

**Files:**

- Create: `docs/prompts/23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md`

- [ ] **Step 1: Same prompt skeleton**

`# Prompt: Coding Photography From Unsplash`.

- [ ] **Step 2: Write Requirements from spec Batch 23 (embed the photo table)**

Embed the seven-row curated photo table verbatim from the spec (local name,
Unsplash ID, CDN file, photographer, profile, slot) so the executing agent
needs no external lookup. Then: `scripts/fetch-unsplash-images.mjs` idempotent
downloader to `public/images/unsplash/`; commit the files; `lib/images/
unsplash.ts` typed attribution map; `<UnsplashImage />` (frame + theme scrim +
"Photo by {name} on Unsplash" credit, localized alt, no-JS safe); placements
(course-card cover fallback in the existing `coverImageUrl ? : ` else branch
with deterministic id/slug hash; course-detail header when no `coverImageUrl`;
About + Contact; optional `md+` auth side panel hidden below `md`); `Imagery`
i18n namespace key-identical; TSDoc; tests (deterministic selector; course WITH
`coverImageUrl` shows its own image; every map photo has attribution + a
localized alt key in both catalogs; e2e credit-line + no-overflow 390/768/1280
EN+HE); IMPLEMENTATION_LOG + memory.

- [ ] **Step 3: Write Rules block**

Batch-specific: photos are content media, exempt from the palette rule, but
frame/overlay/caption use theme tokens and overlaid text passes WCAG AA (spec
Decision 12); the home hero is NEVER an Unsplash photo - it stays
`header_banner.png` (spec Decision 7); only free Unsplash photos, self-hosted,
no runtime hotlinking; a real `coverImageUrl` always wins over the fallback.
Then templated bullets (worktree `../academy-23-unsplash-imagery`, branch
`feature/23-unsplash-imagery`; include the dep-reconcile sentence since
`next/image` config may change).

- [ ] **Step 4: Commit**

```bash
git add docs/prompts/23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md
git commit -m "docs(prompts): add batch 23 prompt (coding photography from Unsplash)"
```

---

## Task E: Update `docs/planning/TASK_BREAKDOWN.md`

**Files:**

- Modify: `docs/planning/TASK_BREAKDOWN.md`

- [ ] **Step 1: Append four Prompt File Map bullets**

After the Batch 19 map line, add (matching the existing bullet style):

```text
- Tasks 20.1-20.5 (Batch 20):
  `docs/prompts/20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md`
- Tasks 21.1-21.3 (Batch 21): `docs/prompts/21_HOME_HERO_AND_GLOBAL_CHROME.md`
- Tasks 22.1-22.3 (Batch 22): `docs/prompts/22_THEME_SURFACE_SWEEP_AND_POLISH.md`
- Tasks 23.1-23.3 (Batch 23):
  `docs/prompts/23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md`
```

- [ ] **Step 2: Add a group header + four batch sections at the end of file**

Add `## Design System And UX/UI Overhaul (Batches 20-23)` then `## Batch 20:` /
`## Batch 21:` / `## Batch 22:` / `## Batch 23:` sections, each with
`### Task N.M:` subsections using the recent `Objective:` + `Files:` shape (see
Batch 19 for the exact format) and a trailing `Prompt file:` line. Tasks per
batch: 20 -> {20.1 globals.css token rewrite + bridge; 20.2 fonts + viewport;
20.3 brand assets + `<Logo />` + favicon; 20.4 i18n + TSDoc + tests}; 21 ->
{21.1 hero + benefits; 21.2 header + footer logo/geometry; 21.3 i18n + tests};
22 -> {22.1 hot-spot color fixes; 22.2 tutor terminal panel + surface polish;
22.3 contrast pass + i18n + tests}; 23 -> {23.1 fetch script + attribution map +
`<UnsplashImage />`; 23.2 placements; 23.3 i18n + tests}.

- [ ] **Step 3: Commit**

```bash
git add docs/planning/TASK_BREAKDOWN.md
git commit -m "docs(planning): add batch 20-23 task breakdown for design overhaul"
```

---

## Task F: Update `docs/planning/RUNBOOK.md`

**Files:**

- Modify: `docs/planning/RUNBOOK.md`

- [ ] **Step 1: Add the design-spec authority bullet**

Under `## Authorities`, after the batches-16-19 design-spec bullet, add:

```text
- **Design spec for batches 20-23:**
  `docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md`.
```

- [ ] **Step 2: Bump the snapshot line**

Change "as of **2026-06-14** (00-19)" to "as of **2026-06-15** (00-23)" and
adjust the "expect rows beyond 19" sentence to "beyond 23".

- [ ] **Step 3: Append four Batch Order rows**

After the Batch 19 row:

```text
| 20 | `20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md` | Design tokens + assets | `feature/` | Pending |
| 21 | `21_HOME_HERO_AND_GLOBAL_CHROME.md` | Hero + chrome | `feature/` | Pending |
| 22 | `22_THEME_SURFACE_SWEEP_AND_POLISH.md` | Surface sweep | `feature/` | Pending |
| 23 | `23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md` | Unsplash photos | `feature/` | Pending |
```

- [ ] **Step 4: Add a Notes bullet**

Add: "Batches 20-23 implement the design-system & UX/UI overhaul spec; the home
hero always uses `header_banner.png` (never an Unsplash photo)."

- [ ] **Step 5: Commit**

```bash
git add docs/planning/RUNBOOK.md
git commit -m "docs(planning): add batch 20-23 to runbook batch order"
```

---

## Task G: Update `docs/prompts/README.md`

**Files:**

- Modify: `docs/prompts/README.md`

- [ ] **Step 1: Append four recommended-order rows**

After the `| 20 | 19_COURSE_REVIEWS... |` row (Order continues at 21):

```text
| 21 | `20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md` | Design tokens + assets | Sections 4, 10, 11, 12, 15 |
| 22 | `21_HOME_HERO_AND_GLOBAL_CHROME.md` | Hero + chrome | Sections 4, 10, 11, 12, 15 |
| 23 | `22_THEME_SURFACE_SWEEP_AND_POLISH.md` | Surface sweep | Sections 4, 10, 11, 12, 15 |
| 24 | `23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md` | Unsplash photos | Sections 4, 10, 11, 12, 15 |
```

- [ ] **Step 2: Add the spec-pointer note**

After the existing 16-20 design-spec note, add a line pointing batches 21-24
(prompt files 20-23) at
`docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/prompts/README.md
git commit -m "docs(prompts): add batch 20-23 to prompt index"
```

---

## Task H: Seed `docs/DECISIONS.md`

**Files:**

- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Append a dated decision entry**

Following the file's existing entry format (date, batch, decision, why), record:
the DESIGN.md adoption via a shadcn bridge layer (Decision 1+3); `:root`/
`.light`/`.dark` preserved (Decision 2); the Unsplash photography override of
DESIGN.md's no-photography rule, scoped, with the hero kept on
`header_banner.png` (Decisions 7+12); the per-batch decomposition 20-23. Date
2026-06-15.

- [ ] **Step 2: Commit**

```bash
git add docs/DECISIONS.md
git commit -m "docs(decisions): record design-system overhaul + Unsplash decisions"
```

---

## Self-Review

- **Spec coverage:** every spec Batch (20-23) maps to a prompt-file task (A-D)
  and a TASK_BREAKDOWN section (E); RUNBOOK (F), README (G), DECISIONS (H) make
  them runnable. Decisions 7 (banner) and 12 (photos) are carried into the
  prompt Rules blocks (Tasks B and D). Covered.
- **Placeholder scan:** the per-batch code-level steps live in the prompt files
  (by design - they are the execution briefs the run-batch skill follows); this
  plan's own tasks (authoring docs) are fully specified with exact paths,
  literal table rows, and commit commands. No TBD/TODO.
- **Type/name consistency:** worktree slugs and branch names match across plan,
  prompt Rules, and RUNBOOK rows (`feature/20-design-system`,
  `21-hero-and-chrome`, `22-surface-sweep`, `23-unsplash-imagery`); the
  `coverImageUrl` field name is used consistently; `<Logo />` and
  `<UnsplashImage />` component names are consistent with the File Structure and
  the spec.
