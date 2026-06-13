import { useTranslations } from "next-intl"

import type { CommonTutorQuestion } from "@/lib/dashboard/admin-queries"

interface AdminCommonQuestionsProps {
  questions: CommonTutorQuestion[]
}

/**
 * Renders the common AI tutor questions list for the admin dashboard.
 * Questions are sorted by count (most asked first) by the query layer.
 */
export function AdminCommonQuestions({
  questions,
}: AdminCommonQuestionsProps) {
  const t = useTranslations("DashboardAdmin")

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noTutorQuestions")}</p>
    )
  }

  return (
    <ol className="flex flex-col gap-2">
      {questions.map((q, i) => (
        <li
          key={i}
          className="flex min-w-0 items-start justify-between gap-3 rounded-md border bg-card px-3 py-2"
        >
          <div className="min-w-0">
            <p className="break-words text-sm text-foreground">{q.content}</p>
            <time
              dateTime={q.lastAskedAt}
              className="mt-0.5 block text-xs text-muted-foreground"
            >
              {t("lastAsked", {
                date: new Date(q.lastAskedAt).toLocaleDateString(),
              })}
            </time>
          </div>
          <span
            className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums"
            aria-label={t("askedNTimes", { count: q.count })}
          >
            ×{q.count}
          </span>
        </li>
      ))}
    </ol>
  )
}
