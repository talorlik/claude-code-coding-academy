# Responsive and Mobile

This project must be fully responsive. Every page works with no horizontal
overflow at the three reference widths, in both English (LTR) and Hebrew (RTL).

## Reference Widths

- 390 px - mobile phone
- 768 px - tablet
- 1280 px - desktop

The hard rule: at every width, `document.documentElement.scrollWidth -
clientWidth <= 1` (no horizontal scroll). The Playwright suite asserts this.

## Conventions

- Mobile-first: write the base styles for narrow screens, then layer `sm:`
  (640), `md:` (768), `lg:` (1024) overrides upward. Do not start desktop-first.
- The header nav collapses into a hamburger `Sheet` drawer below `md`; the
  language and theme controls stay visible at all widths. See
  `components/site-header.tsx`.
- For wide data, use a table on desktop (`hidden md:table` / `md:block`) and a
  stacked card layout on mobile (`md:hidden`). Do not force a wide table to
  scroll on a phone.
- Let flex children shrink: put `min-w-0` on a flex child that holds long text or
  an input, so it can shrink instead of overflowing. Keep fixed controls
  `shrink-0`.
- Allow button rows to wrap (`flex-wrap`) when they might not fit at 390 px.
- Break long unbroken strings with `break-words` / `truncate`.
- RTL: use Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`,
  `text-start`, `text-end`, `start-*`, `end-*`) so Hebrew mirrors. The `dir`
  attribute is set on `<html>` automatically.
- Keep tap targets at the shadcn `Button`/`Input` default sizes or larger; do
  not shrink interactive controls below them on mobile.
- The `viewport` export in `app/[locale]/layout.tsx` sets `width=device-width`,
  `initialScale: 1`, and the theme color. Do not override it per-page without
  reason.

## Enforcement

`npm run test:e2e` runs the Playwright responsive suite
(`e2e/responsive.spec.ts`): no-overflow at 390/768/1280 on the guest shell, the
theme toggle round-trip, Hebrew RTL at every width, an authenticated dashboard
check, and a header-collapse check (the hamburger drawer shows below `md` and
the inline nav shows on desktop). The authenticated checks are guarded by
`E2E_INSTRUCTOR_*` and skip when unset. The suite needs a running app and the
Chromium browser (`npx playwright install chromium` once). It is NOT part of
`npm run build` - run it explicitly before merging any UI change.

When you add a page or a wide component, add it to the relevant list in
`e2e/responsive.spec.ts` (a guest page to `GUEST_PAGES`, or a new authenticated
check) so the gate covers it.
