import { getTranslations, setRequestLocale } from "next-intl/server"

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
import { LanguageSwitcher } from "@/components/language-switcher"
import type { Locale } from "@/i18n/routing"

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  // Opt into static rendering for this locale before any next-intl hook runs,
  // matching the localized layout. Without this the page renders dynamically.
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const t = await getTranslations("Home")

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between p-6">
        <span className="font-mono text-sm font-medium">{t("badge")}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
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
