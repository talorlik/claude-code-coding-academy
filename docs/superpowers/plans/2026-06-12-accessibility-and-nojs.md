# Accessibility and No-JS Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the source project's accessibility conventions and 3-tier no-JS
policy into the coding academy: shared semantic header/footer, a skip-to-content
link, reduced-motion CSS, retrofitted pages, an enforced jsx-a11y lint gate, and
binding forward-looking docs.

**Architecture:** Accessibility is conventions plus policy, not a module. A
shared server-rendered `SiteHeader`/`SiteFooter` and a `SkipLink` go into the
locale layout; every page exposes `<main id="main-content">`; the jsx-a11y
recommended ruleset (already bundled with eslint-config-next, no new dependency)
runs in `npm run lint`; the policy lives in `CLAUDE.md` + `docs/ACCESSIBILITY.md`.

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind v4, shadcn/Base UI,
ESLint flat config with eslint-plugin-jsx-a11y.

**Verification model:** This project has NO unit-test runner (no `test` script,
no vitest/playwright). The per-task verification gates are therefore
`npm run lint` (now jsx-a11y-enabled), `npm run lint:i18n`, `npm run typecheck`,
and `npm run build`. Every task ends by running the relevant gate(s). All
commands assume the nvm v22 bin is on PATH:
`export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"`.

---

## Task 0: Worktree setup

**Files:** none (environment only)

- [ ] **Step 1: Create an isolated worktree off local HEAD**

Project policy (CLAUDE.md) requires a per-branch worktree, and `origin/main`
lags local `main`, so branch from local HEAD. The `worktree.baseRef: head`
setting is already in `.claude/settings.json`.

Use the EnterWorktree tool with name `feature/accessibility-nojs`.

- [ ] **Step 2: Provision env + node_modules into the worktree**

```bash
PRIMARY=/Users/talo/www/claude-code-coding-academy
WT="$PRIMARY/.claude/worktrees/feature+accessibility-nojs"
[ -e "$WT/.env.local" ] || cp "$PRIMARY/.env.local" "$WT/.env.local"
[ -e "$WT/node_modules" ] || ln -s "$PRIMARY/node_modules" "$WT/node_modules"
ls -d "$WT/.env.local" "$WT/node_modules"
```

Expected: both paths listed.

- [ ] **Step 3: Confirm baseline gates pass before changes**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint 2>&1 | tail -3
```

Expected: 3 pre-existing errors in `components/ui/carousel.tsx` and
`hooks/use-mobile.ts` (set-state-in-effect), and nothing else. These are not
ours and stay untouched. Record the count so later tasks can tell new
violations from old.

---

## Task 1: Reduced-motion + sr-only-focusable CSS

**Files:**
- Modify: `app/globals.css` (the `@layer base` block at the end)

- [ ] **Step 1: Add the utilities to the base layer**

Replace the final `@layer base { ... }` block in `app/globals.css` with:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }

  /* Skip-link target gets a focus ring without an outline on the wrapper. */
  :focus-visible {
    @apply outline-2 outline-offset-2 outline-ring;
  }
}

/* A visually hidden element that becomes visible when focused. Used by the
   skip-to-content link: off-screen until a keyboard user tabs to it, then it
   reveals at the top-left (top-right under RTL via logical inset). */
@utility sr-only-focusable {
  &:not(:focus):not(:focus-within) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

/* Respect a user's reduced-motion preference: collapse animation and
   transition durations everywhere so motion-sensitive users are not affected.
   Kept at the end so it overrides component-level transitions. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Verify the build compiles the CSS**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
rm -rf .next && npm run build 2>&1 | tail -8
```

Expected: build succeeds. (`@utility` is Tailwind v4 syntax; the build proves it
parses.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(a11y): add reduced-motion and sr-only-focusable CSS utilities"
```

---

## Task 2: Localization keys for the a11y chrome

**Files:**
- Modify: `messages/en-US.json` (`Nav` namespace)
- Modify: `messages/he-IL.json` (`Nav` namespace)

- [ ] **Step 1: Add new `Nav` keys to en-US**

In `messages/en-US.json`, replace the `Nav` object with:

```json
  "Nav": {
    "home": "Home",
    "chat": "Chat",
    "dashboard": "Dashboard",
    "signIn": "Sign in",
    "signOut": "Sign out",
    "skipToContent": "Skip to content",
    "mainNavigation": "Main navigation",
    "openMenu": "Open navigation menu"
  },
```

- [ ] **Step 2: Add the same keys to he-IL (translated)**

In `messages/he-IL.json`, replace the `Nav` object with:

```json
  "Nav": {
    "home": "בית",
    "chat": "צ׳אט",
    "dashboard": "לוח הבקרה",
    "signIn": "התחברות",
    "signOut": "התנתקות",
    "skipToContent": "דילוג לתוכן",
    "mainNavigation": "ניווט ראשי",
    "openMenu": "פתיחת תפריט הניווט"
  },
```

- [ ] **Step 3: Verify catalogs stay key-identical**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint:i18n 2>&1 | tail -2
```

Expected: "i18n catalogs in sync (N keys)." with N increased by 3.

- [ ] **Step 4: Commit**

```bash
git add messages/en-US.json messages/he-IL.json
git commit -m "feat(i18n): add nav keys for dashboard and skip-to-content"
```

---

## Task 3: SkipLink component

**Files:**
- Create: `components/skip-link.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { getTranslations } from "next-intl/server"

/**
 * Skip-to-content link. Visually hidden until it receives keyboard focus, then
 * it reveals at the start of the viewport so a keyboard or screen-reader user
 * can jump past the header straight to `#main-content`. It is the first focusable
 * element in the document. Every page must render a `<main id="main-content">`
 * for the target to resolve.
 */
export async function SkipLink() {
  const t = await getTranslations("Nav")
  return (
    <a
      href="#main-content"
      className="sr-only-focusable absolute start-4 top-4 z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow ring-1 ring-border"
    >
      {t("skipToContent")}
    </a>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/skip-link.tsx
git commit -m "feat(a11y): add skip-to-content link component"
```

---

## Task 4: SiteFooter component

**Files:**
- Create: `components/site-footer.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"

/**
 * Global footer landmark. Server-rendered. The nav has an explicit accessible
 * name so assistive tech distinguishes it from the header nav. The year is
 * computed once per render for the copyright line.
 */
export async function SiteFooter() {
  const t = await getTranslations("Footer")
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <nav aria-label={t("tagline")} className="flex items-center gap-4">
          <Link href="/" className="hover:underline">
            {t("home")}
          </Link>
        </nav>
        <p>{t("rights", { year })}</p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/site-footer.tsx
git commit -m "feat(a11y): add semantic site footer landmark"
```

---

## Task 5: SiteHeader component

**Files:**
- Create: `components/site-header.tsx`

The header is auth-aware: signed-out visitors see a Sign in link; signed-in
users see Dashboard + Chat links and a Sign out control. It hosts the language
and theme controls (moving them off the home page's inline header). Sign-out
posts to the non-localized `/auth/signout` route.

- [ ] **Step 1: Write the component**

```tsx
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * Global top navigation, server-rendered so it reflects the current auth state
 * on every page. Signed-out visitors see a Sign in link; signed-in users see
 * Dashboard and Chat links plus a Sign out control. The brand always links home.
 * All links use the locale-aware {@link Link} so they preserve the active
 * language; labels come from the `Nav` namespace. Sign-out posts to the
 * non-localized `/auth/signout` route (POST so it cannot be triggered by a
 * cross-site navigation or prefetch).
 */
export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations("Nav")
  const common = await getTranslations("Common")

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center font-mono text-sm font-medium">
          {common("appName")}
        </Link>

        <nav
          aria-label={t("mainNavigation")}
          className="flex min-w-0 flex-1 items-center justify-end gap-4 text-sm"
        >
          {user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                {t("dashboard")}
              </Link>
              <Link href="/chat" className="hover:underline">
                {t("chat")}
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="hover:underline">
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hover:underline">
              {t("signIn")}
            </Link>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/site-header.tsx
git commit -m "feat(a11y): add auth-aware semantic site header landmark"
```

---

## Task 6: Wire the chrome into the locale layout

**Files:**
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Import and render the chrome**

In `app/[locale]/layout.tsx`, add these imports after the existing
`ThemeProvider` import:

```tsx
import { SkipLink } from "@/components/skip-link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
```

Then replace the `<body>` element's contents. Change:

```tsx
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
```

to:

```tsx
      <body className="flex min-h-svh flex-col">
        <NextIntlClientProvider>
          <ThemeProvider>
            <SkipLink />
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
```

- [ ] **Step 2: Typecheck + build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
rm -rf .next && npm run build 2>&1 | tail -8
```

Expected: typecheck clean; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/layout.tsx
git commit -m "feat(a11y): render skip link, header, footer in locale layout"
```

---

## Task 7: Retrofit the home page

**Files:**
- Modify: `app/[locale]/page.tsx`

The shared header now owns the language/theme controls, so the page's inline
`<header>` is removed. The page keeps one `<h1>` (the card title becomes the h1)
and a `<main id="main-content">`.

- [ ] **Step 1: Replace the page body**

Replace the `return (...)` block in `app/[locale]/page.tsx` with:

```tsx
  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center p-6"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle render={<h1 />} className="text-2xl">
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-loose text-muted-foreground">
          <p>
            {t.rich("body", {
              kbd: (chunks) => <kbd>{chunks}</kbd>,
            })}
          </p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button render={<Link href="/login" />} nativeButton={false}>
            {t("getStarted")}
          </Button>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
          >
            {t("signIn")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
```

Then remove the now-unused imports `ThemeToggle` and `LanguageSwitcher` from the
top of the file.

> Note: shadcn's `CardTitle` renders a `div` by default; `render={<h1 />}`
> (Base UI render-prop, already used for `Button` in this file) makes it a
> semantic `<h1>` without changing styles.

- [ ] **Step 2: Typecheck + lint**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -4
```

Expected: typecheck clean; lint shows only the 3 pre-existing errors from
Task 0, no new ones, and no unused-import warning for the page.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/page.tsx
git commit -m "feat(a11y): home page uses shared header and a main landmark"
```

---

## Task 8: Retrofit auth + dashboard pages with main landmark + single h1

**Files:**
- Modify: `app/[locale]/login/page.tsx`
- Modify: `app/[locale]/forgot-password/page.tsx`
- Modify: `app/[locale]/reset-password/page.tsx`
- Modify: `app/[locale]/dashboard/page.tsx`

Each of these pages currently wraps content in a `<div className="flex
min-h-svh ...">`. Two changes per page: (1) change the outermost wrapper from
`<div>` to `<main id="main-content">` (drop `min-h-svh` since the layout column
now owns full height), and (2) the existing `<h1>` stays the only h1.

- [ ] **Step 1: login/page.tsx**

Change the outer wrapper:

```tsx
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12 text-foreground">
```

to:

```tsx
    <main id="main-content" className="flex flex-1 items-center justify-center bg-background px-4 py-12 text-foreground">
```

and its matching closing `</div>` (the last line of the return) to `</main>`.

- [ ] **Step 2: forgot-password/page.tsx — same change**

Replace the identical outer `<div className="flex min-h-svh items-center
justify-center bg-background px-4 py-12 text-foreground">` with
`<main id="main-content" className="flex flex-1 items-center justify-center bg-background px-4 py-12 text-foreground">`
and its closing `</div>` with `</main>`.

- [ ] **Step 3: reset-password/page.tsx — same change**

Same replacement as Step 2 in `reset-password/page.tsx`.

- [ ] **Step 4: dashboard/page.tsx**

Change:

```tsx
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 px-4 py-12">
```

to:

```tsx
    <main id="main-content" className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
```

and its closing `</div>` to `</main>`.

- [ ] **Step 5: Typecheck + lint + build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -4
rm -rf .next && npm run build 2>&1 | tail -8
```

Expected: typecheck clean; only the 3 pre-existing lint errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/login/page.tsx app/[locale]/forgot-password/page.tsx app/[locale]/reset-password/page.tsx app/[locale]/dashboard/page.tsx
git commit -m "feat(a11y): auth and dashboard pages use main landmark"
```

---

## Task 9: Retrofit the chat page (Tier 3 — labeled markup only)

**Files:**
- Modify: `app/[locale]/chat/page.tsx`
- Read first: `app/[locale]/chat/chat-client.tsx` (to confirm the input label)

Chat is Tier 3 (live AI stream, inherently JS). No no-JS rewrite; just give it a
`<main id="main-content">` landmark and confirm the message input has an
associated label (the `Chat` namespace already has `inputLabel`).

- [ ] **Step 1: Inspect the current chat page + client**

```bash
cd "$WT"
sed -n '1,60p' app/[locale]/chat/page.tsx
grep -nE "<main|id=.main|aria-label|sr-only|<label|htmlFor|inputLabel" app/[locale]/chat/chat-client.tsx
```

Expected: note whether `page.tsx` already has a `<main>` and whether the input
in `chat-client.tsx` is labeled (via `aria-label={t("inputLabel")}` or a
`<label htmlFor>`).

- [ ] **Step 2: Ensure the chat page has a main landmark**

If `app/[locale]/chat/page.tsx` wraps content in a `<div>` or fragment, change
the outermost layout wrapper to `<main id="main-content" ...>` (keep existing
classes). If it already renders a `<main>`, add `id="main-content"` to it. If
the page delegates entirely to `<ChatClient />`, wrap that render in
`<main id="main-content" className="flex flex-1 flex-col">…</main>`.

- [ ] **Step 3: Ensure the chat input is labeled**

In `app/[locale]/chat/chat-client.tsx`, confirm the text input carries
`aria-label={t("inputLabel")}` (the `Chat.inputLabel` key exists). If it has a
visible placeholder but no accessible name, add the `aria-label`. If a `<label>`
already associates via `htmlFor`/`id`, leave it.

- [ ] **Step 4: Typecheck + lint**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -4
```

Expected: typecheck clean; only the 3 pre-existing lint errors.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/chat/page.tsx app/[locale]/chat/chat-client.tsx
git commit -m "feat(a11y): chat page main landmark and labeled input"
```

---

## Task 10: Fix the hardcoded ThemeToggle aria-label

**Files:**
- Modify: `components/theme-toggle.tsx`

`theme-toggle.tsx` has a hardcoded `aria-label="Toggle theme"` — an i18n
violation. The `ThemeToggle` namespace already has a `label` key.

- [ ] **Step 1: Read the file and localize the label**

```bash
cd "$WT"
sed -n '1,40p' components/theme-toggle.tsx
```

It is a client component. Confirm it already calls `useTranslations("ThemeToggle")`
(it uses `t("light")`, etc.). Change the attribute:

```tsx
      aria-label="Toggle theme"
```

to:

```tsx
      aria-label={t("label")}
```

If `t` is not already in scope, add `const t = useTranslations("ThemeToggle")`
inside the component and `import { useTranslations } from "next-intl"` at the top.

- [ ] **Step 2: Typecheck + lint**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -4
```

Expected: typecheck clean; only the 3 pre-existing lint errors.

- [ ] **Step 3: Commit**

```bash
git add components/theme-toggle.tsx
git commit -m "fix(i18n): localize ThemeToggle aria-label"
```

---

## Task 11: Enforce jsx-a11y recommended in ESLint

**Files:**
- Modify: `eslint.config.mjs`

`eslint-plugin-jsx-a11y` is already an installed transitive dependency of
`eslint-config-next` (verified: `node_modules/eslint-config-next` lists it). Add
its flat recommended config explicitly so the FULL recommended ruleset runs, not
just Next's curated subset. No `npm install` needed.

- [ ] **Step 1: Add the plugin config**

Replace `eslint.config.mjs` with:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Full jsx-a11y recommended ruleset. The plugin ships with
  // eslint-config-next, so this adds no new dependency; it promotes the
  // accessibility checks from Next's curated subset to the plugin's complete
  // recommended set. Scoped to the JSX/TSX surface.
  {
    files: ["**/*.{jsx,tsx}"],
    ...jsxA11y.flatConfigs.recommended,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

- [ ] **Step 2: Run lint and triage**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint 2>&1 | tail -40
```

Expected: the 3 pre-existing `set-state-in-effect` errors, plus possibly new
jsx-a11y findings. For each new finding in OUR files (`app/**`,
`components/*.tsx`, not `components/ui/**` shadcn vendor files):
- If it is a real issue, fix it.
- If it is a valid shadcn/Base UI pattern, add a narrowly scoped
  `// eslint-disable-next-line jsx-a11y/<rule>` with a one-line reason.

Do NOT fix findings inside `components/ui/**` (vendored shadcn) in this task; if
jsx-a11y floods them, scope the config's `files` to exclude `components/ui/**`
by adding `ignores: ["components/ui/**"]` to the jsx-a11y block and note it in
the commit. Re-run until lint shows only the 3 known pre-existing errors.

- [ ] **Step 3: Final full gate sweep**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint:i18n 2>&1 | tail -2
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -5
rm -rf .next && npm run build 2>&1 | tail -8
```

Expected: i18n in sync; typecheck clean; lint shows only the 3 pre-existing
errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore(a11y): enforce jsx-a11y recommended ruleset in eslint"
```

---

## Task 12: Write docs/ACCESSIBILITY.md

**Files:**
- Create: `docs/ACCESSIBILITY.md`

- [ ] **Step 1: Write the doc**

Create `docs/ACCESSIBILITY.md` with this exact content:

```markdown
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
globally.

## Manual Verification

- Tab through the page from the top: the skip link appears first, then header,
  then main. Every interactive control is reachable and shows a focus ring.
- Disable JavaScript and submit a Tier 1/Tier 2 form: it still round-trips via
  the server action and renders a localized banner.
- Switch to Hebrew (`/he/...`): the layout mirrors; nothing is clipped or
  left-aligned where it should be right-aligned.
```

- [ ] **Step 2: Lint the markdown is well-formed (build does not cover docs)**

```bash
cd "$WT"
test -f docs/ACCESSIBILITY.md && echo "exists"
```

Expected: `exists`.

- [ ] **Step 3: Commit**

```bash
git add docs/ACCESSIBILITY.md
git commit -m "docs(a11y): add accessibility and progressive-enhancement standard"
```

---

## Task 13: Add the binding section to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (project root)

- [ ] **Step 1: Append the section**

Add this section to `CLAUDE.md` immediately after the `## Localization (English
+ Hebrew)` section and before the `## Git` section:

```markdown
## Accessibility and Progressive Enhancement

Accessibility and no-JavaScript resilience are non-negotiable and must be carried
through all future work. Before adding any user-facing UI, read
`docs/ACCESSIBILITY.md`.

Non-negotiables:

- Every page exposes a `<main id="main-content">`; use semantic landmarks
  (`<header>`, `<nav aria-label>`, `<footer>`) and exactly one `<h1>`.
- Forms follow the 3-tier no-JS policy: real `<form>` + `type="submit"` +
  `<label for>` fields. Tier 1 (auth) and Tier 2 (simple data forms) are full
  no-JS via `FormData` server actions with query-param feedback; Tier 3
  (live chat, realtime APIs) is semantic markup only.
- Feedback flows through the `?error=`/`?notice=` query-param channel resolved
  to a localized banner, never JS-only inline state.
- Icon-only controls carry `sr-only` text; decorative images use `aria-hidden`/
  `alt=""`; focus stays visible; motion respects `prefers-reduced-motion`.
- `npm run lint` enforces `eslint-plugin-jsx-a11y`; keep it green. Resolve a
  false positive with a scoped, commented `eslint-disable-next-line`, never by
  weakening the rule globally.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(a11y): make accessibility + no-JS a binding project standard"
```

---

## Task 14: Final verification and visual smoke

**Files:** none (verification only)

- [ ] **Step 1: All gates green from a clean build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint:i18n 2>&1 | tail -2
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -5
rm -rf .next && npm run build 2>&1 | tail -12
```

Expected: i18n in sync; typecheck clean; lint shows only the 3 documented
pre-existing errors; build succeeds with all routes listed.

- [ ] **Step 2: Runtime smoke — skip link, landmark, no-JS submit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
(PORT=3212 npm run start >/tmp/a11y-smoke.log 2>&1 &)
sleep 6
echo "=== home has skip link + main landmark ==="
curl -s http://localhost:3212/en | grep -oE 'href="#main-content"|id="main-content"|Skip to content' | sort -u
echo "=== he skip link localized ==="
curl -s http://localhost:3212/he | grep -oE 'דילוג לתוכן'
echo "=== login page main landmark ==="
curl -s http://localhost:3212/en/login | grep -oE 'id="main-content"' | head -1
echo "=== header renders Sign in for signed-out ==="
curl -s http://localhost:3212/en | grep -oE 'Sign in' | head -1
pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null
```

Expected: skip link href + `#main-content` id + "Skip to content" on `/en`;
"דילוג לתוכן" on `/he`; `id="main-content"` on `/en/login`; "Sign in" in the
header.

- [ ] **Step 3: Finish the branch**

Use the superpowers:finishing-a-development-branch skill: squash-merge the
worktree branch into local `main`, run the dependency reconcile check
(`git diff --name-only HEAD~1 HEAD -- package.json package-lock.json`; `eslint`
config changed but no deps were added, so no `npm install` is expected), re-run
the gates on `main`, then remove the worktree and branch. Do NOT push `main`
unless Tal explicitly asks.

---

## Self-Review Notes

- **Spec coverage:** skip link (T3), reduced-motion + sr-only-focusable CSS (T1),
  shared header/footer landmarks (T4/T5/T6), retrofit home/auth/dashboard/chat
  (T7/T8/T9), jsx-a11y gate (T11), docs/ACCESSIBILITY.md (T12), CLAUDE.md binding
  section (T13), localization (T2 + key-identical catalogs throughout). The
  hardcoded ThemeToggle label (T10) is an in-scope a11y/i18n fix surfaced during
  exploration. All spec sections map to a task.
- **No unit tests:** intentional — the project has no test runner; the jsx-a11y
  lint gate + build + manual smoke are the verification surface, stated up front.
- **Vendored shadcn:** Task 11 explicitly scopes how to handle jsx-a11y noise in
  `components/ui/**` so the gate does not block on vendor code.
