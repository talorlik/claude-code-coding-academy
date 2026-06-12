# Theme Switching and CSS Structure Design - Coding Academy

Port the light/dark theme-switching approach and the `:root` (common) /
`.light` / `.dark` CSS structure from `claude-code-ai-coach-assistant`, keeping
the target's current color values. Purely structural plus one provider change
and a toggle-control swap; no color changes.

## Goals

- CSS cascade follows a `:root` / `.light` / `.dark` structure:
  - `:root` holds shared color-agnostic tokens (`--radius`, `color-scheme`) AND
    the light color set, which serves as the common base and the no-JS default.
  - `.light` holds the explicit light color set (applied when JS sets the class).
  - `.dark` holds the dark color set.
  - A `prefers-color-scheme: dark` media query gives no-JS visitors OS-aware
    colors.
- Theme switching writes an explicit `.light` or `.dark` class on `<html>`.
- A no-JavaScript visitor still gets correctly-themed colors from their OS
  preference (honors the project's accessibility/no-JS standard).
- The Light / Dark / System dropdown control replaces the current icon button.

## Non-Goals

- No color value changes. The light and dark oklch values stay exactly as they
  are today; they are only relocated.
- No port of the source's brand typography/spacing/shadow token set.
- No change to the `d` hotkey, `@theme inline`, `@layer base`,
  `sr-only-focusable`, or reduced-motion blocks.

## Current State vs. Target

The target's `theme-provider.tsx` already matches the source: `next-themes`,
`attribute="class"`, `defaultTheme="system"`, `enableSystem`,
`disableTransitionOnChange`, and the `d` hotkey. The differences:

1. The provider does NOT pass a `value` map, so next-themes emits only `.dark`
   (light mode gets no class). A `.light` CSS block would therefore never apply.
2. `app/globals.css` puts light colors in `:root` and dark overrides in `.dark`
   (default shadcn pattern). There is no `.light` block.
3. The toggle is a simple light/dark icon button (`theme-toggle.tsx`), not the
   source's Light/Dark/System dropdown.

## Changes

### 1. `components/theme-provider.tsx`

Add the value map so next-themes writes an explicit class in both modes:

```tsx
value={{ light: "light", dark: "dark" }}
```

This is the only change to the provider. The `d` hotkey and all other props
stay.

### 2. `app/globals.css` (structure only; colors unchanged)

The cascade is ordered so that, on equal specificity, source order decides. All
the relevant selectors (`:root`, `.light`, `.dark`) have specificity (0,1,0), so
NO `:not()` is used (a `:root:not(.light):not(.dark)` selector is specificity
(0,3,0) and would wrongly beat a bare `.light`/`.dark` - rejected for that
reason). The blocks appear in this exact source order:

1. `:root` - the common/base layer: `color-scheme: light dark`, `--radius`, and
   the LIGHT color set (the no-JS default). These are the target's current
   `:root` oklch values, kept verbatim. This is also what a no-JS visitor on a
   light OS sees.
2. `@media (prefers-color-scheme: dark) { :root { ...dark colors... } }` - same
   specificity as `:root`, later in source, so a no-JS visitor on a dark OS gets
   the dark set. Values are the target's current `.dark` oklch values.
3. `.light { ...light colors... }` - explicit light class (next-themes writes
   `class="light"`). Same values as `:root`'s light set.
4. `.dark { ...dark colors... }` - explicit dark class. Same values as the
   media-query dark set.

Because `.light`/`.dark` come last in source order at equal specificity, the
JS-applied class always wins over the `prefers-color-scheme` fallback. With JS
off, no class is present, so steps 1-2 govern by OS preference.

This means `:root` doubles as the common layer AND the light/no-JS default - the
light color set is therefore written twice (once in `:root`, once in `.light`).
That duplication is the cost of making no-JS theming work without a `:not()`
selector that would break the JS path. The dark set is likewise written twice
(media query + `.dark`).

The `@theme inline`, `@layer base`, `sr-only-focusable`, and
`prefers-reduced-motion` blocks are not touched.

### 3. `components/mode-toggle.tsx` (new)

Port the source's dropdown ModeToggle: a single icon button (sun/moon) that
opens a `DropdownMenu` with Light / Dark / System items calling `setTheme`.
Labels come from the existing `ThemeToggle` namespace (`label`, `light`, `dark`,
`system`). Dependencies already exist in the target: `components/ui/button.tsx`,
`components/ui/dropdown-menu.tsx`, `lucide-react`, `next-themes`, `next-intl`.

### 4. Remove `components/theme-toggle.tsx`

`mode-toggle.tsx` supersedes it. Update the import in `components/site-header.tsx`
to use `ModeToggle` instead of `ThemeToggle`. Confirm no other file imports
`theme-toggle` (the home page uses the shared header, not the toggle directly).

## No-JS Reconciliation

The project's accessibility standard requires pages work without JavaScript
where feasible. next-themes sets the theme class via a pre-paint script (JS), so
moving colors out of `:root` would leave a no-JS page colorless. The
`:root:not(.light):not(.dark)` + `prefers-color-scheme` fallback resolves this:
colors render correctly with JS off, driven by the OS preference, and the
explicit class wins when JS is on. This improves on the source, which is
JS-required for color.

## Verification

- Gates: `lint:i18n`, `typecheck`, `lint`, `build` all green.
- Runtime: toggling Light/Dark/System updates `<html class>` to
  `light` / `dark` and persists across reload. With JS disabled, the page still
  shows themed colors matching the OS `prefers-color-scheme`.
- Visual: no color change in either mode versus the current build (values are
  byte-identical, only relocated).

## Risk

- Each color set is written twice: the light set in `:root` and `.light`, the
  dark set in the `prefers-color-scheme` media query and `.dark`. This is the
  accepted cost of supporting both class-based theming (JS) and no-JS/OS-aware
  colors WITHOUT a `:not()` selector. A `:root:not(.light):not(.dark)` fallback
  would be specificity (0,3,0) and would beat a bare `.light`/`.dark` (0,1,0),
  breaking the JS path - so it is deliberately avoided.
- Source order is load-bearing: all selectors are specificity (0,1,0), so the
  blocks MUST appear in the order `:root` -> `@media dark :root` -> `.light` ->
  `.dark`. The explicit class blocks come last so the JS-applied class wins on
  equal specificity. The plan fixes this order exactly.
- This diverges slightly from the brainstormed "`:root` = non-color tokens only"
  decision: `:root` now also carries the light set as the no-JS base. This was a
  necessary correction - a color-free `:root` plus a `:not()` fallback does not
  work on CSS specificity. The visible structure (`:root` / `.light` / `.dark`)
  and the kept colors are unchanged.
