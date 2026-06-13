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

/** Input type inferred from {@link markWatchedSchema}. */
export type MarkWatchedInput = z.infer<typeof markWatchedSchema>
