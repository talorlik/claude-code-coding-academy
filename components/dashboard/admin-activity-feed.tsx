import { useTranslations } from "next-intl"
import { BookOpenIcon, PlayIcon } from "lucide-react"

import type { RecentActivityItem } from "@/lib/dashboard/admin-queries"

interface AdminActivityFeedProps {
  items: RecentActivityItem[]
}

/**
 * Renders the recent course activity feed on the admin dashboard.
 * Shows enrollments and lesson-watched events with user and course info.
 */
export function AdminActivityFeed({ items }: AdminActivityFeedProps) {
  const t = useTranslations("DashboardAdmin")

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noRecentActivity")}</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        const displayName =
          item.fullName ?? item.email ?? t("unknownStudent")

        return (
          <li
            key={i}
            className="flex min-w-0 items-start gap-3 rounded-md border bg-card px-3 py-2"
          >
            <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true">
              {item.type === "enrollment" ? (
                <BookOpenIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {item.type === "enrollment"
                  ? t("enrolledIn", {
                      student: displayName,
                      course: item.courseTitle,
                    })
                  : t("watchedLesson", {
                      student: displayName,
                      lesson: item.lessonTitle ?? t("aLesson"),
                      course: item.courseTitle,
                    })}
              </p>
              <time
                dateTime={item.occurredAt}
                className="mt-0.5 block text-xs text-muted-foreground"
              >
                {new Date(item.occurredAt).toLocaleString()}
              </time>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
