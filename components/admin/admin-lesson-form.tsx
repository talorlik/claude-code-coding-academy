"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import { updateLesson } from "@/lib/admin/lesson-actions"

interface LessonFormValues {
  title: string
  description: string
  youtubeUrl: string
  isPreview: boolean
}

interface AdminLessonFormProps {
  lessonId: string
  defaultValues?: Partial<LessonFormValues>
  onSuccess?: () => void
}

/**
 * Edit lesson form. Client component; submits to the updateLesson server action.
 * Shows localized field errors. Calls onSuccess when saved.
 */
export function AdminLessonForm({
  lessonId,
  defaultValues,
  onSuccess,
}: AdminLessonFormProps) {
  const t = useTranslations("Admin")
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [rootError, setRootError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setRootError(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const input: Record<string, unknown> = {
      title: data.get("title") as string,
      description: (data.get("description") as string) || null,
      youtubeUrl: data.get("youtubeUrl") as string,
      isPreview: data.get("isPreview") === "on",
    }

    startTransition(async () => {
      const result = await updateLesson(lessonId, input)
      if (result.ok) {
        toast.success(t("lessonForm.success"))
        onSuccess?.()
      } else {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        setRootError(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="mb-6">
        {/* Title */}
        <Field>
          <FieldLabel htmlFor="lesson-title">
            {t("lessonForm.fields.title")}
          </FieldLabel>
          <Input
            id="lesson-title"
            name="title"
            defaultValue={defaultValues?.title ?? ""}
            placeholder={t("lessonForm.fields.titlePlaceholder")}
            required
            aria-invalid={!!fieldErrors["title"]}
          />
          {fieldErrors["title"] && (
            <FieldError>{fieldErrors["title"]}</FieldError>
          )}
        </Field>

        {/* Description */}
        <Field>
          <FieldLabel htmlFor="lesson-description">
            {t("lessonForm.fields.description")}
          </FieldLabel>
          <Textarea
            id="lesson-description"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            placeholder={t("lessonForm.fields.descriptionPlaceholder")}
            rows={3}
          />
        </Field>

        {/* YouTube URL */}
        <Field>
          <FieldLabel htmlFor="lesson-youtube-url">
            {t("lessonForm.fields.youtubeUrl")}
          </FieldLabel>
          <Input
            id="lesson-youtube-url"
            name="youtubeUrl"
            type="url"
            defaultValue={defaultValues?.youtubeUrl ?? ""}
            placeholder={t("lessonForm.fields.youtubeUrlPlaceholder")}
            aria-invalid={!!fieldErrors["youtubeUrl"]}
          />
          {fieldErrors["youtubeUrl"] && (
            <FieldError>{fieldErrors["youtubeUrl"]}</FieldError>
          )}
        </Field>

        {/* Free Preview */}
        <Field orientation="horizontal">
          <input
            id="lesson-is-preview"
            name="isPreview"
            type="checkbox"
            defaultChecked={defaultValues?.isPreview ?? false}
            className="mt-0.5"
          />
          <FieldLabel htmlFor="lesson-is-preview">
            {t("lessonForm.fields.isPreview")}
          </FieldLabel>
        </Field>
      </FieldGroup>

      {rootError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {rootError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending
            ? t("lessonForm.submit.updating")
            : t("lessonForm.submit.update")}
        </Button>
      </div>
    </form>
  )
}
