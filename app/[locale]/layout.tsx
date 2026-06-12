import { hasLocale, NextIntlClientProvider } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { Geist_Mono, Inter } from "next/font/google"
import type { Viewport } from "next"
import { notFound } from "next/navigation"

import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SkipLink } from "@/components/skip-link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
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
    </html>
  )
}
