import { useTranslations } from "next-intl"
import { TrophyIcon, LockIcon } from "lucide-react"

import type { BadgeId } from "@/lib/dashboard/badges"

interface AchievementBadgeProps {
  id: BadgeId
  earned: boolean
}

/**
 * Renders a single achievement badge, showing earned or locked state.
 * Badge name and description come from the DashboardStudent i18n namespace.
 */
export function AchievementBadge({ id, earned }: AchievementBadgeProps) {
  const t = useTranslations("DashboardStudent")

  return (
    <li
      className={[
        "flex min-w-0 flex-col gap-1 rounded-lg border p-3",
        earned
          ? "border-brand-accent/40 bg-brand-accent/5"
          : "border-border bg-muted/40 opacity-60",
      ].join(" ")}
      aria-label={earned ? t("badgeEarned") : t("badgeLocked")}
    >
      <div className="flex items-center gap-2">
        {earned ? (
          <TrophyIcon
            className="h-4 w-4 shrink-0 text-brand-accent"
            aria-hidden="true"
          />
        ) : (
          <LockIcon
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <span className="text-sm font-medium">
          {t(`badges.${id}.name` as Parameters<typeof t>[0])}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(`badges.${id}.description` as Parameters<typeof t>[0])}
      </p>
    </li>
  )
}
