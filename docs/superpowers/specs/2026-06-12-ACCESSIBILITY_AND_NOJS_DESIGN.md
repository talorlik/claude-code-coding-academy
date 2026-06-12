# Accessibility and No-JS Standard - Coding Academy

Port the accessibility approach from `claude-code-ai-coach-assistant` and adopt
it as a binding, forward-looking project standard. The source has no single a11y
module; accessibility there is a set of conventions plus a 3-tier no-JS policy
woven across the app. This work ports the primitives, retrofits the existing
pages, enforces the conventions with a lint gate, and records the policy so it
governs all future development.

## Goals

- Pages and functionality work without JavaScript wherever feasible
  (progressive enhancement), per a per-surface 3-tier policy.
- Consistent semantic structure: one `<main id="main-content">` per page, a
  shared semantic header/footer, exactly one `<h1>` per page, labeled controls,
  visible focus, RTL-correct layout.
- A skip-to-content link (an improvement; the source lacks one).
- An automated a11y check via ESLint (no new runtime dependency).
- The standard recorded in `CLAUDE.md` (binding) and `docs/ACCESSIBILITY.md`
  (detailed), so future work inherits it.

## Non-Goals

- No axe/Playwright a11y runtime (the jsx-a11y lint gate covers the static
  surface without a new dependency or CI service).
- No fitness-domain components.
- No rewrite of the chat live-stream interaction model (Tier 3, exempt from full
  no-JS).

## The 3-Tier No-JS Policy

Every form uses a real `<form>`, a `type="submit"` control, and `<label for>`
-associated fields. Feedback flows through the query-param redirect channel
(`?error=` / `?notice=` codes -> localized server-rendered banner), never
JS-only inline state, so it is visible with JS disabled.

- Tier 1 - auth (login, signup, forgot/reset password): full no-JS. Already
  satisfied by the auth port (real `<form action={serverAction}>` over FormData
  with `resolve-auth-message` query-param feedback).
- Tier 2 - simple data forms added later: full no-JS. Use a FormData-accepting
  server-action wrapper bound to `<form action>`; re-validate server-side;
  report via the query-param channel.
- Tier 3 - inherently JS surfaces (live AI chat stream, anything depending on a
  browser streaming/realtime API): semantic, labeled markup only; no full no-JS
  rewrite.

The bar is per-surface, not uniform.

## Files Created / Changed

### New primitives

- `components/skip-link.tsx` - localized "Skip to content" link, visually hidden
  until focused (uses an `sr-only-focusable` utility), targets `#main-content`.
- `components/site-header.tsx` - shared server-rendered semantic `<header>` with
  `<nav aria-label>`, auth-aware (Sign in vs. Sign out + Dashboard), locale-aware
  `Link`, icon-only controls get `sr-only` text, decorative marks get
  `aria-hidden`. Hosts the LanguageSwitcher + ThemeToggle (moved off the home
  page's inline header).
- `components/site-footer.tsx` - shared semantic `<footer>` with a labeled nav.

### Styles

- `app/globals.css` - add an `sr-only-focusable` helper for the skip link and a
  `@media (prefers-reduced-motion: reduce)` block that neutralizes transitions
  and animations. `sr-only` is a Tailwind built-in, already available.

### Layout

- `app/[locale]/layout.tsx` - render `<SkipLink />` first in `<body>`, then
  `<SiteHeader />`, then `{children}` (pages own `<main id="main-content">`),
  then `<SiteFooter />`. Body becomes a `min-h-svh` flex column so the footer
  anchors correctly.

### Retrofit existing pages (minimal diffs)

- `app/[locale]/page.tsx` - drop the inline `<header>` (now shared); keep
  `<main id="main-content">`; ensure one `<h1>`.
- `app/[locale]/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`,
  `reset-password/page.tsx`, `dashboard/page.tsx`, `chat/page.tsx` - wrap content
  in `<main id="main-content">`, ensure exactly one `<h1>`, give icon-only
  controls `sr-only` text, give status/loading regions
  `role="status" aria-live="polite"`. Confirm form labels/`htmlFor` and visible
  focus. The chat client (Tier 3) gets labeled markup only.

### Enforced lint

- `eslint.config.mjs` - add `eslint-plugin-jsx-a11y` flat recommended config
  explicitly. The plugin is already an installed transitive dependency of
  `eslint-config-next`, so no new dependency is added; this turns the full
  recommended ruleset on and lets `npm run lint` (an existing gate) enforce it.

### Forward policy

- `docs/ACCESSIBILITY.md` - the 3-tier no-JS policy, the conventions checklist
  (landmarks, one h1, labels, visible focus, contrast, RTL logical utilities,
  reduced motion, sr-only, decorative-image handling), and how feedback must
  flow through the query-param channel.
- `CLAUDE.md` - a binding "Accessibility & progressive enhancement" section
  mirroring the existing i18n section, pointing to `docs/ACCESSIBILITY.md` as
  non-negotiable for future work.

## Localization

Any new user-facing strings (skip-link text, header/footer nav labels) go into
both `messages/en-US.json` and `messages/he-IL.json`, key-identical, reusing the
existing `Nav`/`Common`/`Footer` namespaces where they fit. `lint:i18n` must
stay green.

## Verification

- `npm run lint` with jsx-a11y enabled is the automated a11y gate (missing
  labels, bad ARIA, non-interactive handlers, missing alt, etc.).
- Manual: keyboard-tab each page; confirm the skip link works; disable JS and
  confirm a login submit still round-trips via the server action and renders a
  localized banner.
- Existing gates stay green: `lint:i18n`, `typecheck`, `build`.

## Risks

- jsx-a11y may flag a valid shadcn/Base UI pattern; resolve with a narrowly
  scoped, commented `eslint-disable-next-line` rather than weakening the rule
  globally.
- Replacing the home page's inline header with a shared `SiteHeader` changes the
  home layout slightly; verify the language/theme controls still render and the
  page keeps one `<h1>`.
