import { useTranslations } from "next-intl"

import type { AdminOverviewStats } from "@/lib/dashboard/admin-queries"

interface AdminStatCardsProps {
  stats: AdminOverviewStats
}

/**
 * Renders the four overview stat cards on the admin dashboard.
 * Server component - no client interactivity.
 */
export function AdminStatCards({ stats }: AdminStatCardsProps) {
  const t = useTranslations("DashboardAdmin")

  const cards = [
    { label: t("totalStudents"), value: stats.totalStudents },
    { label: t("totalEnrollments"), value: stats.totalEnrollments },
    { label: t("totalCourses"), value: stats.totalCourses },
    { label: t("completionRate"), value: `${stats.completionRate}%` },
  ]

  return (
    <ul
      className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label={t("overviewStats")}
    >
      {cards.map((card) => (
        <li
          key={card.label}
          className="flex flex-col gap-1 rounded-lg border bg-card p-4"
        >
          <span className="text-xs text-muted-foreground">{card.label}</span>
          <span className="text-2xl font-semibold tabular-nums">
            {card.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
