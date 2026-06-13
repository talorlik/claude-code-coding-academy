"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { AdminLessonForm } from "@/components/admin/admin-lesson-form"
import { deleteLesson } from "@/lib/admin/lesson-actions"
import { reorderLessons } from "@/lib/admin/reorder-lessons"
import type { LessonSummary } from "@/lib/courses/types"

interface AdminLessonListProps {
  courseId: string
  lessons: LessonSummary[]
}

/**
 * Admin lesson list with up/down reorder buttons, edit dialog, and
 * delete confirmation. Accessible: keyboard navigable with clear action labels.
 */
export function AdminLessonList({ courseId, lessons: initialLessons }: AdminLessonListProps) {
  const t = useTranslations("Admin")
  const router = useRouter()
  const [isPendingDelete, startDeleteTransition] = useTransition()
  const [isPendingReorder, startReorderTransition] = useTransition()
  const [editingLesson, setEditingLesson] = useState<LessonSummary | null>(null)
  const [openDeleteId, setOpenDeleteId] = useState<string | null>(null)

  // Local optimistic order state.
  const [lessons, setLessons] = useState(initialLessons)

  function moveLesson(index: number, direction: "up" | "down") {
    const newLessons = [...lessons]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newLessons.length) return

    // Swap.
    ;[newLessons[index], newLessons[swapIndex]] = [
      newLessons[swapIndex],
      newLessons[index],
    ]

    // Assign sequential sort_order values.
    const reordered = newLessons.map((l, i) => ({ ...l, sortOrder: i }))
    setLessons(reordered)

    const pairs = reordered.map((l) => ({ id: l.id, sortOrder: l.sortOrder }))

    startReorderTransition(async () => {
      const result = await reorderLessons(courseId, pairs)
      if (result.ok) {
        toast.success(t("reorder.success"))
      } else {
        toast.error(result.message ?? t("reorder.error"))
        // Revert on failure.
        setLessons(initialLessons)
      }
    })
  }

  function handleDeleteLesson(lessonId: string) {
    startDeleteTransition(async () => {
      const result = await deleteLesson(lessonId)
      if (result.ok) {
        toast.success(t("deleteLesson.success"))
        setLessons((prev) => prev.filter((l) => l.id !== lessonId))
        router.refresh()
        setOpenDeleteId(null)
      } else {
        toast.error(result.message ?? t("deleteLesson.error"))
      }
    })
  }

  if (lessons.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("lessonList.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("lessonList.empty.body")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="w-20 px-4 py-3 text-start font-medium">
                {t("lessonList.table.order")}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {t("lessonList.table.title")}
              </th>
              <th className="hidden px-4 py-3 text-start font-medium sm:table-cell">
                {t("lessonList.table.preview")}
              </th>
              <th className="px-4 py-3 text-end font-medium">
                {t("lessonList.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lessons.map((lesson, index) => (
              <tr key={lesson.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveLesson(index, "up")}
                      disabled={index === 0 || isPendingReorder}
                      aria-label={t("lessonList.actions.moveUp")}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveLesson(index, "down")}
                      disabled={
                        index === lessons.length - 1 || isPendingReorder
                      }
                      aria-label={t("lessonList.actions.moveDown")}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  <span className="block truncate font-medium">
                    {lesson.title}
                  </span>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {lesson.isPreview
                    ? t("lessonList.preview.yes")
                    : t("lessonList.preview.no")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingLesson(lesson)}
                      aria-label={t("lessonList.actions.edit")}
                    >
                      <PencilIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">
                        {t("lessonList.actions.edit")}
                      </span>
                    </Button>

                    <AlertDialog
                      open={openDeleteId === lesson.id}
                      onOpenChange={(o) =>
                        setOpenDeleteId(o ? lesson.id : null)
                      }
                    >
                      <AlertDialogTrigger
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t("lessonList.actions.delete")}
                      >
                        <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">
                          {t("lessonList.actions.delete")}
                        </span>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("deleteLesson.confirmTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteLesson.confirmBody", {
                              title: lesson.title,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("deleteLesson.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleDeleteLesson(lesson.id)
                            }
                            disabled={isPendingDelete}
                            aria-busy={isPendingDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("deleteLesson.confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit lesson dialog */}
      <Dialog
        open={!!editingLesson}
        onOpenChange={(o) => !o && setEditingLesson(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("lessonForm.editTitle")}</DialogTitle>
          </DialogHeader>
          {editingLesson && (
            <AdminLessonForm
              lessonId={editingLesson.id}
              defaultValues={{
                title: editingLesson.title,
                description: editingLesson.description ?? "",
                youtubeUrl: editingLesson.youtubeUrl,
                isPreview: editingLesson.isPreview,
              }}
              onSuccess={() => {
                setEditingLesson(null)
                setLessons((prev) =>
                  prev.map((l) =>
                    l.id === editingLesson.id
                      ? { ...l, title: editingLesson.title }
                      : l
                  )
                )
                router.refresh()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
