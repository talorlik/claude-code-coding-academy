"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { addLessonFromUrl } from "@/lib/admin/lesson-actions"

interface AddLessonFormProps {
  courseId: string
}

/**
 * Form to add a lesson from a YouTube video URL.
 * Fetches oEmbed metadata server-side; degrades gracefully if oEmbed fails.
 */
export function AddLessonForm({ courseId }: AddLessonFormProps) {
  const t = useTranslations("Admin")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [urlError, setUrlError] = useState<string | null>(null)
  const [rootError, setRootError] = useState<string | null>(null)
  const [url, setUrl] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUrlError(null)
    setRootError(null)

    if (!url.trim()) {
      setUrlError(t("addLessonForm.validation.urlRequired"))
      return
    }

    startTransition(async () => {
      const result = await addLessonFromUrl(courseId, url.trim())
      if (result.ok) {
        toast.success(t("addLessonForm.success"))
        setUrl("")
        router.refresh()
      } else {
        if (result.fieldErrors?.url) {
          setUrlError(result.fieldErrors.url)
        } else {
          setRootError(result.message)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="lesson-url">
          {t("addLessonForm.urlLabel")}
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Input
            id="lesson-url"
            name="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("addLessonForm.urlPlaceholder")}
            className="min-w-0 flex-1"
            aria-invalid={!!urlError}
            aria-describedby={urlError ? "lesson-url-error" : undefined}
          />
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending
              ? t("addLessonForm.submitting")
              : t("addLessonForm.submit")}
          </Button>
        </div>
        {urlError && (
          <FieldError id="lesson-url-error">{urlError}</FieldError>
        )}
      </Field>

      {rootError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {rootError}
        </div>
      )}
    </form>
  )
}
