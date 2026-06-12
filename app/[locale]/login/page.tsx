import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { resolveAuthMessage } from "@/lib/auth/resolve-auth-message"
import { LoginTabs } from "./login-tabs"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    notice?: string
    tab?: string
    redirect?: string
  }>
}) {
  const sp = await searchParams
  const t = await getTranslations("AuthMessages")
  const tAuth = await getTranslations("Auth")

  const defaultTab = sp.tab === "signup" ? "signup" : "signin"
  const redirectTo =
    sp.redirect && sp.redirect.startsWith("/") && !sp.redirect.startsWith("//")
      ? sp.redirect
      : undefined

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-medium">{tAuth("welcomeTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {tAuth("welcomeSubtitle")}
          </p>
        </div>

        <div className="mt-6">
          <LoginTabs
            error={resolveAuthMessage(t, sp.error) ?? undefined}
            notice={resolveAuthMessage(t, sp.notice) ?? undefined}
            defaultTab={defaultTab}
            redirectTo={redirectTo}
          />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            {tAuth("backToHome")}
          </Link>
        </p>
      </div>
    </div>
  )
}
