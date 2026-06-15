import { useTranslations } from "next-intl"

import type { AdminOverviewStats } from "@/lib/dashboard/admin-queries"

interface AdminStatCardsProps {
  stats: AdminOverviewStats
}

/**
 * Renders the four overview stat cards on the admin dashboard as DESIGN.md
 * Stats Blocks: the number is the visual anchor in `--color-accent` at the 36px
 * heading scale (Inter 600, -0.72px tracking) and the caption recedes in
 * `--color-text-muted`. The number scales down on the narrowest 2-column grid so
 * it never overflows, stepping up to the full 36px from `sm`.
 *
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
          <span className="text-sm text-muted-foreground">{card.label}</span>
          <span className="text-3xl font-semibold tabular-nums text-brand-accent sm:text-[length:var(--text-heading)] sm:leading-[var(--leading-heading)] sm:tracking-[var(--tracking-heading)]">
            {card.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
