# Bilingual Localization Design (English + Hebrew)

## Goal

Give `claude-code-coding-academy` full English and Hebrew support, ported from
the localization implementation in `claude-code-ai-coach-assistant`. The
mechanism must be durable so every future page and component is localized by
default.

## Decisions

- **Catalog scope:** mechanism plus reusable namespaces only. Fitness-domain
  namespaces from the source are not copied.
- **URL strategy:** same `[locale]` prefix routing as the source. URLs carry an
  explicit `/en` or `/he` prefix.
- **Enforcement:** documentation plus a CI key-sync check between catalogs.

## Source Architecture (reference)

The source app (`next-intl@^4.13.0`) localizes via:

- An `i18n/` module: `routing.ts` (locale prefixes -> BCP 47 tags, RTL set,
  helpers), `request.ts` (per-request locale resolution + catalog load),
  `navigation.ts` (locale-aware navigation primitives).
- `next.config.mjs` wrapped with `createNextIntlPlugin("./i18n/request.ts")`.
- The entire app tree under `app/[locale]/`, with a pass-through root
  `app/layout.tsx` and a `app/[locale]/layout.tsx` that owns `<html lang dir>`,
  `NextIntlClientProvider`, and `generateStaticParams`.
- `app/api/*` and `app/auth/*` kept at the root, outside locale routing.
- A `proxy.ts` that composes `next-intl/middleware` with the Supabase
  `updateSession`, bypassing locale routing for `/api` and `/auth`.
- Message catalogs at `messages/en-US.json` and `messages/he-IL.json`.
- A `components/language-switcher.tsx` dropdown.

## Target Plan

### Files copied from source (paths identical)

- `i18n/routing.ts` - verbatim. Locales `en`/`he`, default `en`, tags
  `en-US`/`he-IL`, `he` marked RTL. Exports `LOCALE_TAGS`, `Locale`,
  `LocaleTag`, `routing`, `localeTag`, `localeDirection`, `isSupportedLocale`.
- `i18n/request.ts` - verbatim. Resolves locale from the `[locale]` segment,
  falls back to default, imports `../messages/${tag}.json`.
- `i18n/navigation.ts` - verbatim. `Link`, `redirect`, `usePathname`,
  `useRouter`, `getPathname` from `createNavigation(routing)`.
- `components/language-switcher.tsx` - verbatim. Dependencies (`dropdown-menu`,
  `button`) already exist in the target.

### Files modified

- `next.config.mjs` - wrap the existing config object with
  `createNextIntlPlugin("./i18n/request.ts")`. The target config has no
  `outputFileTracingIncludes`, so the wrap is clean.
- `proxy.ts` - rewrite to compose locale routing with session refresh:
  - `handleI18nRouting = createMiddleware(routing)`.
  - `bypassesLocale(pathname)` true for `/api` and `/auth`; those call
    `updateSession(request)` directly.
  - Otherwise run `handleI18nRouting`; on a 3xx return it as-is; on pass-through
    call `updateSession(request, i18nResponse)`.
  - Extend the `config.matcher` to also exclude `sw.js` and
    `manifest.webmanifest` (harmless now, correct if PWA is added later).
- `lib/supabase/middleware.ts` - extend `updateSession` to accept an optional
  `response?: NextResponse` base, mirroring the source signature
  `updateSession(request, response?)`. When provided, auth cookies are written
  onto that response instead of a fresh `NextResponse.next`. Backward
  compatible: the single-arg call site keeps working.
- `app/layout.tsx` - reduce to a pass-through (`return children`). The document
  shell moves to the localized layout.

### Files created

- `app/[locale]/layout.tsx` - localized document shell. Owns `<html>` with
  `lang={localeTag(locale)}` and `dir={localeDirection(locale)}`,
  `suppressHydrationWarning`, the existing target font stack (Inter +
  Geist_Mono via `next/font`), `NextIntlClientProvider`, `ThemeProvider`, and
  `generateStaticParams` over `routing.locales`. Validates the `[locale]`
  segment and `notFound()`s on unsupported values; calls `setRequestLocale`
  before any next-intl hook for static rendering.
- `messages/en-US.json` and `messages/he-IL.json` - identical key trees.
  Namespaces: `Common`, `LanguageSwitcher`, `ThemeToggle`, `Nav`, `Footer`,
  `Metadata`, plus `Home` and `Chat` covering the strings currently hardcoded
  in this project. Text rewritten for "Coding Academy", not "Studio Itai".
- `scripts/check-i18n-sync.mjs` - loads both catalogs, recursively collects the
  full set of dotted key paths from each, and exits non-zero listing any key
  present in one file but not the other. `set -euo`-equivalent strictness; no
  external deps.
- `docs/I18N.md` (referenced from `CLAUDE.md`) and a localization section in
  `CLAUDE.md` documenting the convention.

### Files moved

- `app/page.tsx` -> `app/[locale]/page.tsx`, then localized: hardcoded strings
  ("Coding Academy", the card description, "Get Started", "Sign In", etc.)
  replaced with `useTranslations("Home")`. Internal links use the locale-aware
  `Link` from `i18n/navigation`.
- `app/chat/page.tsx` -> `app/[locale]/chat/page.tsx` and
  `app/chat/chat-client.tsx` -> `app/[locale]/chat/chat-client.tsx`, localized
  similarly (`Chat` namespace; metadata title via `getTranslations`).

### Files NOT copied

Fitness-domain catalog namespaces (Onboarding, MyPlan, Trainer\*, Reminders,
Pwa, About, Contact), source PWA/manifest/push localization, Oswald/Poppins
fonts, `@marsidev/react-turnstile`.

### Dependency

Add `next-intl@^4.13.0` to `package.json` (same pin as the source).

## Catalog Seed (English; Hebrew mirrors the key tree)

- `Common`: `appName` ("Coding Academy"), `loading`, `error.{title,description,retry}`.
- `LanguageSwitcher`: `label`, `en` ("English"), `he` ("Hebrew" / Hebrew text).
- `ThemeToggle`: `label`, `light`, `dark`, `system`.
- `Nav`: `home`, `chat`, `signIn`, `signOut`, `mainNavigation`, `openMenu`.
- `Footer`: `tagline`, `home`, `rights` ("(c) {year} ...").
- `Metadata.home`: `siteName`, `title`, `description`.
- `Home`: the home page's title, description, body, and button labels.
- `Chat`: the chat page metadata title and any UI labels.

## Enforcement

- `scripts/check-i18n-sync.mjs` wired into `package.json`:
  - new `"lint:i18n": "node scripts/check-i18n-sync.mjs"` script.
  - added to the `prebuild` chain alongside `guard-no-middleware`.
- `CLAUDE.md` localization section: new pages live under `app/[locale]`; no
  hardcoded user-facing strings (use `useTranslations`/`getTranslations`); both
  catalogs stay key-identical; use `i18n/navigation` helpers instead of
  `next/link` / `next/navigation` inside the app tree; Hebrew is RTL so prefer
  Tailwind logical utilities.

## RTL

RTL is delivered by `dir="rtl"` on `<html>` (from `localeDirection`) plus the
`DirectionProvider` already present at `components/ui/direction.tsx` and
Tailwind logical properties. No `globals.css` changes required.

## Verification

- `npm run typecheck` clean.
- `npm run lint` clean.
- `npm run lint:i18n` passes (catalogs in sync); flip a key to confirm it fails.
- `npm run build` succeeds; `/`, `/en`, `/he`, `/en/chat`, `/he/chat` resolve;
  `/` redirects to `/en`; Hebrew routes render `dir="rtl"`.
- Language switcher round-trips `/en/chat` <-> `/he/chat`.
- `/api/chat` and `/auth/*` remain reachable (not locale-redirected) and the
  session still refreshes.
