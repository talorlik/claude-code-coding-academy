# Bilingual Localization (English + Hebrew) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `claude-code-coding-academy` full English/Hebrew support via `next-intl` with `[locale]` URL-prefix routing, ported from `claude-code-ai-coach-assistant`, with a CI catalog-sync guard so localization is enforced for all future work.

**Architecture:** `next-intl` resolves the active locale from a `[locale]` route segment (`/en`, `/he`). The entire page tree moves under `app/[locale]/`; the root layout becomes a pass-through and the localized layout owns `<html lang dir>` plus `NextIntlClientProvider`. A composed `proxy.ts` runs locale middleware then Supabase session refresh, bypassing `/api` and `/auth`. Message catalogs live in `messages/{en-US,he-IL}.json` and are key-synced by a build-time script.

**Tech Stack:** Next.js 16 (App Router), `next-intl@^4.13.0`, Supabase SSR, TypeScript, Tailwind v4, shadcn/ui (Base UI).

> **No unit-test runner in this project.** Verification gates per task are `npm run typecheck`, `npm run lint`, `npm run lint:i18n`, and (where noted) `npm run build`. Treat "run gate, see it fail, then pass" as the TDD loop.

---

## File Map

**Create:**

- `i18n/routing.ts` — locale prefixes, BCP 47 tags, RTL set, helpers.
- `i18n/request.ts` — per-request locale resolution + catalog load.
- `i18n/navigation.ts` — locale-aware navigation primitives.
- `messages/en-US.json`, `messages/he-IL.json` — catalogs (key-identical).
- `app/[locale]/layout.tsx` — localized document shell.
- `components/language-switcher.tsx` — locale dropdown.
- `scripts/check-i18n-sync.mjs` — catalog key-sync guard.
- `docs/I18N.md` — localization convention reference.

**Move (and localize):**

- `app/page.tsx` → `app/[locale]/page.tsx`.
- `app/chat/page.tsx` → `app/[locale]/chat/page.tsx`.
- `app/chat/chat-client.tsx` → `app/[locale]/chat/chat-client.tsx`.

**Modify:**

- `app/layout.tsx` — reduce to pass-through.
- `next.config.mjs` — wrap with the next-intl plugin.
- `proxy.ts` — compose locale routing + session refresh.
- `lib/supabase/middleware.ts` — `updateSession` gains optional `response?`.
- `package.json` — add `next-intl` dep, `lint:i18n` script, `prebuild` chain.
- `CLAUDE.md` — localization convention section.

---

## Task 1: Install next-intl and wire the Next config

**Files:**

- Modify: `package.json`
- Modify: `next.config.mjs`

- [ ] **Step 1: Add the dependency**

Run:

```bash
npm install next-intl@^4.13.0
```

Expected: `next-intl` appears under `dependencies` in `package.json`; lockfile updates; no peer-dep errors against Next 16 / React 19.

- [ ] **Step 2: Wrap the Next config with the next-intl plugin**

Replace the entire contents of `next.config.mjs` with:

```js
import createNextIntlPlugin from "next-intl/plugin"

// Point the plugin at the request-config module so next-intl can resolve
// messages and the active locale on the server.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withNextIntl(nextConfig)
```

- [ ] **Step 3: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: PASS (config change is JS; no type impact yet). The `./i18n/request.ts` path does not need to exist for typecheck since it is a runtime string.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json next.config.mjs
git commit -m "chore(i18n): add next-intl and wire next config"
```

---

## Task 2: Add the i18n routing, request, and navigation modules

**Files:**

- Create: `i18n/routing.ts`
- Create: `i18n/request.ts`
- Create: `i18n/navigation.ts`

- [ ] **Step 1: Create `i18n/routing.ts`**

```ts
import { defineRouting } from "next-intl/routing"

/**
 * Maps a URL locale prefix to its IETF BCP 47 tag.
 *
 * The app routes under `/en` and `/he` for short, friendly URLs, while the
 * underlying locale identities are `en-US` and `he-IL`. Keeping the prefixes
 * and the full tags separate lets the URLs stay terse without losing the
 * region information that formatting (dates, numbers) depends on.
 */
export const LOCALE_TAGS = {
  en: "en-US",
  he: "he-IL",
} as const

/** A supported URL locale prefix (`"en"` or `"he"`). */
export type Locale = keyof typeof LOCALE_TAGS

/** A supported full locale tag (`"en-US"` or `"he-IL"`). */
export type LocaleTag = (typeof LOCALE_TAGS)[Locale]

/** Locales rendered right-to-left. Hebrew is the only RTL locale here. */
const RTL_LOCALES = new Set<Locale>(["he"])

/**
 * next-intl routing configuration: the supported locale prefixes, the default,
 * and `localePrefix: "always"` so every path carries an explicit locale (`/en`,
 * `/he`). An explicit prefix keeps locale unambiguous for SEO and for the
 * locale-preserving navigation helpers in `i18n/navigation.ts`.
 */
export const routing = defineRouting({
  locales: Object.keys(LOCALE_TAGS) as Locale[],
  defaultLocale: "en",
  localePrefix: "always",
})

/**
 * Returns the BCP 47 tag for a locale prefix (e.g. `"he"` -> `"he-IL"`).
 *
 * @param locale - A supported locale prefix.
 * @returns The full locale tag used for the `lang` attribute and formatting.
 */
export function localeTag(locale: Locale): LocaleTag {
  return LOCALE_TAGS[locale]
}

/**
 * Returns the writing direction for a locale prefix.
 *
 * @param locale - A supported locale prefix.
 * @returns `"rtl"` for right-to-left locales (Hebrew), otherwise `"ltr"`.
 */
export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr"
}

/**
 * Type guard narrowing an arbitrary string to a supported {@link Locale}.
 *
 * @param value - Any string, typically a `[locale]` route segment.
 * @returns `true` when `value` is a supported locale prefix.
 */
export function isSupportedLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value)
}
```

- [ ] **Step 2: Create `i18n/request.ts`**

```ts
import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { localeTag, routing, type Locale } from "./routing"

/**
 * Per-request next-intl configuration. Resolves the active locale from the
 * `[locale]` route segment, falling back to the default when the segment is
 * missing or unsupported, and loads the matching message catalog.
 *
 * Messages are keyed by the full BCP 47 tag (`en-US`, `he-IL`) so the catalog
 * filenames match the locale identities used elsewhere in the app.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: Locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const tag = localeTag(locale)
  const messages = (await import(`../messages/${tag}.json`)).default

  return { locale, messages }
})
```

- [ ] **Step 3: Create `i18n/navigation.ts`**

```ts
import { createNavigation } from "next-intl/navigation"

import { routing } from "./routing"

/**
 * Locale-aware navigation primitives. These are drop-in replacements for the
 * matching `next/navigation` exports that automatically prepend the active
 * locale prefix, so links and redirects preserve the user's language instead of
 * falling back to the default locale.
 *
 * Use these everywhere inside the `app/[locale]` tree in place of
 * `next/link` and `next/navigation`'s `redirect`/`usePathname`/`useRouter`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS. (`request.ts` imports `../messages/en-US.json`; those files arrive in Task 3. The dynamic `import(\`../messages/${tag}.json\`)` is a runtime template string and does not break typecheck.)

- [ ] **Step 5: Commit**

```bash
git add i18n/
git commit -m "feat(i18n): add routing, request, and navigation modules"
```

---

## Task 3: Add the message catalogs

**Files:**

- Create: `messages/en-US.json`
- Create: `messages/he-IL.json`

- [ ] **Step 1: Create `messages/en-US.json`**

```json
{
  "Common": {
    "appName": "Coding Academy",
    "loading": "Loading...",
    "error": {
      "title": "Something went wrong",
      "description": "We could not load this page. Please try again.",
      "retry": "Try again"
    }
  },
  "LanguageSwitcher": {
    "label": "Language",
    "en": "English",
    "he": "Hebrew"
  },
  "ThemeToggle": {
    "label": "Toggle theme",
    "light": "Light",
    "dark": "Dark",
    "system": "System"
  },
  "Nav": {
    "home": "Home",
    "chat": "Chat",
    "signIn": "Sign in",
    "signOut": "Sign out",
    "mainNavigation": "Main navigation",
    "openMenu": "Open navigation menu"
  },
  "Footer": {
    "tagline": "Coding Academy",
    "home": "Home",
    "rights": "© {year} Coding Academy. All rights reserved."
  },
  "Metadata": {
    "home": {
      "siteName": "Coding Academy",
      "title": "Coding Academy",
      "description": "A starter built on Next.js and Supabase. Sign in to start building, or jump straight in."
    }
  },
  "Home": {
    "badge": "claude-code-coding-academy",
    "title": "Coding Academy",
    "description": "A starter built on Next.js and Supabase. Sign in to start building, or jump straight in.",
    "body": "Authentication, database, and edge functions are wired through Supabase. Press <kbd>d</kbd> anywhere to toggle dark mode.",
    "getStarted": "Get Started",
    "signIn": "Sign In"
  },
  "Chat": {
    "metaTitle": "Chat",
    "heading": "Chat",
    "empty": "Ask me anything to get started.",
    "thinking": "Thinking…",
    "error": "Something went wrong.",
    "inputLabel": "Type a message",
    "inputPlaceholder": "Type a message",
    "send": "Send"
  }
}
```

- [ ] **Step 2: Create `messages/he-IL.json`** (identical key tree, Hebrew values)

```json
{
  "Common": {
    "appName": "אקדמיית קוד",
    "loading": "טוען...",
    "error": {
      "title": "משהו השתבש",
      "description": "לא הצלחנו לטעון את הדף הזה. נסו שוב.",
      "retry": "נסו שוב"
    }
  },
  "LanguageSwitcher": {
    "label": "שפה",
    "en": "אנגלית",
    "he": "עברית"
  },
  "ThemeToggle": {
    "label": "החלפת ערכת נושא",
    "light": "בהיר",
    "dark": "כהה",
    "system": "מערכת"
  },
  "Nav": {
    "home": "בית",
    "chat": "צ׳אט",
    "signIn": "התחברות",
    "signOut": "התנתקות",
    "mainNavigation": "ניווט ראשי",
    "openMenu": "פתיחת תפריט הניווט"
  },
  "Footer": {
    "tagline": "אקדמיית קוד",
    "home": "בית",
    "rights": "© {year} אקדמיית קוד. כל הזכויות שמורות."
  },
  "Metadata": {
    "home": {
      "siteName": "אקדמיית קוד",
      "title": "אקדמיית קוד",
      "description": "תבנית התחלה מבוססת Next.js ו-Supabase. התחברו כדי להתחיל לבנות, או היכנסו ישירות."
    }
  },
  "Home": {
    "badge": "claude-code-coding-academy",
    "title": "אקדמיית קוד",
    "description": "תבנית התחלה מבוססת Next.js ו-Supabase. התחברו כדי להתחיל לבנות, או היכנסו ישירות.",
    "body": "אימות, מסד נתונים ו-edge functions מחוברים דרך Supabase. הקישו <kbd>d</kbd> בכל מקום כדי להחליף למצב כהה.",
    "getStarted": "בואו נתחיל",
    "signIn": "התחברות"
  },
  "Chat": {
    "metaTitle": "צ׳אט",
    "heading": "צ׳אט",
    "empty": "שאלו אותי כל דבר כדי להתחיל.",
    "thinking": "חושב…",
    "error": "משהו השתבש.",
    "inputLabel": "הקלידו הודעה",
    "inputPlaceholder": "הקלידו הודעה",
    "send": "שליחה"
  }
}
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en-US.json','utf8')); JSON.parse(require('fs').readFileSync('messages/he-IL.json','utf8')); console.log('valid')"`
Expected: prints `valid`.

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat(i18n): seed en-US and he-IL message catalogs"
```

---

## Task 4: Add the catalog key-sync guard and wire it into the build

**Files:**

- Create: `scripts/check-i18n-sync.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/check-i18n-sync.mjs`**

```js
#!/usr/bin/env node
// Fails the build if the en-US and he-IL message catalogs do not have an
// identical set of (dotted) key paths. This is the enforcement mechanism that
// keeps localization complete as the app grows: every key added to one catalog
// must be added to the other. Leaf type mismatches (object vs string) are also
// reported, since they mean the catalogs diverged structurally.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const messagesDir = join(here, "..", "messages")

/** The two catalogs that must stay in lockstep. */
const CATALOGS = ["en-US.json", "he-IL.json"]

/**
 * Collects every leaf key path in an object as a dotted string
 * (e.g. `Common.error.title`). Objects recurse; everything else is a leaf.
 */
function collectKeyPaths(value, prefix, out) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      const next = prefix ? `${prefix}.${key}` : key
      collectKeyPaths(value[key], next, out)
    }
  } else {
    out.add(prefix)
  }
  return out
}

function load(file) {
  const raw = readFileSync(join(messagesDir, file), "utf8")
  return JSON.parse(raw)
}

const [enFile, heFile] = CATALOGS
const enKeys = collectKeyPaths(load(enFile), "", new Set())
const heKeys = collectKeyPaths(load(heFile), "", new Set())

const missingInHe = [...enKeys].filter((k) => !heKeys.has(k)).sort()
const missingInEn = [...heKeys].filter((k) => !enKeys.has(k)).sort()

if (missingInHe.length === 0 && missingInEn.length === 0) {
  console.log(`i18n catalogs in sync (${enKeys.size} keys).`)
  process.exit(0)
}

if (missingInHe.length > 0) {
  console.error(`Keys in ${enFile} but missing from ${heFile}:`)
  for (const k of missingInHe) console.error(`  - ${k}`)
}
if (missingInEn.length > 0) {
  console.error(`Keys in ${heFile} but missing from ${enFile}:`)
  for (const k of missingInEn) console.error(`  - ${k}`)
}
process.exit(1)
```

- [ ] **Step 2: Add the script and prebuild chain to `package.json`**

In the `scripts` block, add a `lint:i18n` entry and chain it into `prebuild`. The existing `prebuild` is `"node scripts/guard-no-middleware.mjs"`; change it to run both guards:

```json
    "prebuild": "node scripts/guard-no-middleware.mjs && node scripts/check-i18n-sync.mjs",
    "lint:i18n": "node scripts/check-i18n-sync.mjs",
```

Leave all other scripts unchanged.

- [ ] **Step 3: Verify the guard passes on the in-sync catalogs**

Run: `npm run lint:i18n`
Expected: prints `i18n catalogs in sync (NN keys).` and exits 0.

- [ ] **Step 4: Verify the guard fails on a deliberate mismatch**

Run:

```bash
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('messages/he-IL.json','utf8'));delete m.Chat.send;fs.writeFileSync('/tmp/he-broken.json',JSON.stringify(m,null,2))" && cp messages/he-IL.json /tmp/he-IL.backup.json && cp /tmp/he-broken.json messages/he-IL.json && npm run lint:i18n; echo "exit=$?"; cp /tmp/he-IL.backup.json messages/he-IL.json
```

Expected: prints `Keys in en-US.json but missing from he-IL.json:` listing `Chat.send`, then `exit=1`. The final `cp` restores the catalog. Confirm `git status` shows `messages/he-IL.json` unmodified after restore.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-i18n-sync.mjs package.json
git commit -m "feat(i18n): add catalog key-sync guard to the build"
```

---

## Task 5: Extend updateSession to accept a base response

**Files:**

- Modify: `lib/supabase/middleware.ts`

- [ ] **Step 1: Rewrite `updateSession` to take an optional response**

Replace the function signature and the first line of the body. Change the JSDoc and signature from the single-arg form to:

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** App sections that require a signed-in user. Extend as the app grows. */
const PROTECTED_SEGMENTS = ["profile", "dashboard"] as const

/**
 * Refreshes the Supabase session on every request and enforces route
 * protection. Auth cookies are written onto the response so a refreshed session
 * travels back to the browser.
 *
 * Protected routes are an allowlist so new public pages are not accidentally
 * gated. Everything not under a protected segment (home, login, the auth
 * handlers, the API) is public.
 *
 * @param request - The incoming request.
 * @param response - Optional base response to write cookies onto. The proxy
 *   passes the next-intl locale-routing response here so the locale rewrite
 *   headers and the refreshed auth cookies travel back on one response. When
 *   omitted, a fresh pass-through response is used.
 */
export async function updateSession(
  request: NextRequest,
  response?: NextResponse,
) {
  const supabaseResponse = response ?? NextResponse.next({ request })
```

Leave the rest of the function body (the `createServerClient` call, the `getUser` call, the protected-segment redirect, and `return supabaseResponse`) exactly as-is.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS. The existing single-arg call in `proxy.ts` still type-checks because `response` is optional.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/middleware.ts
git commit -m "feat(i18n): let updateSession write onto a provided response"
```

---

## Task 6: Compose the proxy (locale routing + session refresh)

**Files:**

- Modify: `proxy.ts`

- [ ] **Step 1: Replace `proxy.ts` with the composed version**

```ts
import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"
import { routing } from "@/i18n/routing"

// Next.js 16+ proxy convention (replaces the deprecated `middleware` file).
// The file must be named `proxy.ts` and export a function named `proxy`.
//
// This proxy COMPOSES two concerns into one response:
//   1. next-intl locale routing (`/` -> `/en`, unsupported locale -> default,
//      locale prefix enforcement and detection).
//   2. Supabase session refresh + route protection (`updateSession`).
//
// The locale middleware runs first. On a redirect (e.g. `/` -> `/en`) its
// response is returned as-is; no session refresh is needed for a bounce. On a
// normal pass-through (including next-intl's internal rewrite to `/[locale]/…`)
// its response becomes the base that `updateSession` writes auth cookies onto,
// so locale headers and refreshed session cookies travel together.
const handleI18nRouting = createMiddleware(routing)

/** Path prefixes that must bypass locale routing: API and Supabase auth handlers. */
function bypassesLocale(pathname: string): boolean {
  return pathname.startsWith("/api") || pathname.startsWith("/auth")
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes and the Supabase auth callback/sign-out handlers are not
  // localized. Skip locale routing for them but still refresh the session so
  // the chat API and auth handlers see a current user.
  if (bypassesLocale(pathname)) {
    return await updateSession(request)
  }

  const i18nResponse = handleI18nRouting(request)

  // A redirect (3xx) means next-intl is steering the browser to a locale URL;
  // honor it without a session refresh on this throwaway request.
  if (i18nResponse.status >= 300 && i18nResponse.status < 400) {
    return i18nResponse
  }

  // Pass-through (status 200, typically carrying an internal rewrite to the
  // `[locale]` segment): refresh the session onto this same response so the
  // locale rewrite and auth cookies are preserved together.
  return await updateSession(request, i18nResponse as NextResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (a PWA/push service worker, if added later; must be served at the
     *   root scope, never locale-redirected)
     * - manifest.webmanifest (the Web App Manifest, if added later; a locale
     *   redirect would make it unreachable)
     * - image files
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS. (`@/i18n/routing` and `@/lib/supabase/middleware` both resolve; `updateSession` accepts the optional second arg from Task 5.)

- [ ] **Step 3: Verify the no-middleware guard still passes**

Run: `npm run guard:proxy`
Expected: PASS (the guard blocks a `middleware.ts` file; we only edited `proxy.ts`).

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "feat(i18n): compose locale routing with session refresh in proxy"
```

---

## Task 7: Split the layouts and add the localized document shell

**Files:**

- Modify: `app/layout.tsx`
- Create: `app/[locale]/layout.tsx`

- [ ] **Step 1: Reduce the root layout to a pass-through**

Replace the entire contents of `app/layout.tsx` with:

```tsx
import "./globals.css"

/**
 * Root layout. The `<html>` and `<body>` elements live in the localized layout
 * (`app/[locale]/layout.tsx`) so the `lang` and `dir` attributes can reflect the
 * active locale. This root simply forwards children; Next.js still requires a
 * root layout to exist even when a nested layout provides the document shell.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
```

- [ ] **Step 2: Create `app/[locale]/layout.tsx`**

This keeps the project's existing Inter + Geist_Mono fonts and `ThemeProvider`, and adds the localized shell. (No `SiteHeader`/`SiteFooter`/`ServiceWorkerRegister` — those do not exist in this project; the language switcher is placed by the pages/header as the app grows.)

```tsx
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { Geist_Mono, Inter } from "next/font/google"
import { notFound } from "next/navigation"

import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import {
  localeDirection,
  localeTag,
  routing,
  type Locale,
} from "@/i18n/routing"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

/**
 * Pre-render a static page tree for every supported locale so locale routes are
 * generated at build time rather than on demand.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * Localized document shell. Owns `<html>`/`<body>` so `lang` carries the full
 * BCP 47 tag (`en-US`, `he-IL`) and `dir` flips to `rtl` for Hebrew. Wraps the
 * tree in `NextIntlClientProvider` so client components can read translations,
 * and validates the `[locale]` segment, 404-ing on unsupported values.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Opt into static rendering for this locale before any next-intl hook runs.
  setRequestLocale(locale as Locale)

  return (
    <html
      lang={localeTag(locale as Locale)}
      dir={localeDirection(locale as Locale)}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

> Do not commit yet — the app pages still live at the old paths and would now have no page under `app/[locale]`. Build is verified after Task 8. Proceed directly.

---

## Task 8: Move and localize the home page

**Files:**

- Delete: `app/page.tsx`
- Create: `app/[locale]/page.tsx`

- [ ] **Step 1: Move the file**

Run:

```bash
git mv app/page.tsx app/[locale]/page.tsx
```

- [ ] **Step 2: Localize `app/[locale]/page.tsx`**

Replace its entire contents with:

```tsx
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function Page() {
  const t = await getTranslations("Home")

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between p-6">
        <span className="font-mono text-sm font-medium">{t("badge")}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">{t("title")}</CardTitle>
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
    </div>
  )
}
```

Notes for the engineer:

- `getTranslations` is the server-component translation reader (the page is a
  Server Component).
- `t.rich` renders the `<kbd>d</kbd>` markup embedded in the `Home.body`
  message; the `kbd` callback maps the `<kbd>` tag in the catalog string to a
  real element.
- `Link` is imported from `@/i18n/navigation`, so `/login` is automatically
  prefixed with the active locale (`/en/login`, `/he/login`).

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx "app/[locale]/layout.tsx" "app/[locale]/page.tsx"
git commit -m "feat(i18n): localized layout shell and home page under [locale]"
```

---

## Task 9: Move and localize the chat page

**Files:**

- Delete: `app/chat/page.tsx`, `app/chat/chat-client.tsx`
- Create: `app/[locale]/chat/page.tsx`, `app/[locale]/chat/chat-client.tsx`

- [ ] **Step 1: Move the files**

Run:

```bash
git mv app/chat/page.tsx "app/[locale]/chat/page.tsx" && git mv app/chat/chat-client.tsx "app/[locale]/chat/chat-client.tsx"
```

(`app/chat/` is now empty; `git mv` leaves no directory entry.)

- [ ] **Step 2: Localize `app/[locale]/chat/page.tsx`**

Replace its entire contents with:

```tsx
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ChatClient } from "./chat-client"

// A chat surface should not be search-indexed.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Chat")
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  }
}

export default function ChatPage() {
  return <ChatClient />
}
```

- [ ] **Step 3: Localize `app/[locale]/chat/chat-client.tsx`**

Replace its entire contents with:

```tsx
"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

/** Reads the concatenated text of a UI message's text parts. */
function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

/**
 * Interactive chat. The model call lives behind `/api/chat` (the server route
 * is the trust boundary); this component only renders messages and posts new
 * ones via `useChat`.
 */
export function ChatClient() {
  const t = useTranslations("Chat")
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const isStreaming = status === "streaming" || status === "submitted"

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <div>
      <header>{t("heading")}</header>

      <ScrollArea>
        <div>
          {messages.length === 0 ? (
            <p>{t("empty")}</p>
          ) : (
            messages.map((message) => (
              <div key={message.id}>
                <Card>
                  <CardContent>{textOf(message)}</CardContent>
                </Card>
              </div>
            ))
          )}
          {isStreaming && <p>{t("thinking")}</p>}
          {error != null && <p role="alert">{t("error")}</p>}
        </div>
      </ScrollArea>

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
    </div>
  )
}
```

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/chat/"
git commit -m "feat(i18n): localize chat page and client under [locale]"
```

---

## Task 10: Add the language switcher

**Files:**

- Create: `components/language-switcher.tsx`

- [ ] **Step 1: Create `components/language-switcher.tsx`** (verbatim from source; deps already present)

```tsx
"use client"

import { useLocale, useTranslations } from "next-intl"
import { Check, Languages } from "lucide-react"

import { Link, usePathname } from "@/i18n/navigation"
import { routing, type Locale } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Icon-triggered locale switcher. It links to the current pathname under each
 * supported locale, so switching language keeps the visitor on the equivalent
 * route (`/en/login` <-> `/he/login`). `usePathname` from the locale-aware
 * navigation returns the path without its locale prefix, and {@link Link}
 * re-applies the target locale, so no manual prefix manipulation is needed.
 */
export function LanguageSwitcher() {
  const pathname = usePathname()
  const active = useLocale() as Locale
  const t = useTranslations("LanguageSwitcher")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon">
            <Languages aria-hidden />
            <span className="sr-only">{t("label")}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {routing.locales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              render={
                <Link
                  href={pathname}
                  locale={locale}
                  aria-current={locale === active ? "true" : undefined}
                />
              }
              className={cn(
                "justify-between",
                locale === active && "font-semibold",
              )}
            >
              {t(locale)}
              {locale === active ? <Check aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Place the switcher on the home page header**

In `app/[locale]/page.tsx`, import the switcher and render it next to the theme toggle. Change the import block to add:

```tsx
import { LanguageSwitcher } from "@/components/language-switcher"
```

and change the header to:

```tsx
      <header className="flex items-center justify-between p-6">
        <span className="font-mono text-sm font-medium">{t("badge")}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/language-switcher.tsx "app/[locale]/page.tsx"
git commit -m "feat(i18n): add language switcher and place it on the home page"
```

---

## Task 11: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Run the i18n sync guard**

Run: `npm run lint:i18n`
Expected: `i18n catalogs in sync (NN keys).`, exit 0.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds. `prebuild` runs both guards first (they pass). Output shows the `[locale]` routes prerendered for `en` and `he` (e.g. `/[locale]` and `/[locale]/chat` listed; `generateStaticParams` produces both).

- [ ] **Step 3: Manual route check**

Run: `npm run start` in one shell, then in another:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/en
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/he
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/en/chat
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/he/chat
curl -s http://localhost:3000/he | grep -o 'dir="rtl"' | head -1
```

Expected: `/` returns a 307 redirecting to `/en`; `/en`, `/he`, `/en/chat`, `/he/chat` return 200; the Hebrew page contains `dir="rtl"`. Stop the server afterward.

- [ ] **Step 4: Verify API/auth bypass**

With `npm run start` running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/chat -H 'content-type: application/json' -d '{"messages":[]}'
```

Expected: a non-redirect status (the request reaches the API route rather than being bounced to `/en/api/chat`). Any 4xx from the route's own validation is fine; a 307 to a locale URL is a failure.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

If steps 1-4 required no changes, there is nothing to commit. Otherwise:

```bash
git add -A
git commit -m "fix(i18n): build verification adjustments"
```

---

## Task 12: Document the localization convention

**Files:**

- Create: `docs/I18N.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create `docs/I18N.md`**

```markdown
# Localization

This project ships English (`en` / `en-US`) and Hebrew (`he` / `he-IL`). Both
locales are first-class: every user-facing page and component must work in both.

## Architecture

- `next-intl` with `[locale]` URL-prefix routing. Every route is prefixed:
  `/en/...` and `/he/...`. `/` redirects to `/en`.
- `i18n/routing.ts` defines the locales, the default, the BCP 47 tag mapping,
  and `localeDirection` (Hebrew is RTL).
- `i18n/request.ts` resolves the active locale per request and loads the
  catalog.
- `i18n/navigation.ts` exports locale-aware `Link`, `redirect`, `usePathname`,
  `useRouter`, `getPathname`.
- The page tree lives under `app/[locale]/`. `app/layout.tsx` is a pass-through;
  `app/[locale]/layout.tsx` owns `<html lang dir>` and `NextIntlClientProvider`.
- `proxy.ts` composes locale routing with the Supabase session refresh. `/api`
  and `/auth` bypass locale routing.
- Catalogs: `messages/en-US.json`, `messages/he-IL.json`.

## Rules for new work

1. New pages go under `app/[locale]/`. Never add a page at `app/` root (except
   `app/api/*` and `app/auth/*`, which are not localized).
2. No hardcoded user-facing strings. Use `useTranslations` (Client Components)
   or `getTranslations` (Server Components). Add the string to both catalogs.
3. Both catalogs must have an identical key set. `npm run lint:i18n` enforces
   this and runs in `prebuild`.
4. Inside the app tree, import navigation from `@/i18n/navigation`, not
   `next/link` or `next/navigation`, so links preserve the active locale.
5. Hebrew is RTL. Prefer Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`,
   `pe-*`, `text-start`, `text-end`) over physical (`ml-*`, `text-left`) so
   layout flips correctly. `dir` is set on `<html>` automatically.
6. For messages with embedded markup, use `t.rich` with tag callbacks.
```

- [ ] **Step 2: Add a localization section to `CLAUDE.md`**

Append this section to `CLAUDE.md`:

```markdown
## Localization (English + Hebrew)

This project fully supports English and Hebrew and that support must be carried
through all future work. Before adding any user-facing UI, read `docs/I18N.md`.

Non-negotiables:

- New pages live under `app/[locale]/` (not `app/` root). `app/api/*` and
  `app/auth/*` are the only non-localized trees.
- No hardcoded user-facing strings. Use `getTranslations`/`useTranslations` and
  add every key to BOTH `messages/en-US.json` and `messages/he-IL.json`.
- Catalogs must stay key-identical; `npm run lint:i18n` (run in `prebuild`)
  fails the build otherwise.
- Use the `@/i18n/navigation` helpers instead of `next/link` /
  `next/navigation` inside the app tree.
- Hebrew is RTL: prefer Tailwind logical utilities so layout mirrors correctly.
```

- [ ] **Step 3: Verify the doc and the guard**

Run: `npm run lint:i18n`
Expected: still in sync (docs do not change catalogs).

- [ ] **Step 4: Commit**

```bash
git add docs/I18N.md CLAUDE.md
git commit -m "docs(i18n): document the bilingual localization convention"
```

---

## Done Criteria

- `npm run typecheck`, `npm run lint`, `npm run lint:i18n`, and `npm run build`
  all pass.
- `/` redirects to `/en`; `/en`, `/he`, `/en/chat`, `/he/chat` return 200.
- Hebrew routes render `dir="rtl"`; the language switcher round-trips between
  locales on the same path.
- `/api/chat` and `/auth/*` are not locale-redirected and the session still
  refreshes.
- `CLAUDE.md` and `docs/I18N.md` document the convention; the sync guard runs in
  `prebuild`.
