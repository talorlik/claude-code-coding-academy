"use server"
import "server-only"

/**
 * @file lib/admin/course-actions.ts
 *
 * Server actions for instructor course management (create, update, delete).
 *
 * Security model:
 * - Every action re-validates the caller's instructor role (defense in depth
 *   beyond the layout guard). Never trust the client.
 * - Uses the request-scoped Supabase client so RLS is enforced by the DB.
 *   The instructor's RLS policy grants FULL CRUD on courses, so the admin/
 *   service-role client is NOT needed here.
 * - Writes never expose or log YOUTUBE_API_KEY or other secrets.
 *
 * All functions return {@link ActionResult} so callers can branch on `ok`.
 */

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import {
  createCourseSchema,
  updateCourseSchema,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/lib/validation/course"
import type { Database } from "@/lib/supabase/database.types"

type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"]
import { parseWithSchema } from "@/lib/validation/parse"
import { ok, fail, type ActionResult } from "@/lib/types/action-result"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Revalidates all relevant cached paths after a course mutation:
 * - Admin course list
 * - Public course catalog (home page + catalog page)
 */
function revalidateCourseRoutes(slug?: string): void {
  revalidatePath("/[locale]/admin/courses", "page")
  revalidatePath("/[locale]", "page")
  revalidatePath("/[locale]/courses", "page")
  if (slug) {
    revalidatePath(`/[locale]/courses/${slug}`, "page")
  }
}

/**
 * Maps a Postgres error code to a localized-ready message key.
 * Callers should translate the key; this function returns a stable English
 * fallback for non-translated contexts.
 */
function mapDbError(code: string | undefined): string {
  if (code === "23505") {
    // unique_violation - slug is taken
    return "A course with this slug already exists. Choose a different slug."
  }
  return "Database error. Please try again."
}

// ---------------------------------------------------------------------------
// createCourse
// ---------------------------------------------------------------------------

/**
 * Creates a new course row. The `created_by` column is set to the calling
 * instructor's user id.
 *
 * Returns `fail` with `fieldErrors.slug` on duplicate slug (Postgres 23505).
 *
 * @param input - Raw form data matching {@link CreateCourseInput}.
 * @returns `ok({id, slug})` on success, `fail` on validation or DB error.
 */
export async function createCourse(
  input: unknown
): Promise<ActionResult<{ id: string; slug: string }>> {
  // 1. Guard: instructor-only.
  const userId = await requireAdmin()

  // 2. Validate input.
  const parsed = parseWithSchema(createCourseSchema, input)
  if (!parsed.ok) return parsed

  const { slug, title, description, level, status, language, coverImageUrl } =
    parsed.data as CreateCourseInput

  // 3. Write to DB via request-scoped client (RLS enforced).
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .insert({
      slug,
      title,
      description,
      level,
      status,
      language,
      cover_image_url: coverImageUrl ?? null,
      created_by: userId,
    })
    .select("id, slug")
    .single()

  if (error) {
    if (error.code === "23505") {
      return fail<{ id: string; slug: string }>(
        mapDbError(error.code),
        { slug: "A course with this slug already exists." }
      )
    }
    console.error("[admin/course-actions] createCourse:", error)
    return fail<{ id: string; slug: string }>(mapDbError(error.code))
  }

  revalidateCourseRoutes(slug)
  return ok({ id: data.id, slug: data.slug })
}

// ---------------------------------------------------------------------------
// updateCourse
// ---------------------------------------------------------------------------

/**
 * Updates an existing course by id. Only supplied fields are changed.
 *
 * Returns `fail` with `fieldErrors.slug` on duplicate slug (Postgres 23505).
 *
 * @param id - Course UUID.
 * @param input - Partial course data matching {@link UpdateCourseInput}.
 * @returns `ok({id, slug})` on success, `fail` on validation or DB error.
 */
export async function updateCourse(
  id: string,
  input: unknown
): Promise<ActionResult<{ id: string; slug: string }>> {
  // 1. Guard: instructor-only.
  await requireAdmin()

  // 2. Validate input.
  const parsed = parseWithSchema(updateCourseSchema, input)
  if (!parsed.ok) return parsed

  const data = parsed.data as UpdateCourseInput

  // Build the update payload with the correct DB type, excluding undefined fields.
  const updatePayload: CourseUpdate = {}
  if (data.slug !== undefined) updatePayload.slug = data.slug
  if (data.title !== undefined) updatePayload.title = data.title
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.level !== undefined) updatePayload.level = data.level
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.language !== undefined) updatePayload.language = data.language
  if (data.coverImageUrl !== undefined)
    updatePayload.cover_image_url = data.coverImageUrl

  // 3. Write to DB.
  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from("courses")
    .update(updatePayload)
    .eq("id", id)
    .select("id, slug")
    .single()

  if (error) {
    if (error.code === "23505") {
      return fail<{ id: string; slug: string }>(
        mapDbError(error.code),
        { slug: "A course with this slug already exists." }
      )
    }
    console.error("[admin/course-actions] updateCourse:", error)
    return fail<{ id: string; slug: string }>(mapDbError(error.code))
  }

  revalidateCourseRoutes(updated?.slug)
  return ok({ id: updated.id, slug: updated.slug })
}

// ---------------------------------------------------------------------------
// deleteCourse
// ---------------------------------------------------------------------------

/**
 * Deletes a course by id. Cascade deletes lessons via the FK constraint.
 *
 * @param id - Course UUID.
 * @returns `ok(null)` on success, `fail` on DB error.
 */
export async function deleteCourse(id: string): Promise<ActionResult<null>> {
  // 1. Guard: instructor-only.
  await requireAdmin()

  // 2. Delete via request-scoped client (RLS enforced).
  const supabase = await createClient()

  // Fetch slug before deletion for revalidation.
  const { data: course } = await supabase
    .from("courses")
    .select("slug")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("courses").delete().eq("id", id)

  if (error) {
    console.error("[admin/course-actions] deleteCourse:", error)
    return fail<null>("Failed to delete course. Please try again.")
  }

  revalidateCourseRoutes(course?.slug)
  return ok(null)
}
