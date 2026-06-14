import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

/** URL-safe slug: lowercase letters, digits, and hyphens only. */
const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, digits, and hyphens")

const courseLevelSchema = z.enum(["beginner", "intermediate", "advanced"])
const courseStatusSchema = z.enum(["draft", "published", "archived"])
const courseLanguageSchema = z.string().min(1, "Language is required")

// ---------------------------------------------------------------------------
// Course schemas
// ---------------------------------------------------------------------------

/**
 * Schema for creating a new course.
 *
 * All required fields must be supplied. The `status` defaults to `"draft"`
 * in the DB but callers should send it explicitly so their intent is clear.
 */
export const createCourseSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  level: courseLevelSchema,
  status: courseStatusSchema,
  language: courseLanguageSchema,
  coverImageUrl: z.string().url("Cover image must be a valid URL").optional(),
})

/**
 * Schema for updating an existing course.
 *
 * All fields are optional so callers can send partial updates. At least one
 * field must change - enforcing that constraint is the caller's responsibility.
 */
export const updateCourseSchema = z.object({
  slug: slugSchema.optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title is too long")
    .optional(),
  description: z.string().min(1, "Description is required").optional(),
  level: courseLevelSchema.optional(),
  status: courseStatusSchema.optional(),
  language: courseLanguageSchema.optional(),
  coverImageUrl: z
    .string()
    .url("Cover image must be a valid URL")
    .nullable()
    .optional(),
})

// ---------------------------------------------------------------------------
// Enrollment schema
// ---------------------------------------------------------------------------

/**
 * Schema for enrolling a user in a course.
 * The `userId` is taken from the authenticated session; only `courseId` is
 * needed from the client.
 */
export const enrollmentSchema = z.object({
  courseId: z.string().uuid("Course ID must be a valid UUID"),
})

// ---------------------------------------------------------------------------
// Review schema
// ---------------------------------------------------------------------------

/**
 * Schema for submitting (or editing) a course review.
 *
 * `rating` is a required integer 1-5 (coerced from the string a radio/`FormData`
 * submits); `body` is an optional free-text comment capped at 1000 chars (blank
 * coerces to undefined so an empty textarea is "no comment", not an error).
 * `courseId` comes from the form's hidden field and is validated as a UUID.
 */
export const reviewSchema = z.object({
  courseId: z.string().uuid("Course ID must be a valid UUID"),
  rating: z.coerce
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  body: z
    .string()
    .trim()
    .max(1000, "Review is too long")
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
})

// ---------------------------------------------------------------------------
// Progress schema
// ---------------------------------------------------------------------------

/**
 * Schema for marking a lesson as watched.
 * Both IDs come from the URL params so they are validated as UUIDs.
 */
export const markWatchedSchema = z.object({
  courseId: z.string().uuid("Course ID must be a valid UUID"),
  lessonId: z.string().uuid("Lesson ID must be a valid UUID"),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link createCourseSchema}. */
export type CreateCourseInput = z.infer<typeof createCourseSchema>

/** Input type inferred from {@link updateCourseSchema}. */
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>

/** Input type inferred from {@link enrollmentSchema}. */
export type EnrollmentInput = z.infer<typeof enrollmentSchema>

/** Input type inferred from {@link reviewSchema}. */
export type ReviewInput = z.infer<typeof reviewSchema>

/** Input type inferred from {@link markWatchedSchema}. */
export type MarkWatchedInput = z.infer<typeof markWatchedSchema>
