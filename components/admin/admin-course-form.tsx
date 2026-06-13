"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { createCourse, updateCourse } from "@/lib/admin/course-actions"
import { slugify } from "@/lib/utils/slug"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CourseFormValues {
  title: string
  slug: string
  description: string
  level: string
  status: string
  language: string
  coverImageUrl: string
}

interface AdminCourseFormProps {
  mode: "create" | "edit"
  courseId?: string
  defaultValues?: Partial<CourseFormValues>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Admin course create/edit form. Client component; submits to a server action.
 * Shows localized field errors from ActionResult.fieldErrors.
 * Accessible: real form with <label for> associations.
 */
export function AdminCourseForm({
  mode,
  courseId,
  defaultValues,
}: AdminCourseFormProps) {
  const t = useTranslations("Admin")
  const tCourses = useTranslations("Courses")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [rootError, setRootError] = useState<string | null>(null)

  // Slug auto-suggestion from title.
  const [title, setTitle] = useState(defaultValues?.title ?? "")
  const [slug, setSlug] = useState(defaultValues?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(mode === "edit")

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    if (!slugTouched) {
      const suggested = slugify(e.target.value)
      setSlug(suggested)
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value)
    setSlugTouched(true)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setRootError(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const input = {
      title: data.get("title") as string,
      slug: data.get("slug") as string,
      description: data.get("description") as string,
      level: data.get("level") as string,
      status: data.get("status") as string,
      language: data.get("language") as string,
      coverImageUrl: (data.get("coverImageUrl") as string) || undefined,
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCourse(input)
          : await updateCourse(courseId!, input)

      if (result.ok) {
        const successKey =
          mode === "create"
            ? "courseForm.success.created"
            : "courseForm.success.updated"
        toast.success(t(successKey as Parameters<typeof t>[0]))
        router.push("/admin/courses")
      } else {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        }
        setRootError(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="mb-6">
        {/* Title */}
        <Field>
          <FieldLabel htmlFor="title">
            {t("courseForm.fields.title")}
          </FieldLabel>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={handleTitleChange}
            placeholder={t("courseForm.fields.titlePlaceholder")}
            required
            aria-invalid={!!fieldErrors["title"]}
            aria-describedby={fieldErrors["title"] ? "title-error" : undefined}
          />
          {fieldErrors["title"] && (
            <FieldError id="title-error">{fieldErrors["title"]}</FieldError>
          )}
        </Field>

        {/* Slug */}
        <Field>
          <FieldLabel htmlFor="slug">
            {t("courseForm.fields.slug")}
          </FieldLabel>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={handleSlugChange}
            placeholder={t("courseForm.fields.slugPlaceholder")}
            required
            aria-invalid={!!fieldErrors["slug"]}
            aria-describedby={
              fieldErrors["slug"] ? "slug-error" : "slug-hint"
            }
          />
          <FieldDescription id="slug-hint">
            {t("courseForm.fields.slugHint")}
          </FieldDescription>
          {fieldErrors["slug"] && (
            <FieldError id="slug-error">{fieldErrors["slug"]}</FieldError>
          )}
        </Field>

        {/* Description */}
        <Field>
          <FieldLabel htmlFor="description">
            {t("courseForm.fields.description")}
          </FieldLabel>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            placeholder={t("courseForm.fields.descriptionPlaceholder")}
            rows={4}
            required
            aria-invalid={!!fieldErrors["description"]}
            aria-describedby={
              fieldErrors["description"] ? "description-error" : undefined
            }
          />
          {fieldErrors["description"] && (
            <FieldError id="description-error">
              {fieldErrors["description"]}
            </FieldError>
          )}
        </Field>

        {/* Level */}
        <Field>
          <FieldLabel htmlFor="level">
            {t("courseForm.fields.level")}
          </FieldLabel>
          <NativeSelect
            id="level"
            name="level"
            defaultValue={defaultValues?.level ?? ""}
            required
            aria-invalid={!!fieldErrors["level"]}
            className="w-full"
          >
            <NativeSelectOption value="" disabled>
              {t("courseForm.fields.levelPlaceholder")}
            </NativeSelectOption>
            <NativeSelectOption value="beginner">
              {tCourses("level.beginner")}
            </NativeSelectOption>
            <NativeSelectOption value="intermediate">
              {tCourses("level.intermediate")}
            </NativeSelectOption>
            <NativeSelectOption value="advanced">
              {tCourses("level.advanced")}
            </NativeSelectOption>
          </NativeSelect>
          {fieldErrors["level"] && (
            <FieldError>{fieldErrors["level"]}</FieldError>
          )}
        </Field>

        {/* Language */}
        <Field>
          <FieldLabel htmlFor="language">
            {t("courseForm.fields.language")}
          </FieldLabel>
          <NativeSelect
            id="language"
            name="language"
            defaultValue={defaultValues?.language ?? ""}
            required
            aria-invalid={!!fieldErrors["language"]}
            className="w-full"
          >
            <NativeSelectOption value="" disabled>
              {t("courseForm.fields.languagePlaceholder")}
            </NativeSelectOption>
            <NativeSelectOption value="en">
              {t("courseForm.language.en")}
            </NativeSelectOption>
            <NativeSelectOption value="he">
              {t("courseForm.language.he")}
            </NativeSelectOption>
            <NativeSelectOption value="mixed">
              {t("courseForm.language.mixed")}
            </NativeSelectOption>
          </NativeSelect>
          {fieldErrors["language"] && (
            <FieldError>{fieldErrors["language"]}</FieldError>
          )}
        </Field>

        {/* Status */}
        <Field>
          <FieldLabel htmlFor="status">
            {t("courseForm.fields.status")}
          </FieldLabel>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "draft"}
            required
            aria-invalid={!!fieldErrors["status"]}
            className="w-full"
          >
            <NativeSelectOption value="draft">
              {t("status.draft")}
            </NativeSelectOption>
            <NativeSelectOption value="published">
              {t("status.published")}
            </NativeSelectOption>
            <NativeSelectOption value="archived">
              {t("status.archived")}
            </NativeSelectOption>
          </NativeSelect>
          {fieldErrors["status"] && (
            <FieldError>{fieldErrors["status"]}</FieldError>
          )}
        </Field>

        {/* Cover Image URL */}
        <Field>
          <FieldLabel htmlFor="coverImageUrl">
            {t("courseForm.fields.coverImageUrl")}
          </FieldLabel>
          <Input
            id="coverImageUrl"
            name="coverImageUrl"
            type="url"
            defaultValue={defaultValues?.coverImageUrl ?? ""}
            placeholder={t("courseForm.fields.coverImageUrlPlaceholder")}
            aria-invalid={!!fieldErrors["coverImageUrl"]}
            aria-describedby={
              fieldErrors["coverImageUrl"]
                ? "coverImageUrl-error"
                : undefined
            }
          />
          {fieldErrors["coverImageUrl"] && (
            <FieldError id="coverImageUrl-error">
              {fieldErrors["coverImageUrl"]}
            </FieldError>
          )}
        </Field>
      </FieldGroup>

      {rootError && (
        <div role="alert" className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {rootError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending
            ? mode === "create"
              ? t("courseForm.submit.creating")
              : t("courseForm.submit.updating")
            : mode === "create"
              ? t("courseForm.submit.create")
              : t("courseForm.submit.update")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/courses")}
          disabled={isPending}
        >
          {t("courseForm.cancel")}
        </Button>
      </div>
    </form>
  )
}
