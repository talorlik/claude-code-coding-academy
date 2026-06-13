import { useTranslations } from "next-intl"
import { BookOpen } from "lucide-react"

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import type { CourseSummary, CourseLevel } from "@/lib/courses/types"
import { EnrollmentButton } from "./enrollment-button"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CourseCardProps {
  course: CourseSummary
  /** Authenticated user id, or null for anonymous visitors. */
  userId: string | null
  /** Whether the current user is already enrolled in this course. */
  isEnrolled: boolean
}

// ---------------------------------------------------------------------------
// Level badge variant map
// ---------------------------------------------------------------------------

const LEVEL_VARIANT: Record<
  CourseLevel,
  "default" | "secondary" | "outline"
> = {
  beginner: "secondary",
  intermediate: "default",
  advanced: "outline",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays a single course summary card with level badge, lesson count,
 * description, and an enrollment / continue CTA.
 *
 * The card is a server component; EnrollmentButton is client-only and
 * handles the interactive enrollment flow.
 */
export function CourseCard({ course, userId, isEnrolled }: CourseCardProps) {
  const t = useTranslations("Courses")

  const levelLabel = t(`level.${course.level}`)
  const lessonLabel = t("lessonCount", { count: course.lessonCount })
  const courseHref = `/courses/${course.slug}` as const

  return (
    <Card className="flex min-w-0 flex-col">
      {/* Cover image or gradient fallback */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/20 to-primary/5">
        {course.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={course.coverImageUrl}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            aria-hidden="true"
          >
            <BookOpen className="size-12 text-primary/40" />
          </div>
        )}
      </div>

      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={LEVEL_VARIANT[course.level]}>{levelLabel}</Badge>
          <span className="text-xs text-muted-foreground">{lessonLabel}</span>
        </div>
        <CardTitle className="line-clamp-2">
          <Link
            href={courseHref}
            className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {course.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3">
          {course.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto" />

      <CardFooter>
        <EnrollmentButton
          courseId={course.id}
          courseSlug={course.slug}
          userId={userId}
          isEnrolled={isEnrolled}
        />
      </CardFooter>
    </Card>
  )
}
