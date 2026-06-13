import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { requireUser } from "@/lib/auth/require-user"
import { getMyGroups, getMyGroupProgress } from "@/lib/groups/queries"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Groups" })
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  }
}

/**
 * Student group page. Shows all groups the user belongs to plus their
 * aggregate progress within each group's courses.
 *
 * RLS on class_group_members and the group_progress_summary view ensures
 * students only see their own memberships.
 */
export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireUser()

  const [t, groups, progressSummaries] = await Promise.all([
    getTranslations("Groups"),
    getMyGroups(userId),
    getMyGroupProgress(userId),
  ])

  // Build a map from groupId -> progress summaries for easy lookup.
  const progressByGroup = new Map<
    string,
    import("@/lib/groups/types").GroupProgressSummary[]
  >()
  for (const ps of progressSummaries) {
    if (!ps.groupId) continue
    const existing = progressByGroup.get(ps.groupId) ?? []
    existing.push(ps)
    progressByGroup.set(ps.groupId, existing)
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"
    >
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        {t("pageTitle")}
      </h1>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium text-foreground">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("empty.body")}</p>
          <Link
            href="/courses"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {/* Borrow "Browse courses" from Search namespace */}
            Browse courses
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((group) => {
            const summaries = progressByGroup.get(group.id) ?? []
            return (
              <li key={group.id} className="rounded-lg border bg-card p-4">
                <p className="break-words font-medium text-foreground">
                  {group.name}
                </p>
                <p className="text-xs text-muted-foreground">/{group.slug}</p>

                {summaries.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {summaries.map((ps) => (
                      <li
                        key={`${ps.groupId}-${ps.courseId}`}
                        className="flex flex-wrap gap-4 text-sm text-muted-foreground"
                      >
                        <span>
                          {t("avgProgress")}:{" "}
                          <span className="font-medium text-foreground">
                            {Math.round(ps.avgProgressPercent ?? 0)}%
                          </span>
                        </span>
                        <span>
                          {t("enrolled")}:{" "}
                          <span className="font-medium text-foreground">
                            {ps.enrolledCount ?? 0}
                          </span>
                        </span>
                        <span>
                          {t("completed")}:{" "}
                          <span className="font-medium text-foreground">
                            {ps.completedCount ?? 0}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("noMembers")}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
