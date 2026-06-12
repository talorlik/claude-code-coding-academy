# Accessibility and Progressive Enhancement

This project treats accessibility and no-JavaScript resilience as
non-negotiable. Every user-facing surface must be usable with a keyboard, with a
screen reader, and - where feasible - with JavaScript disabled.

## The No-JS Policy (3 tiers)

Every form uses a real `<form>`, a `type="submit"` control, and `<label for>`
-associated fields. Feedback flows through the query-param redirect channel
(`?error=` / `?notice=` codes resolved to a localized, server-rendered banner;
see `lib/auth/resolve-auth-message.ts`), never JavaScript-only inline state, so
it is visible with JS disabled.

- **Tier 1 - auth** (login, signup, forgot/reset password): full no-JS. Real
  `<form action={serverAction}>` over `FormData`.
- **Tier 2 - simple data forms**: full no-JS. Bind a `FormData`-accepting
  server-action wrapper to `<form action>`, re-validate server-side, and report
  through the query-param channel.
- **Tier 3 - inherently-JS surfaces** (live AI chat stream, browser
  realtime/streaming APIs): semantic, labeled markup only. No full no-JS rewrite.

The bar is per-surface, not uniform. When adding a surface, decide its tier and
say so in the PR/commit.

## Conventions Checklist (every new page/component)

- [ ] Exactly one `<h1>` per page; headings nest without skipping levels.
- [ ] The primary content is a `<main id="main-content">` so the skip link
      resolves. Use `<header>`, `<nav aria-label>`, `<footer>` landmarks.
- [ ] Every form control has a programmatic label (`<label htmlFor>` or
      `aria-label`). Icon-only buttons carry `sr-only` text; decorative icons/
      images use `aria-hidden` and/or `alt=""`.
- [ ] Interactive elements are real buttons/links, reachable and operable by
      keyboard. No click handlers on non-interactive elements.
- [ ] Focus is visible (the global `:focus-visible` ring; do not remove
      outlines without an equivalent).
- [ ] Status/loading regions use `role="status" aria-live="polite"`.
- [ ] Layout uses Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`,
      `text-start`, `text-end`, `start-*`, `end-*`) so Hebrew RTL mirrors
      correctly.
- [ ] Motion respects `prefers-reduced-motion` (handled globally in
      `app/globals.css`; do not add un-guarded long animations).
- [ ] All user-facing strings are localized in both catalogs (see `docs/I18N.md`).

## Enforcement

`npm run lint` runs `eslint-plugin-jsx-a11y` (recommended ruleset) over all
JSX/TSX. It catches missing labels, invalid ARIA, non-interactive handlers, and
missing alt text. It is part of the build gate. Resolve a false positive on a
valid shadcn/Base UI pattern with a narrowly scoped, commented
`eslint-disable-next-line jsx-a11y/<rule>` - never by weakening the rule
globally. Vendored shadcn primitives under `components/ui/**` are excluded from
the jsx-a11y check; do not rely on that exclusion for code we author.

## Manual Verification

- Tab through the page from the top: the skip link appears first, then header,
  then main. Every interactive control is reachable and shows a focus ring.
- Disable JavaScript and submit a Tier 1/Tier 2 form: it still round-trips via
  the server action and renders a localized banner.
- Switch to Hebrew (`/he/...`): the layout mirrors; nothing is clipped or
  left-aligned where it should be right-aligned.
