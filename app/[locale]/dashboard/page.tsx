import { getTranslations } from "next-intl/server"

import { requireUser } from "@/lib/auth/require-user"
import { getCurrentUserRole } from "@/lib/auth/roles"

/**
 * Minimal protected landing for any authenticated user (instructor or student).
 * `requireUser` bounces signed-out visitors to the localized login page; the
 * proxy also guards `/dashboard`, so this is defense in depth. Role-specific
 * dashboards can branch from here later.
 */
export default async function DashboardPage() {
  await requireUser()
  const { isInstructor } = await getCurrentUserRole()
  const t = await getTranslations("Dashboard")

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">
        {isInstructor ? t("instructorGreeting") : t("studentGreeting")}
      </p>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          {t("signOut")}
        </button>
      </form>
    </div>
  )
}
