"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import { toast } from "sonner"
import { PencilIcon, BookOpenIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { deleteCourse } from "@/lib/admin/course-actions"
import type { AdminCourseSummary } from "@/lib/admin/queries"

interface AdminCourseTableProps {
  courses: AdminCourseSummary[]
}

type CourseStatus = "draft" | "published" | "archived"

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Admin")
  const variant =
    status === "published"
      ? "default"
      : status === "archived"
        ? "secondary"
        : "outline"

  const label =
    status === "draft"
      ? t("status.draft")
      : status === "published"
        ? t("status.published")
        : t("status.archived")

  return <Badge variant={variant}>{label}</Badge>
}

function DeleteCourseButton({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}) {
  const t = useTranslations("Admin")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourse(courseId)
      if (result.ok) {
        toast.success(t("deleteCourse.success"))
        router.refresh()
        setOpen(false)
      } else {
        toast.error(result.message ?? t("deleteCourse.error"))
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("courseList.actions.delete")}
      >
        <Trash2Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{t("courseList.actions.delete")}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteCourse.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteCourse.confirmBody", { title: courseTitle })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("deleteCourse.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            aria-busy={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("deleteCourse.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Admin course table with responsive horizontal scroll.
 *
 * Displays all courses (draft + published + archived) with row actions:
 * edit, manage lessons, delete (with confirmation dialog).
 */
export function AdminCourseTable({ courses }: AdminCourseTableProps) {
  const t = useTranslations("Admin")
  const tCourses = useTranslations("Courses")

  if (courses.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("courseList.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("courseList.empty.body")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      {/* table-fixed allows Title column to truncate instead of expanding. */}
      <table className="w-full table-fixed text-sm">
        <colgroup>
          {/* Title: takes remaining space; Status + Actions have fixed widths. */}
          <col className="w-auto" />
          <col className="hidden w-24 sm:table-column" />
          <col className="w-24" />
          <col className="hidden w-16 md:table-column" />
          <col className="hidden w-28 lg:table-column" />
          <col className="w-28" />
        </colgroup>
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-3 text-start font-medium sm:px-4">
              {t("courseList.table.title")}
            </th>
            <th className="hidden px-4 py-3 text-start font-medium sm:table-cell">
              {t("courseList.table.level")}
            </th>
            <th className="px-3 py-3 text-start font-medium sm:px-4">
              {t("courseList.table.status")}
            </th>
            <th className="hidden px-4 py-3 text-start font-medium md:table-cell">
              {t("courseList.table.lessons")}
            </th>
            <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">
              {t("courseList.table.createdAt")}
            </th>
            <th className="px-3 py-3 text-end font-medium sm:px-4">
              {t("courseList.table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {courses.map((course) => (
            <tr key={course.id} className="hover:bg-muted/20">
              <td className="min-w-0 px-3 py-3 sm:px-4">
                <span className="block truncate font-medium">{course.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  /{course.slug}
                </span>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                {tCourses(`level.${course.level}` as Parameters<typeof tCourses>[0])}
              </td>
              <td className="px-3 py-3 sm:px-4">
                <StatusBadge status={course.status as CourseStatus} />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">{course.lessonCount}</td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {new Date(course.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-3 sm:px-4">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={
                      <Link href={`/admin/courses/${course.id}/edit`} />
                    }
                    aria-label={t("courseList.actions.edit")}
                  >
                    <PencilIcon className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("courseList.actions.edit")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    render={
                      <Link href={`/admin/courses/${course.id}/lessons`} />
                    }
                    aria-label={t("courseList.actions.manageLessons")}
                  >
                    <BookOpenIcon className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">
                      {t("courseList.actions.manageLessons")}
                    </span>
                  </Button>
                  <DeleteCourseButton
                    courseId={course.id}
                    courseTitle={course.title}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
