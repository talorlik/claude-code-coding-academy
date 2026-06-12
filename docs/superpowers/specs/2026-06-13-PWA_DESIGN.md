# PWA Installability and Offline Design - Coding Academy

Port the PWA functionality from `claude-code-ai-coach-assistant` (installable web
app manifest, service worker with offline app-shell and dormant push handlers,
service-worker registration, and a dismissible install affordance), rebranded to
Coding Academy, with the install button positioned responsively in the current
header.

## Goals

- The site is an installable PWA: a valid Web App Manifest with icons, a
  registered service worker, and a custom localized install button.
- Offline navigations fall back to a branded, localized offline page.
- The install button appears in the header from the `sm` breakpoint up and never
  crowds a 390 px phone.
- All copy is localized (EN + HE), catalogs key-identical.
- The PWA assets are covered by the Playwright e2e gate.

## Non-Goals

- No VAPID keys or push-subscribe client flow. The service worker's push +
  notificationclick handlers ship DORMANT (no sender wired yet).
- No real branded icon art - placeholder Coding Academy icons generated now, to
  be swapped later.
- No binding `docs/PWA.md` standard or `CLAUDE.md` section - PWA is a feature,
  not a cross-cutting rule. A `docs/DECISIONS.md` entry records the choices.

## Current State

The target has NO PWA infrastructure: empty `public/` (only `.gitkeep`), no
`lib/pwa`, no `app/manifest.ts`, no `public/sw.js`, no install/SW components, no
`offline` route, no `Pwa` message namespace, no icons. The proxy matcher already
excludes `/sw.js` and `/manifest.webmanifest` (so they serve correctly), the
`Dialog` UI component exists, `sharp` is installed (for icon generation), the
lucide icons (`Download`, `Share`, `X`, `WifiOff`) resolve, and `font-heading`
is defined. The layout already has a `viewport` export with `themeColor`.

## Files Created

### Core PWA lib (`lib/pwa/`)

- `manifest.ts` - `buildManifest()` returning `MetadataRoute.Manifest`, plus
  `THEME_COLOR` / `BACKGROUND_COLOR` / `PWA_START_URL` constants. Rebranded:
  - `name: "Coding Academy"`, `short_name: "Academy"`
  - `description: "A coding learning platform - lessons, practice, and an AI
    assistant. Install Coding Academy for an app-like experience."`
  - `start_url: "/en"`, `scope: "/"`, `display: "standalone"`,
    `orientation: "portrait"`, `lang: "en-US"`, `dir: "ltr"`
  - `categories: ["education", "productivity"]`
  - `theme_color: "#ffffff"`, `background_color: "#0a0a0a"` (current light/dark
    `--background`)
  - icons: `/icons/icon-192.png` (192, any), `/icons/icon-512.png` (512, any),
    `/icons/icon-maskable-512.png` (512, maskable)
- `register.ts` - `registerAppServiceWorker(globals)` + `SERVICE_WORKER_URL`,
  copied verbatim (dependency-injected, fire-and-forget, no-ops when
  unsupported).
- `install.ts` - `isStandalone()`, `isIos()`, `readInstallGlobals()`, copied
  verbatim (pure detection over injectable globals).

### Manifest route

- `app/manifest.ts` - default export delegating to `buildManifest()`. Lives at
  the app root (locale-independent URL); served at `/manifest.webmanifest`.

### Service worker

- `public/sw.js` - ported with BOTH halves:
  - PWA offline-shell: `install` precaches `["/en/offline", "/he/offline",
    "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]`
    (best-effort `Promise.allSettled`); `activate` purges old caches + claims;
    `fetch` is network-first for navigations only, falling back to the cached
    locale-matched offline document.
  - Push (dormant): `push` shows a notification from the JSON payload;
    `notificationclick` focuses or opens the deep link. References `/icon.png`.
  - Security: only same-origin GET navigations + the listed static shell are
    cached; `/api/*`, auth, Supabase, and non-GET requests are never cached.
  - Cache version: `academy-pwa-v1`. Plain JS (runs in the SW global scope).

### Components

- `components/service-worker-register.tsx` - `"use client"`, mounts once,
  registers `/sw.js` after first paint via `registerAppServiceWorker(navigator)`.
  Renders `null`. Copied verbatim.
- `components/install-prompt.tsx` - the install affordance, copied verbatim:
  Chromium `beforeinstallprompt` -> Install button calling `prompt()`; iOS ->
  Add-to-Home-Screen instructions in a `Dialog`; hides when standalone;
  dismissible for the session. Copy from the `Pwa.install` namespace. Accepts a
  `className` for the host layout.

### Offline route

- `app/[locale]/offline/page.tsx` - localized offline fallback, copied verbatim:
  `WifiOff` icon, one `<h1>`, a "Try again" link, `Pwa.offline` copy,
  `setRequestLocale` for static rendering, `robots: noindex`.

### Icons

- `scripts/generate-pwa-icons.mjs` - a one-off `sharp` script that renders
  placeholder Coding Academy icons (solid `#0a0a0a` background, centered "CA"
  monogram in `#ffffff`) at the required sizes and writes:
  - `public/icons/icon-192.png` (192x192)
  - `public/icons/icon-512.png` (512x512)
  - `public/icons/icon-maskable-512.png` (512x512, art inside the maskable safe
    zone - ~80% centered)
  - `public/icons/apple-touch-icon-180.png` (180x180)
  - `public/icon.png` (192x192, the notification icon the SW references)

  The script is committed so icons can be regenerated; the generated PNGs are
  also committed (they are runtime assets, not build artifacts).

### Localization

- Add the `Pwa` namespace to BOTH `messages/en-US.json` and `messages/he-IL.json`
  (key-identical), rebranded to Coding Academy:
  - `Pwa.install`: `button`, `dismiss`, `iosTitle`, `iosIntro`, `iosStep1`,
    `iosStep2`, `iosStep3`
  - `Pwa.offline`: `title`, `description`, `retry`

## Wiring Changes

### `app/[locale]/layout.tsx`

- The layout has NO `metadata` export yet (only `viewport`). ADD a `metadata`
  export with:
  - `manifest: "/manifest.webmanifest"`
  - `appleWebApp: { capable: true, statusBarStyle: "default", title: "Academy" }`
  - `icons: { apple: "/icons/apple-touch-icon-180.png" }` - the apple touch icon
    only. `app/favicon.ico` already exists and Next serves it automatically, so
    the standard favicon is not re-declared here.
- Mount `<ServiceWorkerRegister />` inside the providers (alongside the existing
  `SkipLink` / `SiteHeader`).
- The existing `viewport.themeColor` stays unchanged.

### `components/site-header.tsx`

- Render `<InstallPrompt className="hidden sm:flex" />` in the right-side controls
  cluster (next to `LanguageSwitcher` / `ModeToggle`). `hidden sm:flex` shows it
  from `sm` up so it never crowds a 390 px phone. This is the responsive
  positioning - adapted to the current non-wrapping header (the source's
  `basis-full` wrap assumed the old wrapping header, which no longer exists).

## Standards Compliance

- Responsive: install button hidden below `sm`; the header must keep passing the
  no-overflow e2e at 390/768/1280.
- Accessibility: dismiss control has `aria-label`; decorative icons `aria-hidden`;
  offline page has one `<main id="main-content">`-equivalent landmark and one
  `<h1>`. (The ported offline page uses `<main>` + `<h1>`; add `id="main-content"`
  to match the project's skip-link target.)
- i18n: all copy localized in both catalogs, key-identical; `lint:i18n` green.

## Verification

- Gates: `lint:i18n`, `typecheck`, `lint`, `build` green.
- e2e (extend `e2e/responsive.spec.ts` or add `e2e/pwa.spec.ts`):
  - `GET /manifest.webmanifest` returns valid JSON with a non-empty `name` and at
    least one icon.
  - `GET /sw.js` is served (200, JavaScript content).
  - `/en/offline` and `/he/offline` render (the offline `<h1>` is visible; HE is
    `dir="rtl"`).
  - the header has no horizontal overflow at 390/768/1280 with the install
    affordance present (covered by the existing responsive checks; confirm still
    green).
- `docs/DECISIONS.md` entry records: push handlers dormant, placeholder icons,
  install button `hidden sm:flex`.

## Risks

- The `beforeinstallprompt` install button only appears in Chromium when the
  manifest + SW make the app installable and the browser's heuristics fire; it
  cannot be reliably forced in e2e, so the e2e asserts the manifest/SW/offline
  primitives rather than simulating the install event.
- Placeholder icons are not final art; the manifest is valid and installable, but
  the installed app shows the "CA" monogram until real icons replace them.
- The SW push handlers are dormant (no subscribe flow); they are inert until a
  future batch wires VAPID + subscription. Shipping them now keeps a single
  service worker (the app must never register a second, competing worker).
