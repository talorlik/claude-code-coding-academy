import { hasLocale, NextIntlClientProvider } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { Inter, JetBrains_Mono } from "next/font/google"
import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"

import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SkipLink } from "@/components/skip-link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import { cn } from "@/lib/utils"
import {
  localeDirection,
  localeTag,
  routing,
  type Locale,
} from "@/i18n/routing"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

// JetBrains Mono is the DESIGN.md developer-language face: eyebrow labels, code
// blocks, terminal output, and IDs. Bound to --font-mono so every existing
// `font-mono` utility now resolves to it.
const fontMono = JetBrains_Mono({
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
 * PWA document metadata: links the Web App Manifest (so the browser offers
 * install) and declares the iOS standalone web-app behavior. `appleWebApp`
 * supplies the Add-to-Home-Screen title and is paired with the `apple` touch
 * icon iOS reads instead of the manifest icons. `app/favicon.ico` is served
 * automatically by Next; it is also declared explicitly under `icons.icon` so
 * older browsers that ignore the file-convention `<link>` still resolve it.
 */
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Academy",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon-180.png",
  },
}

/**
 * Document-level viewport metadata. `width`/`initialScale` make mobile scaling
 * explicit (no accidental desktop-width zoom-out on phones), and `themeColor`
 * tints the mobile browser chrome to match the active theme. The colors track
 * the DESIGN.md light/dark `--color-bg` page-canvas values.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#06051d" },
  ],
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
        "antialiased overflow-x-hidden",
        fontMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="flex min-h-svh flex-col overflow-x-hidden">
        <NextIntlClientProvider>
          <ThemeProvider>
            <SkipLink />
            <ServiceWorkerRegister />
            <SiteHeader />
            <div className="flex min-w-0 flex-1 flex-col">{children}</div>
            <SiteFooter />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
