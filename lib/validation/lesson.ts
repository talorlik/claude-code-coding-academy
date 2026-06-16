import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

/** YouTube video ID: exactly 11 characters. */
const youtubeVideoIdSchema = z
  .string()
  .length(11, "YouTube video ID must be exactly 11 characters")

/** Non-negative integer for sort position. */
const sortOrderSchema = z
  .number()
  .int("Sort order must be an integer")
  .min(0, "Sort order must be >= 0")

// ---------------------------------------------------------------------------
// Lesson schemas
// ---------------------------------------------------------------------------

/**
 * Schema for creating a new lesson.
 *
 * The `courseId` is derived from the URL context by the server action and is
 * not part of this input schema (it is injected server-side).
 */
export const createLessonSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, digits, and hyphens"
    ),
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().nullable().optional(),
  youtubeVideoId: youtubeVideoIdSchema,
  youtubeUrl: z.string().url("YouTube URL must be a valid URL"),
  sortOrder: sortOrderSchema,
  durationSeconds: z
    .number()
    .int("Duration must be an integer")
    .min(0, "Duration must be >= 0")
    .nullable()
    .optional(),
  thumbnailUrl: z.string().url("Thumbnail must be a valid URL").nullable().optional(),
  isPreview: z.boolean().optional().default(false),
})

/**
 * Schema for updating an existing lesson.
 *
 * All fields are optional; the server action decides which columns to update.
 */
export const updateLessonSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, digits, and hyphens"
    )
    .optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title is too long")
    .optional(),
  description: z.string().nullable().optional(),
  youtubeVideoId: youtubeVideoIdSchema.optional(),
  youtubeUrl: z.string().url("YouTube URL must be a valid URL").optional(),
  sortOrder: sortOrderSchema.optional(),
  durationSeconds: z
    .number()
    .int("Duration must be an integer")
    .min(0, "Duration must be >= 0")
    .nullable()
    .optional(),
  thumbnailUrl: z.string().url("Thumbnail must be a valid URL").nullable().optional(),
  isPreview: z.boolean().optional(),
})

/**
 * Schema for reordering multiple lessons in one operation.
 *
 * Callers send the full desired order as an array of `{id, sortOrder}` pairs.
 * The server applies all updates in a single transaction.
 */
export const reorderLessonsSchema = z.array(
  z.object({
    // `.guid()` not `.string().uuid()`: Zod 4's `.uuid()` enforces RFC 9562
    // version/variant nibbles and rejects the repeated-character placeholder
    // lesson IDs the seed data uses (e.g. `aaaaaaaa-...`). Postgres stores those
    // as valid `uuid`, so the column type is the contract. `.guid()` accepts any
    // 8-4-4-4-12 hex string.
    id: z.guid("Lesson ID must be a valid UUID"),
    sortOrder: sortOrderSchema,
  })
)

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link createLessonSchema}. */
export type CreateLessonInput = z.infer<typeof createLessonSchema>

/** Input type inferred from {@link updateLessonSchema}. */
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>

/** Input type inferred from {@link reorderLessonsSchema}. */
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>
