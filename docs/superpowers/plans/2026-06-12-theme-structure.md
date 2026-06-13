# Theme Switching and CSS Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the target's theme CSS into a `:root` / `.light` / `.dark`
cascade with an OS-aware no-JS fallback, make next-themes emit an explicit
`.light` class, and replace the icon toggle with the source's Light/Dark/System
dropdown - all without changing any color value.

**Architecture:** `:root` carries the common tokens plus the light color set (the
no-JS default); a `prefers-color-scheme: dark` media query themes no-JS dark
visitors; explicit `.light`/`.dark` blocks come last in source order so the
JS-applied next-themes class wins on equal specificity. The provider gains a
`value` map so light mode gets a real class. A new `ModeToggle` dropdown
replaces `ThemeToggle`.

**Tech Stack:** Next.js 16 App Router, next-themes, Tailwind v4, next-intl,
shadcn/Base UI (DropdownMenu, Button), lucide-react.

**Verification model:** No unit-test runner exists in this project. Gates are
`npm run lint:i18n`, `npm run typecheck`, `npm run lint`, `npm run build`, plus a
runtime smoke. Prefix every npm command with:
`export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"`.

The lint baseline is exactly 3 PRE-EXISTING errors (`react-hooks/set-state-in-effect`
in `components/theme-toggle.tsx`, `components/ui/carousel.tsx`,
`hooks/use-mobile.ts`). NOTE: removing `theme-toggle.tsx` (Task 4) drops that
file's error, so after Task 4 the baseline becomes 2 errors. The `.claude/worktrees/**`
ESLint ignore is already in place, so a live worktree does not pollute lint.

---

## Task 0: Worktree setup

**Files:** none (environment only)

- [ ] **Step 1: Create the worktree off local HEAD**

`worktree.baseRef: head` is already set in `.claude/settings.json`. Use the
EnterWorktree tool with name `feature/theme-structure`.

- [ ] **Step 2: Provision env + node_modules**

```bash
PRIMARY=/Users/talo/www/claude-code-coding-academy
WT="$PRIMARY/.claude/worktrees/feature+theme-structure"
[ -e "$WT/.env.local" ] || cp "$PRIMARY/.env.local" "$WT/.env.local"
[ -e "$WT/node_modules" ] || ln -s "$PRIMARY/node_modules" "$WT/node_modules"
ls -d "$WT/.env.local" "$WT/node_modules"
```

Expected: both paths listed.

- [ ] **Step 3: Confirm baseline gates**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint 2>&1 | tail -3
```

Expected: `3 problems (3 errors, 0 warnings)` (theme-toggle.tsx, carousel.tsx,
use-mobile.ts). Record this.

---

## Task 1: Provider emits an explicit `.light` class

**Files:**
- Modify: `components/theme-provider.tsx`

- [ ] **Step 1: Add the `value` map**

In `components/theme-provider.tsx`, the `<NextThemesProvider>` currently has:

```tsx
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
```

Add the `value` prop after `disableTransitionOnChange`:

```tsx
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      value={{ light: "light", dark: "dark" }}
      {...props}
    >
```

This makes next-themes write `class="light"` in light mode (it previously wrote
no class for light) and `class="dark"` in dark mode. Nothing else changes; the
`d` hotkey stays.

- [ ] **Step 2: Typecheck**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "$WT"
git add components/theme-provider.tsx
git commit -m "feat(theme): emit explicit light class via next-themes value map"
```

---

## Task 2: Restructure globals.css into :root / @media / .light / .dark

**Files:**
- Modify: `app/globals.css` (the `:root` block at line ~50 and the `.dark` block
  at line ~85)

This task ONLY rewrites the color-token cascade. Do NOT touch `@import`,
`@custom-variant`, `@theme inline`, `@layer base`, `@utility sr-only-focusable`,
or the `prefers-reduced-motion` media query.

- [ ] **Step 1: Replace the `:root { ... }` and `.dark { ... }` blocks**

Find the existing `:root { ... }` block (currently holds light colors +
`--radius`) and the `.dark { ... }` block immediately after it. Replace BOTH
blocks (from `:root {` through the closing `}` of `.dark`) with the following
four blocks, in this exact order. Colors are the current values, unchanged;
`--radius` and `color-scheme` are the only additions to `:root`.

```css
/* Common base + light defaults. `:root` doubles as the no-JS default: a visitor
   with JavaScript disabled (so next-themes never sets a class) sees these light
   colors. `color-scheme` lets form controls/scrollbars match. --radius is the
   only non-color token and is referenced by @theme inline above. */
:root {
    color-scheme: light dark;
    --radius: 0.625rem;

    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --chart-1: oklch(0.87 0 0);
    --chart-2: oklch(0.556 0 0);
    --chart-3: oklch(0.439 0 0);
    --chart-4: oklch(0.371 0 0);
    --chart-5: oklch(0.269 0 0);
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
}

/* No-JS dark: a visitor with JS disabled whose OS prefers dark gets the dark
   set. Same specificity as :root, later in source, so it overrides the light
   defaults for dark-OS no-JS visitors. When JS is on, next-themes adds a class
   and the .light/.dark blocks below win on source order. */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;

    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.87 0 0);
    --chart-2: oklch(0.556 0 0);
    --chart-3: oklch(0.439 0 0);
    --chart-4: oklch(0.371 0 0);
    --chart-5: oklch(0.269 0 0);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
  }
}

/* Explicit light theme (next-themes writes class="light"). Same values as the
   :root light defaults. Comes after the no-JS blocks so an explicit class wins
   on equal specificity via source order. */
.light {
    color-scheme: light;

    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --chart-1: oklch(0.87 0 0);
    --chart-2: oklch(0.556 0 0);
    --chart-3: oklch(0.439 0 0);
    --chart-4: oklch(0.371 0 0);
    --chart-5: oklch(0.269 0 0);
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
}

/* Explicit dark theme (next-themes writes class="dark"). Same values as the
   no-JS dark block. */
.dark {
    color-scheme: dark;

    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.87 0 0);
    --chart-2: oklch(0.556 0 0);
    --chart-3: oklch(0.439 0 0);
    --chart-4: oklch(0.371 0 0);
    --chart-5: oklch(0.269 0 0);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
}
```

- [ ] **Step 2: Verify the build compiles the CSS**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
rm -rf .next && npm run build 2>&1 | tail -8
```

Expected: build succeeds. If it fails, do not commit - report the error.

- [ ] **Step 3: Sanity-check block order with grep**

```bash
cd "$WT"
grep -nE "^:root \{|prefers-color-scheme: dark|^\.light \{|^\.dark \{" app/globals.css
```

Expected line order: `:root {` FIRST, then `prefers-color-scheme: dark`, then
`.light {`, then `.dark {`. If `.light`/`.dark` are not last, fix the order
(source order is load-bearing).

- [ ] **Step 4: Commit**

```bash
cd "$WT"
git add app/globals.css
git commit -m "refactor(theme): split colors into root/light/dark with no-JS OS fallback"
```

---

## Task 3: Port the source's ModeToggle dropdown

**Files:**
- Create: `components/mode-toggle.tsx`

Dependencies already exist in the target: `components/ui/button.tsx`,
`components/ui/dropdown-menu.tsx`, `lucide-react`, `next-themes`, `next-intl`.
The `ThemeToggle` message namespace already has `label`, `light`, `dark`,
`system`.

- [ ] **Step 1: Create `components/mode-toggle.tsx`**

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Locale-aware light/dark/system theme toggle. Renders a single icon button
 * (sun in light mode, moon in dark) that opens a menu of the three next-themes
 * modes. Selecting an option calls `setTheme`, which next-themes persists to
 * `localStorage`, so the choice survives a refresh. Labels come from the
 * `ThemeToggle` message namespace so the control reads correctly in English and
 * Hebrew (RTL); the trigger carries an accessible name via the visually hidden
 * label since its visible content is icon-only.
 */
export function ModeToggle() {
  const { setTheme } = useTheme()
  const t = useTranslations("ThemeToggle")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">{t("label")}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t("light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t("dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t("system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Verify the DropdownMenuTrigger `render` API matches this project**

The source uses Base UI's `render` prop on `DropdownMenuTrigger`. Confirm the
target's `components/ui/dropdown-menu.tsx` exports `DropdownMenuTrigger` that
accepts `render` (Base UI) rather than `asChild` (Radix):

```bash
cd "$WT"
grep -nE "DropdownMenuTrigger|render|asChild|@base-ui|@radix" components/ui/dropdown-menu.tsx | head
```

If it uses `asChild` (Radix) instead of `render` (Base UI), adapt the trigger to:
`<DropdownMenuTrigger asChild><Button ...>...</Button></DropdownMenuTrigger>`.
Otherwise keep the `render` form. (The target is a Base UI project - the existing
`language-switcher.tsx` uses `render` on a `DropdownMenuTrigger`, so `render` is
expected to be correct. Mirror whatever `language-switcher.tsx` does.)

- [ ] **Step 3: Typecheck + lint**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -5
```

Expected: typecheck clean; lint still shows only the 3 pre-existing errors, no
new findings for the new file.

- [ ] **Step 4: Commit**

```bash
cd "$WT"
git add components/mode-toggle.tsx
git commit -m "feat(theme): add Light/Dark/System ModeToggle dropdown"
```

---

## Task 4: Swap ModeToggle into the header and remove ThemeToggle

**Files:**
- Modify: `components/site-header.tsx`
- Delete: `components/theme-toggle.tsx`

- [ ] **Step 1: Update the header import and usage**

In `components/site-header.tsx`, change the import line:

```tsx
import { ThemeToggle } from "@/components/theme-toggle"
```

to:

```tsx
import { ModeToggle } from "@/components/mode-toggle"
```

and change the usage `<ThemeToggle />` to `<ModeToggle />`.

- [ ] **Step 2: Confirm no other references, then delete the old file**

```bash
cd "$WT"
grep -rn "ThemeToggle\|theme-toggle" app components --include="*.tsx"
```

Expected: NO matches (only the message-namespace key `ThemeToggle` in
`messages/*.json` remains, which is correct - ModeToggle reuses it). If any
`.tsx` still imports it, fix that first. Then:

```bash
cd "$WT"
git rm components/theme-toggle.tsx
```

- [ ] **Step 3: Typecheck + lint + build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -5
rm -rf .next && npm run build 2>&1 | tail -8
```

Expected: typecheck clean; lint now shows **2 errors** (the theme-toggle.tsx
error is gone because the file is deleted; carousel.tsx + use-mobile.ts remain);
build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "$WT"
git add components/site-header.tsx
git commit -m "feat(theme): use ModeToggle in header, remove old ThemeToggle"
```

---

## Task 5: Final verification and finish branch

**Files:** none (verification only)

- [ ] **Step 1: All gates from a clean build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
npm run lint:i18n 2>&1 | tail -2
npm run typecheck 2>&1 | tail -2
npm run lint 2>&1 | tail -3
rm -rf .next && npm run build 2>&1 | tail -10
```

Expected: i18n in sync (78 keys); typecheck clean; lint shows 2 errors
(carousel.tsx, use-mobile.ts); build succeeds.

- [ ] **Step 2: Runtime smoke - class emission + no-JS fallback**

```bash
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
cd "$WT"
(PORT=3213 npm run start >/tmp/theme-smoke.log 2>&1 &)
sleep 6
echo "=== home page served (200) ==="
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3213/en
echo "=== :root, @media dark, .light, .dark all present in served CSS ==="
CSS_URL=$(curl -s http://localhost:3213/en | grep -oE '/_next/static/[^"]+\.css' | head -1)
echo "css: $CSS_URL"
curl -s "http://localhost:3213$CSS_URL" | grep -oE "prefers-color-scheme:dark|\.light\{|\.dark\{|:root\{" | sort -u
pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null
echo "stopped"
```

Expected: 200; the served CSS contains `:root{`, `prefers-color-scheme:dark`,
`.light{`, and `.dark{` (minified, so braces are tight). This proves all four
layers shipped. (Toggling light/dark/system and the no-JS visual check are best
confirmed in a browser by the reviewer; the CSS presence check is the automated
proxy.)

- [ ] **Step 3: Finish the branch**

Use the superpowers:finishing-a-development-branch skill: squash-merge the
worktree branch into local `main`, run the dependency reconcile check
(`git diff --name-only HEAD~1 HEAD -- package.json package-lock.json`; no deps
were added, so none expected), re-run the gates on `main` (remember to remove the
worktree FIRST so it does not pollute scans, though the `.claude/worktrees/**`
ESLint ignore already guards lint), then remove the worktree and branch. Do NOT
push `main` unless Tal explicitly asks.

---

## Self-Review Notes

- **Spec coverage:** provider `.light` class (Task 1), `:root`/`@media`/`.light`/
  `.dark` restructure with no-JS OS fallback and correct source order (Task 2),
  ModeToggle port (Task 3), swap + remove ThemeToggle (Task 4), verification +
  finish (Task 5). Every spec section maps to a task.
- **Colors unchanged:** Task 2 embeds the exact current oklch values verbatim;
  the light set appears in `:root` and `.light`, the dark set in the media query
  and `.dark`. No value is altered.
- **Specificity correctness:** all selectors are (0,1,0); source order (`:root` ->
  `@media :root` -> `.light` -> `.dark`) makes the JS class win. Step 3 of Task 2
  greps to confirm the order.
- **No test runner:** intentional; gates + runtime CSS-presence smoke are the
  verification surface.
- **Lint baseline shift:** documented - deleting theme-toggle.tsx drops one
  pre-existing error (3 -> 2).
