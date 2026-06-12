# Responsive and Mobile-Friendly Standard - Coding Academy

Make the site fully responsive and mobile-friendly, port the source project's
responsive patterns and enforcement, and adopt them as a binding standard for
all future development.

## Goals

- Every page works with no horizontal overflow at the three reference widths:
  390 px (mobile), 768 px (tablet), 1280 px (desktop), in both English (LTR) and
  Hebrew (RTL).
- The header nav collapses into a hamburger `Sheet` drawer below the `md`
  breakpoint; theme/language/auth controls stay visible at all widths.
- An explicit `viewport` export controls scaling and theme color.
- A Playwright e2e gate enforces the no-overflow + RTL + theme-round-trip
  contract, runnable via `npm run test:e2e`.
- The standard is documented (`docs/RESPONSIVE.md`) and made binding
  (`CLAUDE.md`), so future work inherits it.

## Non-Goals

- No vitest/unit-test stack - only the Playwright e2e gate the responsiveness
  ask needs.
- No PWA `InstallPrompt`, no logo-image header (the target uses a text
  wordmark).
- No page redesigns beyond making each layout fit and read well on mobile.

## Reference Widths

`390` (mobile phone), `768` (tablet), `1280` (desktop). The no-overflow proxy is
`document.documentElement.scrollWidth - clientWidth <= 1` (1 px slack for
sub-pixel rounding).

## Current State vs. Target

- Target has the same Next 16 + next-intl + Tailwind v4 + shadcn template and a
  `Sheet` component, but: no test runner at all, no `viewport` export, and a
  header that wraps (`flex-wrap`) rather than collapsing into a drawer.
- The `Nav` namespace already has `openMenu` and `mainNavigation` keys (from the
  accessibility batch), so the drawer needs no new strings.
- Auth has no captcha (earlier port), so signed-in pages are reachable in e2e
  with the seeded `E2E_INSTRUCTOR_*` credentials.

## Changes

### 1. Mobile nav drawer - `components/site-header.tsx`

Restructure the header to the source's pattern:

- Brand wordmark always visible (links home).
- A desktop nav (`hidden ... md:flex`) with the inline links (Dashboard, Chat,
  Sign out when signed in; Sign in when signed out).
- The control cluster (LanguageSwitcher, ModeToggle, and the Sign in/out
  control) stays visible at all widths.
- A `Menu` button (`md:hidden`) that opens a `Sheet` drawer (`side` resolves to
  the inline-end edge) containing the same nav links, each wrapped in
  `SheetClose` so tapping a link closes the drawer. Trigger and links use Base UI
  `render` props (mirroring `language-switcher.tsx` / `mode-toggle.tsx`).
- Labels from the `Nav` namespace (`openMenu`, `mainNavigation`, plus the
  existing link labels). Logical utilities for RTL.

The signed-out case has only a "Sign in" link, so the drawer for guests may hold
just that link (or the drawer is rendered for both states for consistency; the
plan renders it whenever there is at least one collapsible link).

### 2. Viewport export - `app/[locale]/layout.tsx`

```tsx
import type { Viewport } from "next"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}
```

`width`/`initialScale` make mobile scaling explicit; `themeColor` tints mobile
browser chrome per theme. Values approximate the current light/dark backgrounds.

### 3. Per-page mobile audit + fixes

Audit each existing page at 390/768/1280 in both locales and fix any overflow or
cramped layout: `app/[locale]/page.tsx` (home), `login`, `register`,
`forgot-password`, `reset-password`, `dashboard`, `chat`. Fix bar: no horizontal
overflow; controls not cut off or overlapping; tap targets keep the button
defaults; RTL mirrors via logical utilities. Most pages are centered
`max-w-*` cards and likely already fit; the audit confirms and fixes the
exceptions (e.g. the home `CardFooter` two-button row, the chat input row at
390 px).

### 4. Playwright enforcement gate

- Add dev dependency `@playwright/test` (^1.60.0, matching the source) and
  install the Chromium browser (`npx playwright install chromium`).
- `playwright.config.ts`: `testDir: "./e2e"`, Chromium project, `webServer`
  running `npm run dev -- --port <PORT>` with `reuseExistingServer: !CI`,
  `baseURL` from `E2E_BASE_URL`/`E2E_PORT`. Loads `.env.local` via `dotenv` so
  the runner sees Supabase vars for the authenticated check.
- `e2e/responsive.spec.ts`: ported and trimmed to this project -
  - no-overflow at 390/768/1280 for guest pages `/en` and `/en/login`;
  - the home `<h1>` + `<main>` are visible at 390 px;
  - theme toggle round-trips light->dark->light via the `ModeToggle` dropdown
    (button name /toggle theme/i, menuitems /dark/i, /light/i), asserting the
    `.dark` class on `<html>` and persistence across reload;
  - Hebrew `/he` and `/he/login` are `dir="rtl"`, `lang="he-IL"`, no overflow at
    every width;
  - one authenticated check: with `E2E_INSTRUCTOR_*` set, sign in and assert
    `/en/dashboard` has no overflow at 390 px; `test.skip` when creds are unset.
- `e2e/helpers/auth.ts`: a minimal sign-in helper that drives the login form
  (no captcha, so a real form login works - simpler than the source's
  session-injection helper).
- `package.json`: add `"test:e2e": "playwright test"`. NOT added to `prebuild`
  or `build` (Playwright needs a running server + browser binaries).

### 5. Forward standard - `docs/RESPONSIVE.md` + `CLAUDE.md`

- `docs/RESPONSIVE.md`: the reference widths, the no-overflow rule, mobile-first
  breakpoint conventions, the header-drawer pattern, the table-on-desktop /
  card-on-mobile pattern, logical RTL utilities, tap-target guidance, and "run
  `npm run test:e2e` before merging any UI change."
- `CLAUDE.md`: a binding "Responsive and mobile" section mirroring the existing
  i18n / accessibility sections, pointing to `docs/RESPONSIVE.md`.

## Verification

- Existing gates stay green: `lint:i18n`, `typecheck`, `lint`, `build`.
- New: `npm run test:e2e` passes - all viewports, both locales, theme
  round-trip, and the authenticated dashboard check (creds are seeded).
- Manual spot-check at 390 px in a browser for the header drawer and each page.

## Risks

- Playwright adds a dev dependency, a Chromium download, and a gate that needs a
  running app. Kept out of the default `prebuild` chain so `npm run build` stays
  fast and server-free; `test:e2e` is run deliberately and documented as a
  pre-merge step. This is the accepted cost of automated "carry forward"
  enforcement.
- The e2e webServer uses the dev server (fast, matches source); minified-CSS
  prod-only overflow is not covered. Acceptable - layout/overflow behavior is
  the same between dev and prod for these assertions.
- The authenticated check depends on the seeded instructor account and a working
  no-captcha login; it `test.skip`s if creds are unset so CI without secrets
  still runs the guest suite deterministically.
