"use client"

import { useTranslations } from "next-intl"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

import type { WeeklyDaySummary } from "@/lib/dashboard/student-queries"

interface WeeklyProgressChartProps {
  days: WeeklyDaySummary[]
}

/**
 * Client island: renders a small bar chart of lessons watched per day over
 * the past 7 days. Colors come straight from the shadcn bridge tokens as
 * `var(--token)` - NOT `hsl(var(--token))`. Since Batch 20 those tokens resolve
 * to DESIGN.md hex/var values, not HSL channels, so an `hsl()` wrapper would be
 * invalid and the chart would not paint. Reading the bridge directly keeps the
 * bars (`--primary`), grid/border (`--border`), ticks (`--muted-foreground`),
 * and tooltip (`--popover`) legible in both light and dark mode.
 *
 * Only shown when there are at least 2 distinct days with activity; a single
 * stat suffices for sparse data.
 */
export function WeeklyProgressChart({ days }: WeeklyProgressChartProps) {
  const t = useTranslations("DashboardStudent")

  if (days.length < 2) return null

  // Format YYYY-MM-DD to a short day label (locale-independent: Mon, Tue, etc.)
  const chartData = days.map((d) => ({
    ...d,
    label: new Date(d.date + "T12:00:00Z").toLocaleDateString(undefined, {
      weekday: "short",
    }),
  }))

  return (
    <div
      className="h-40 w-full min-w-0"
      role="img"
      aria-label={t("weeklyChartAriaLabel")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            cursor={{ fill: "var(--muted)" }}
          />
          <Bar
            dataKey="count"
            name={t("lessonsWatched")}
            fill="var(--primary)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
