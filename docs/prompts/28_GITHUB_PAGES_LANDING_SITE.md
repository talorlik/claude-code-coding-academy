# Prompt: GitHub Pages Landing Site

```text
Build a standalone static GitHub Pages landing site that advertises Eyal's
Coding Academy and links to the live app. It is NOT part of the Next.js app: it
is plain HTML/CSS/JS served by GitHub Pages from the repo's /docs folder. English
only. Light and dark themes. Clear separation of HTML, CSS, and JS (GitHub Pages
needs no no-JS fallback; JS is allowed and expected for the theme toggle).

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-16-ADMIN_PROFILE_FIXES_AND_USER_MANAGEMENT_DESIGN.md (Batch 28 section).
- Implementation plan: docs/superpowers/plans/2026-06-16-admin-profile-fixes-and-user-management.md (Batch 28).
- Style reference (the authority for color, type, spacing, components): docs/design/DESIGN.md.
- Brand assets (already in the repo): docs/design/header_banner.png,
  docs/design/logo_dark.png, docs/design/logo_light.png, docs/design/favicon.ico.

Context:
- GitHub Pages source for this repo is the /docs folder on the main branch, so
  the site files live at the /docs ROOT: docs/index.html is the site root
  document. The existing planning markdown (RUNBOOK.md, prompts/, superpowers/,
  planning/, design/) stays where it is; do NOT move or delete it.
- The site is served under a PROJECT subpath:
  https://talorlik.github.io/claude-code-coding-academy/ . Therefore EVERY asset
  href/src and internal link MUST be RELATIVE (e.g. "site-assets/css/styles.css",
  "site-assets/img/logo_dark.png"), never root-absolute ("/css/..."), or it will
  404 under the subpath.
- The live app (the primary CTA target) is
  https://claude-code-coding-academy.vercel.app . Put this URL in a single
  clearly-commented constant in the JS (or a single place in the HTML) so it is
  trivial to change. No analytics, no tracking scripts.
- DESIGN.md is "Fingerprint - Style Reference": warm CRT terminal on cream paper
  (light) / deep-ocean terminal (dark). It ships a complete CSS-custom-property
  token system in its Quick Start section with :root (shared structure), .light,
  and .dark blocks. Port those tokens verbatim; do NOT invent new colors.

Requirements:
1. File layout (all under docs/, relative paths only):
   - docs/index.html - the only HTML file; semantic landmarks (<header>, <nav>,
     <main>, <footer>), exactly one <h1>, descriptive <title> + meta description,
     favicon via <link rel="icon" href="site-assets/img/favicon.ico">,
     and an Open Graph/Twitter card using header_banner.png.
   - docs/site-assets/css/styles.css - ALL styles. No inline <style> beyond a
     tiny inline theme-init snippet if needed to avoid a flash (see #5).
   - docs/site-assets/js/main.js - ALL behavior (theme toggle, smooth in-page
     nav, any accordion). No inline event handlers in the HTML.
   - docs/site-assets/img/ - copies of header_banner.png, logo_dark.png,
     logo_light.png, favicon.ico (copy from docs/design/ so the site is
     self-contained and not coupled to the planning-docs path).
   - docs/.nojekyll - empty file so GitHub Pages serves the tree as-is and does
     not run Jekyll over the markdown/asset folders.
2. Design system: port the DESIGN.md token system into styles.css - :root holds
   the shared NON-COLOR structure (typography, spacing, radius, layout, type
   scale); .light and .dark hold ONLY color/background/border/shadow. Load Inter
   and JetBrains Mono from Google Fonts. Use the semantic tokens
   (var(--color-*)) throughout; no raw hex in component rules; no Tailwind named
   colors. Calt/liga 0 on Inter per DESIGN.md.
3. Sections (full marketing landing, English only), following DESIGN.md layout
   and components:
   - Fixed top nav (~64px): logo left (theme-appropriate logo_light/logo_dark),
     in-page anchor links center, a theme toggle + a primary "Open the App" CTA
     right. Pair the primary CTA with a secondary ghost link per DESIGN.md
     (never a lone primary).
   - Hero: centered editorial text stack over var(--color-bg) with ONE
     highlighted word in var(--color-accent); subtitle; primary + secondary CTAs;
     header_banner.png as a framed hero image (theme-token border/radius).
   - Signature terminal panel (DESIGN.md "Terminal Code Panel"): a wide
     var(--color-code-bg) panel with JetBrains Mono and the syntax colors,
     showing a short illustrative JSON/console snippet about the academy
     (e.g. a course object). This is the page's signature component.
   - Feature cards grid: 3-4 DESIGN.md Feature Cards (structured course paths,
     AI tutor support, progress tracking, bilingual EN/HE app) - accent icon,
     Inter 600 16px heading, muted 14px body.
   - Stats block (DESIGN.md Stats Block): 3-column accent numbers + captions
     (illustrative, clearly generic - do not fabricate precise metrics; use
     descriptive captions).
   - Final CTA band + footer (copyright, link to the app, link to the GitHub
     repo). No logo duplication beyond what reads well.
4. Theme behavior (main.js): on first load, set the theme from
   prefers-color-scheme; a header toggle switches .light/.dark on <html>;
   persist the choice in localStorage and re-apply on return visits. Swap the
   logo image (logo_light vs logo_dark) and any theme-specific imagery to match.
   Avoid a flash of the wrong theme (apply the stored/system theme class before
   first paint - a minimal inline snippet in <head> is acceptable for this one
   purpose).
5. Accessibility + responsive: keyboard-operable nav and toggle (the toggle is a
   real <button> with an aria-label and aria-pressed); visible focus;
   prefers-reduced-motion respected for any smooth-scroll/transition; alt text on
   images; color pairings meet WCAG AA in BOTH themes. Responsive with no
   horizontal overflow at 390 / 768 / 1280 px; the nav collapses to a usable
   mobile layout below the medium breakpoint.
6. The primary CTA and repo link open the correct URLs; the app URL is a single
   easy-to-edit constant; no analytics or third-party trackers of any kind.
7. Quality: valid HTML5; styles.css and main.js are separate files referenced by
   relative URL; no console errors; images sized so the page is not enormous
   (the source PNGs are large - it is fine to reference them as-is, but set
   width/height/their CSS so layout is stable and they do not overflow).

Verification (this batch has NO Next.js gates - it is static files outside the
app build; do NOT run the app gate set against it):
- Open docs/index.html and confirm: light and dark both render correctly, the
  toggle persists across reload, all assets load via relative paths (no 404),
  exactly one <h1>, no console errors, and no horizontal overflow at
  390/768/1280. Use the preview tooling to verify and capture proof.
- Confirm docs/.nojekyll exists and the site is self-contained under
  docs/site-assets/ (no references back into docs/design/ or the app).
- Do NOT run npm lint/typecheck/build/test/e2e for this batch; they cover the
  Next.js app, not this static site. State this explicitly in the batch capture.

Rules:
- Static site only: no framework, no bundler, no build step, no npm deps. Plain
  index.html + one CSS file + one JS file + an img folder + .nojekyll, all under
  docs/.
- All paths RELATIVE (project Pages subpath); never root-absolute.
- Port DESIGN.md tokens verbatim; shared structure in :root, color only in
  .light/.dark; semantic tokens everywhere; no invented colors.
- English only; do NOT touch the app's i18n catalogs or any app code. This batch
  changes nothing under app/, components/, lib/, or messages/.
- Never create middleware.ts (n/a here, but the standing rule holds).
- Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory;
  append a dated entry to docs/DECISIONS.md, including the one-time GitHub setting
  to enable: Settings -> Pages -> Source = Deploy from a branch, Branch = main,
  Folder = /docs.
- Worktree is a sibling ../academy-28-github-pages-site, branch
  feature/28-github-pages-site; squash-merge into local main when done. Because
  this batch ships no app code, the merge does not require the app gate set;
  the verification above is the acceptance proof.
```
