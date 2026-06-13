import { useTranslations } from "next-intl"

import type { StuckStudent } from "@/lib/dashboard/admin-queries"

interface AdminStuckStudentsProps {
  students: StuckStudent[]
}

/**
 * Renders the stuck students table (inactive > 7 days) for the admin dashboard.
 */
export function AdminStuckStudents({ students }: AdminStuckStudentsProps) {
  const t = useTranslations("DashboardAdmin")

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noStuckStudents")}</p>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="pb-2 pe-4 text-start font-medium">{t("student")}</th>
            <th className="pb-2 pe-4 text-start font-medium">{t("course")}</th>
            <th className="pb-2 pe-4 text-end font-medium tabular-nums">
              {t("daysInactive")}
            </th>
            <th className="pb-2 text-end font-medium">{t("lastActive")}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr
              key={`${s.userId}-${s.courseId}-${i}`}
              className="border-b last:border-0"
            >
              <td className="py-2 pe-4">
                <div className="min-w-0">
                  <span className="block truncate font-medium">
                    {s.fullName ?? t("unknownStudent")}
                  </span>
                  {s.email && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.email}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 pe-4 text-muted-foreground">
                {s.courseTitle}
              </td>
              <td className="py-2 pe-4 text-end tabular-nums font-semibold text-destructive">
                {s.daysInactive}
              </td>
              <td className="py-2 text-end text-xs tabular-nums text-muted-foreground">
                {s.lastWatchedAt
                  ? new Date(s.lastWatchedAt).toLocaleDateString()
                  : t("never")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
