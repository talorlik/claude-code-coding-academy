# Responsive and Mobile-Friendly Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every page responsive at 390/768/1280 px in both locales, collapse
the header nav into a mobile drawer, add a `viewport` export, enforce it with a
Playwright e2e gate, and document the standard as binding.

**Architecture:** Introduce Playwright as the first test runner; the
`responsive.spec.ts` is written before the UI fixes (TDD) so it first fails on
the un-fixed layout, then passes once the header drawer and per-page fixes land.
The gate is a standalone `test:e2e` script (not in `prebuild`) driven against the
dev server.

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind v4, shadcn/Base UI
(Sheet), Playwright, lucide-react.

**Verification model:** Existing gates are `npm run lint:i18n`, `npm run typecheck`,
`npm run lint`, `npm run build` (lint baseline: 0 problems). This plan ADDS
`npm run test:e2e` (Playwright). Prefix every npm/node/npx command with:
`export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"`. The
`.claude/worktrees/**` ESLint ignore is already in place.

The reference widths are 390 (mobile), 768 (tablet), 1280 (desktop). The
no-overflow proxy is `document.documentElement.scrollWidth - clientWidth <= 1`.

---

## Task 0: Worktree setup

**Files:** none (environment only)

- [ ] **Step 1: Create the worktree off local HEAD**

`worktree.baseRef: head` is already set. Use the EnterWorktree tool with name
`feature/responsive-mobile`.

- [ ] **Step 2: Provision env + node_modules**

```bash
PRIMARY=/Users/talo/www/claude-code-coding-academy
WT="$PRIMARY/.claude/worktrees/feature+responsive-mobile"
[ -e "$WT/.env.local" ] || cp "$PRIMARY/.env.local" "$WT/.env.local"
[ -e "$WT/node_modules" ] || ln -s "$PRIMARY/node_modules" "$WT/node_modules"
ls -d "$WT/.env.local" "$WT/node_modules"
```

Expected: both paths listed.

- [ ] **Step 3: Confirm baseline gates**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint 2>&1 | tail -2
```

Expected: `0 problems` (lint is clean as of the last batch). Record this.

---

## Task 1: Install Playwright and add the config + e2e script

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `playwright.config.ts`

NOTE on node_modules: the worktree's `node_modules` is a SYMLINK to the primary
checkout's. Installing a package writes into the shared real directory, which is
fine (the primary needs Playwright too after merge). `.gitignore` already lists
`/test-results/`, `/playwright-report/`, `/playwright/.cache/`.

- [ ] **Step 1: Add @playwright/test as a dev dependency**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm install --save-dev @playwright/test@^1.60.0 2>&1 | tail -5
```

Expected: installs without error; `package.json` devDependencies gains
`@playwright/test`.

- [ ] **Step 2: Install the Chromium browser binary**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npx playwright install chromium 2>&1 | tail -5
```

Expected: Chromium downloads (or "is already installed"). This is a one-time
machine-level download, not a repo artifact.

- [ ] **Step 3: Add the test:e2e script**

In `package.json` `scripts`, add after the `"seed"` line:

```json
    "test:e2e": "playwright test",
```

Do NOT add it to `prebuild` or `build`.

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test"
import { config as loadEnv } from "dotenv"

/**
 * Load local env into the Playwright runner process. Next.js loads `.env.local`
 * for the app, but the test runner is a separate Node process; without this it
 * cannot see `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SECRET_KEY` or the
 * `E2E_INSTRUCTOR_*` credentials the authenticated check uses. Shell-exported
 * vars still take precedence over file values.
 */
loadEnv({ path: ".env.local" })

/**
 * Playwright config for the responsive e2e suite. Starts the app via `webServer`
 * (reusing a running dev server if one is up) and drives it through Chromium.
 * Base URL and port are overridable via environment variables.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 5: Typecheck (config is TS) and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
```

Expected: no errors. Then:

```bash
cd "$WT"
git add package.json package-lock.json playwright.config.ts
git commit -m "chore(test): add Playwright and responsive e2e config"
```

---

## Task 2: Write the responsive e2e spec (TDD - expected to FAIL first)

**Files:**
- Create: `e2e/responsive.spec.ts`
- Create: `e2e/helpers/auth.ts`

This is the failing test. The signed-in header overflow at 390 px (and possibly
some pages) will FAIL until Tasks 3-5 land. That is intended.

- [ ] **Step 1: Create `e2e/helpers/auth.ts`**

```ts
import { type Page, expect } from "@playwright/test"

/**
 * Instructor credentials from the environment (seeded by `npm run seed`). The
 * authenticated check skips when these are unset, so the guest suite stays
 * deterministic in CI without secrets.
 */
export const instructorCredentials = {
  email: process.env.E2E_INSTRUCTOR_EMAIL,
  password: process.env.E2E_INSTRUCTOR_PASSWORD,
}

/**
 * Signs in through the real login form. Auth has no captcha in this project, so
 * a form login works end to end. Lands on `/[locale]/dashboard` on success.
 *
 * @param page - the Playwright page.
 * @param email - account email.
 * @param password - account password.
 */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/en/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 15_000 })
}
```

- [ ] **Step 2: Create `e2e/responsive.spec.ts`**

```ts
import { test, expect, type Page } from "@playwright/test"

import { instructorCredentials, signIn } from "./helpers/auth"

/**
 * Responsive, theme, and RTL e2e. Asserts the guest-reachable shell (home +
 * login) holds up at the three reference viewports with no horizontal overflow,
 * that the theme toggle round-trips, and that the Hebrew shell renders RTL at
 * every viewport. No credentials are needed for the guest suite. A final
 * authenticated check guards the signed-in header's mobile collapse; it skips
 * when instructor credentials are unset.
 */

/** The three reference widths: mobile, tablet, desktop. */
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

/** Guest-reachable pages that exercise the localized shell. */
const GUEST_PAGES = [
  { name: "home", path: "/en" },
  { name: "login", path: "/en/login" },
] as const

/**
 * Asserts the document does not scroll horizontally - a viewport-aware proxy for
 * "nothing overflows its container". A 1px slack absorbs sub-pixel rounding.
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe("responsive layouts", () => {
  for (const vp of VIEWPORTS) {
    for (const target of GUEST_PAGES) {
      test(`${target.name} has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(target.path)
        await expect(page.getByRole("banner")).toBeVisible()
        await expectNoHorizontalOverflow(page)
      })
    }
  }

  test("the homepage heading and main render at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("main")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe("theme toggle", () => {
  test("round-trips light to dark to light and persists", async ({ page }) => {
    await page.goto("/en")
    const html = page.locator("html")

    await page.getByRole("button", { name: /toggle theme/i }).click()
    await page.getByRole("menuitem", { name: /^dark$/i }).click()
    await expect(html).toHaveClass(/dark/, { timeout: 10_000 })

    await page.reload()
    await expect(html).toHaveClass(/dark/, { timeout: 10_000 })

    await page.getByRole("button", { name: /toggle theme/i }).click()
    await page.getByRole("menuitem", { name: /^light$/i }).click()
    await expect(html).not.toHaveClass(/dark/, { timeout: 10_000 })
  })
})

test.describe("Hebrew RTL across viewports", () => {
  for (const vp of VIEWPORTS) {
    test(`the Hebrew home is rtl at ${vp.name} (${vp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto("/he")
      const html = page.locator("html")
      await expect(html).toHaveAttribute("dir", "rtl")
      await expect(html).toHaveAttribute("lang", "he-IL")
      await expectNoHorizontalOverflow(page)
    })
  }

  test("the Hebrew login is rtl and free of overflow at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/he/login")
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
    await expectNoHorizontalOverflow(page)
  })
})

test.describe("authenticated header at mobile width", () => {
  test("the dashboard has no horizontal overflow at 390px", async ({
    page,
  }) => {
    const { email, password } = instructorCredentials
    test.skip(
      !email || !password,
      "E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD not set",
    )
    await signIn(page, email!, password!)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/dashboard")
    await expect(page.getByRole("banner")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
```

- [ ] **Step 3: Run the suite - capture the failures (TDD red)**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run test:e2e 2>&1 | tail -30
```

Expected: the suite RUNS (server boots, Chromium drives). Some tests may already
pass (the guest pages are simple centered cards), but the authenticated
`/dashboard` 390px check is EXPECTED TO FAIL because the signed-in header does
not yet collapse. Record which tests fail. If the whole run errors (server
won't boot, browser missing), fix that before proceeding - that is a harness
problem, not a red test.

NOTE: if EVERY test passes already, that is acceptable - it means the current
layouts happen to fit; Tasks 3-5 then only ADD the drawer/viewport/standard and
must keep the suite green. Either way, commit the spec.

- [ ] **Step 4: Commit the spec**

```bash
cd "$WT"
git add e2e/responsive.spec.ts e2e/helpers/auth.ts
git commit -m "test(responsive): add responsive/RTL/theme e2e suite"
```

---

## Task 3: Collapse the header nav into a mobile Sheet drawer

**Files:**
- Modify: `components/site-header.tsx`

The `Sheet` component is Base UI (`render` props), already in the project. The
`Nav` namespace already has `openMenu` and `mainNavigation`.

- [ ] **Step 1: Rewrite `components/site-header.tsx`**

Replace the whole file with:

```tsx
import { getTranslations } from "next-intl/server"
import { Menu } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * Global top navigation, server-rendered so it reflects the current auth state
 * on every page. On wide viewports the nav links sit inline; below the `md`
 * breakpoint they collapse into a hamburger Sheet drawer so the header never
 * overflows a phone. The language and theme controls stay visible at all widths;
 * only the links collapse. Signed-out visitors see a Sign in link; signed-in
 * users see Dashboard and Chat links plus a Sign out control. Labels come from
 * the `Nav` namespace; links use the locale-aware {@link Link}. Sign-out posts
 * to the non-localized `/auth/signout` route (POST so it cannot be triggered by
 * a cross-site navigation or prefetch).
 */
export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations("Nav")
  const common = await getTranslations("Common")

  const navLinks = user
    ? [
        { href: "/dashboard", label: t("dashboard") },
        { href: "/chat", label: t("chat") },
      ]
    : []

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-x-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center font-mono text-sm font-medium"
        >
          {common("appName")}
        </Link>

        {/* Inline nav: visible from md up. */}
        <nav
          aria-label={t("mainNavigation")}
          className="hidden min-w-0 flex-1 items-center justify-end gap-4 text-sm md:flex"
        >
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
          {user ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="hover:underline">
                {t("signOut")}
              </button>
            </form>
          ) : (
            <Link href="/login" className="hover:underline">
              {t("signIn")}
            </Link>
          )}
        </nav>

        {/* Controls cluster: always visible. ms-auto pushes it to the inline
            end on mobile, where the inline nav above is hidden. */}
        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <LanguageSwitcher />
          <ModeToggle />

          {/* Signed-out users get a visible Sign in even on mobile. */}
          {!user ? (
            <Link
              href="/login"
              className="text-sm hover:underline md:hidden"
            >
              {t("signIn")}
            </Link>
          ) : null}

          {/* Hamburger drawer: only below md, only when there are links to
              collapse (signed-in users). */}
          {navLinks.length > 0 ? (
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu aria-hidden />
                    <span className="sr-only">{t("openMenu")}</span>
                  </Button>
                }
              />
              <SheetContent side="inline-end">
                <SheetHeader>
                  <SheetTitle>{t("mainNavigation")}</SheetTitle>
                </SheetHeader>
                <nav
                  aria-label={t("mainNavigation")}
                  className="flex flex-col gap-1 px-4 pb-4 text-sm"
                >
                  {navLinks.map((item) => (
                    <SheetClose
                      key={item.href}
                      render={
                        <Link
                          href={item.href}
                          className="rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      }
                    />
                  ))}
                  <SheetClose
                    render={
                      <form action="/auth/signout" method="post">
                        <button
                          type="submit"
                          className="w-full rounded-md px-2 py-2 text-start text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {t("signOut")}
                        </button>
                      </form>
                    }
                  />
                </nav>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify the Sheet `side` value is valid for this component**

```bash
cd "$WT"
grep -nE "side|inline-end|right|left|inline-start" components/ui/sheet.tsx | head
```

The shadcn/Base UI Sheet `side` prop accepts physical values
(`top`/`right`/`bottom`/`left`) and may or may not accept logical
`inline-end`. If `grep` shows it only supports physical sides, change
`side="inline-end"` to `side="right"` (the drawer side; acceptable since the
overlay is symmetric and RTL still reads correctly). Use whatever the component
actually supports. Re-run typecheck after any change.

- [ ] **Step 3: Typecheck + lint + build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -3
rm -rf .next && npm run build 2>&1 | tail -6
```

Expected: typecheck clean; lint 0 problems; build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "$WT"
git add components/site-header.tsx
git commit -m "feat(responsive): collapse header nav into a mobile Sheet drawer"
```

---

## Task 4: Add the viewport export

**Files:**
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Add the import and the viewport export**

In `app/[locale]/layout.tsx`, add `Viewport` to the `next` type import. The file
currently imports from `next-intl` and `next/font` but has no `next` type
import; add this near the top with the other imports:

```tsx
import type { Viewport } from "next"
```

Then add this export immediately AFTER the `generateStaticParams` function (and
before the `LocaleLayout` component):

```tsx
/**
 * Document-level viewport metadata. `width`/`initialScale` make mobile scaling
 * explicit (no accidental desktop-width zoom-out on phones), and `themeColor`
 * tints the mobile browser chrome to match the active theme. The colors track
 * the light/dark `--background` values.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}
```

- [ ] **Step 2: Typecheck + build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
rm -rf .next && npm run build 2>&1 | tail -6
```

Expected: typecheck clean; build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "$WT"
git add app/[locale]/layout.tsx
git commit -m "feat(responsive): add explicit viewport export with theme color"
```

---

## Task 5: Per-page mobile audit and fixes

**Files (audit; modify only those that overflow/cramp):**
- `app/[locale]/page.tsx` (home)
- `app/[locale]/chat/chat-client.tsx`
- `app/[locale]/login/page.tsx`, `login/login-tabs.tsx`
- `app/[locale]/register/page.tsx`
- `app/[locale]/forgot-password/page.tsx`
- `app/[locale]/reset-password/page.tsx`
- `app/[locale]/dashboard/page.tsx`

- [ ] **Step 1: Fix the chat input row (known cramped at 390px)**

In `app/[locale]/chat/chat-client.tsx`, the input row is a bare `<form>` with an
`<Input>` and a `<Button>` and no layout. Make it a flex row that does not
overflow: the input grows, the button stays its size. Change:

```tsx
      <form onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("inputPlaceholder")}
          disabled={isStreaming}
          aria-label={t("inputLabel")}
        />
        <Button type="submit" disabled={isStreaming || !input.trim()}>
          {t("send")}
        </Button>
      </form>
```

to:

```tsx
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t p-3"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("inputPlaceholder")}
          disabled={isStreaming}
          aria-label={t("inputLabel")}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="shrink-0"
        >
          {t("send")}
        </Button>
      </form>
```

`min-w-0 flex-1` lets the input shrink below its intrinsic width (prevents
overflow); `shrink-0` keeps the button intact.

- [ ] **Step 2: Make the home CardFooter buttons wrap-safe at 390px**

In `app/[locale]/page.tsx`, the footer is `<CardFooter className="flex gap-3">`
with two buttons. At 390px inside a `max-w-md` card this usually fits, but to be
safe allow wrapping. Change:

```tsx
        <CardFooter className="flex gap-3">
```

to:

```tsx
        <CardFooter className="flex flex-wrap gap-3">
```

- [ ] **Step 3: Audit the remaining pages at the reference widths**

The auth pages (`login`, `register`, `forgot-password`, `reset-password`) and
`dashboard` are centered `max-w-sm`/`max-w-2xl` cards with `px-4` padding - these
fit 390px by construction. Visually confirm via the e2e run in Step 4 rather
than editing pre-emptively. If the e2e flags overflow on any of them, fix that
page with the same tools: `min-w-0` on flex children that hold long text,
`flex-wrap` on button rows, `break-words`/`truncate` on long unbroken strings,
and logical padding (`px-*` is already symmetric).

- [ ] **Step 4: Run the full e2e suite - it must now be GREEN**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run test:e2e 2>&1 | tail -25
```

Expected: ALL tests pass (guest viewports, theme round-trip, Hebrew RTL, and the
authenticated dashboard 390px check - instructor creds are seeded in
`.env.local`). If any test still fails, fix the offending page (Step 3 tools) and
re-run until green. Do NOT edit the spec to make it pass.

- [ ] **Step 5: Typecheck + lint + build, then commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -3
rm -rf .next && npm run build 2>&1 | tail -6
```

Expected: typecheck clean; lint 0 problems; build succeeds. Then:

```bash
cd "$WT"
git add -A
git commit -m "fix(responsive): mobile-safe chat input and home footer; pass e2e"
```

---

## Task 6: Write docs/RESPONSIVE.md

**Files:**
- Create: `docs/RESPONSIVE.md`

- [ ] **Step 1: Write the doc**

```markdown
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
theme toggle round-trip, Hebrew RTL at every width, and an authenticated
dashboard check (guarded by `E2E_INSTRUCTOR_*`). It needs a running app and the
Chromium browser (`npx playwright install chromium` once). It is NOT part of
`npm run build` - run it explicitly before merging any UI change.

When you add a page or a wide component, add it to the relevant list in
`e2e/responsive.spec.ts` (a guest page to `GUEST_PAGES`, or a new authenticated
check) so the gate covers it.
```

- [ ] **Step 2: Commit**

```bash
cd "$WT"
git add docs/RESPONSIVE.md
git commit -m "docs(responsive): add responsive and mobile standard"
```

---

## Task 7: Add the binding section to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append the section**

Add this section to `CLAUDE.md` immediately after the `## Accessibility and
Progressive Enhancement` section and before the `## Git` section:

```markdown
## Responsive and Mobile

The site must be fully responsive and mobile-friendly, carried through all
future work. Before adding or changing any user-facing UI, read
`docs/RESPONSIVE.md`.

Non-negotiables:

- No horizontal overflow at 390 / 768 / 1280 px, in English (LTR) and Hebrew
  (RTL). The rule is `scrollWidth - clientWidth <= 1`.
- Mobile-first Tailwind: base styles for narrow screens, `sm:`/`md:`/`lg:`
  overrides upward. The header nav collapses into the `Sheet` drawer below `md`.
- Let flex children shrink (`min-w-0`), keep fixed controls `shrink-0`, wrap
  button rows (`flex-wrap`), break long strings, and use logical RTL utilities.
- `npm run test:e2e` (Playwright) enforces the no-overflow + RTL + theme
  contract. It is NOT in `prebuild`; run it before merging any UI change, and
  extend `e2e/responsive.spec.ts` when you add pages or wide components.
```

- [ ] **Step 2: Commit**

```bash
cd "$WT"
git add CLAUDE.md
git commit -m "docs(responsive): make responsive + mobile a binding standard"
```

---

## Task 8: Final verification and finish branch

**Files:** none (verification only)

- [ ] **Step 1: All gates from a clean state**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint:i18n 2>&1 | tail -2
npm run typecheck 2>&1 | tail -2
npm run lint 2>&1 | tail -2
rm -rf .next && npm run build 2>&1 | tail -6
npm run test:e2e 2>&1 | tail -10
```

Expected: i18n in sync; typecheck clean; lint 0 problems; build succeeds; e2e all
pass (the authenticated check runs because creds are seeded).

- [ ] **Step 2: Finish the branch**

Use the superpowers:finishing-a-development-branch skill: squash-merge the
worktree branch into local `main`. Run the dependency reconcile check
(`git diff --name-only HEAD~1 HEAD -- package.json package-lock.json`): this
batch ADDS `@playwright/test`, so BOTH files changed - therefore run
`npm install` in the primary `main` checkout after the merge before re-running
gates (the package exists only in the shared node_modules but the manifest now
references it; install reconciles the lockfile state on main). Remove the
worktree FIRST so it does not pollute scans (the `.claude/worktrees/**` ESLint
ignore guards lint, but build/e2e still walk cwd). Re-run the gates on `main`.
Do NOT push `main` unless Tal explicitly asks.

---

## Self-Review Notes

- **Spec coverage:** Playwright install + config (T1), e2e spec written first
  TDD (T2), header drawer (T3), viewport export (T4), per-page audit/fixes +
  green e2e (T5), docs/RESPONSIVE.md (T6), CLAUDE.md binding (T7), final verify +
  finish (T8). Every spec section maps to a task.
- **TDD ordering:** the spec (T2) precedes the fixes (T3-T5); T5 Step 4 is the
  red->green gate. If the guest suite is already green, the authenticated
  dashboard check is the one that exercises the new drawer.
- **No test runner before this:** Playwright is introduced here; the e2e gate is
  the verification surface for responsiveness, separate from build.
- **Dependency reconcile:** explicitly flagged in T8 because this batch is the
  rare case that adds a real dependency, unlike the prior CSS/docs batches.
- **Sheet `side` fallback:** T3 Step 2 handles the case where the Base UI Sheet
  does not accept the logical `inline-end` value.
