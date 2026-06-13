import { useTranslations } from "next-intl"

import { Progress } from "@/components/ui/progress"
import type { CourseCompletionRate } from "@/lib/dashboard/admin-queries"

interface AdminCompletionTableProps {
  courses: CourseCompletionRate[]
}

/**
 * Renders course completion rates as an accessible table with inline progress
 * bars. A table is more readable than a chart when there are few courses.
 */
export function AdminCompletionTable({ courses }: AdminCompletionTableProps) {
  const t = useTranslations("DashboardAdmin")

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("noCompletionData")}
      </p>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b text-start text-xs text-muted-foreground">
            <th className="pb-2 pe-4 text-start font-medium">
              {t("course")}
            </th>
            <th className="pb-2 pe-4 text-end font-medium tabular-nums">
              {t("enrolled")}
            </th>
            <th className="pb-2 pe-4 text-end font-medium tabular-nums">
              {t("completed")}
            </th>
            <th className="min-w-32 pb-2 text-start font-medium">
              {t("completionRate")}
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.courseId} className="border-b last:border-0">
              <td className="py-2 pe-4 font-medium">{c.courseTitle}</td>
              <td className="py-2 pe-4 text-end tabular-nums text-muted-foreground">
                {c.totalEnrollments}
              </td>
              <td className="py-2 pe-4 text-end tabular-nums text-muted-foreground">
                {c.completedEnrollments}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <Progress
                    value={c.completionPercent}
                    className="h-2 flex-1"
                    aria-label={t("completionRateFor", {
                      course: c.courseTitle,
                    })}
                  />
                  <span className="w-9 shrink-0 text-end text-xs tabular-nums text-muted-foreground">
                    {c.completionPercent}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
