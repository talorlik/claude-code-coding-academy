"use server"
import "server-only"

/**
 * @file lib/admin/lesson-actions.ts
 *
 * Server actions for instructor lesson management (add from URL, update, delete).
 *
 * Security model: identical to course-actions - every action re-validates
 * instructor role; uses request-scoped client (RLS enforced).
 *
 * sort_order assignment strategy:
 *   On insert, we compute `MAX(sort_order) + 1` for the given course in a
 *   separate SELECT before the INSERT. A race between two concurrent inserts
 *   could produce the same sort_order, but the table's unique constraint on
 *   (course_id, sort_order) will reject the second insert. The caller can
 *   retry. For the reorder case, see lib/admin/reorder-lessons.ts.
 */

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { updateLessonSchema, type UpdateLessonInput } from "@/lib/validation/lesson"
import type { Database } from "@/lib/supabase/database.types"

type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"]
import { parseWithSchema } from "@/lib/validation/parse"
import { ok, fail, type ActionResult } from "@/lib/types/action-result"
import { extractVideoId } from "@/lib/youtube/parser"
import { fetchVideoOEmbed } from "@/lib/youtube/metadata"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function revalidateLessonRoutes(courseId: string): void {
  revalidatePath("/[locale]/admin/courses", "page")
  revalidatePath(`/[locale]/admin/courses/${courseId}/lessons`, "page")
}

// ---------------------------------------------------------------------------
// addLessonFromUrl
// ---------------------------------------------------------------------------

/**
 * Parses a YouTube video URL, fetches oEmbed metadata, and inserts a new
 * lesson into the given course.
 *
 * The lesson's `sort_order` is set to `MAX(existing sort_order) + 1` for the
 * course, defaulting to 0 when no lessons exist yet.
 *
 * oEmbed fallback: if the oEmbed fetch fails (private video, network error,
 * etc.), the lesson is still created with a title derived from the video id.
 * The instructor can edit it afterwards.
 *
 * @param courseId - Parent course UUID.
 * @param url - Any valid YouTube watch/share/embed URL.
 * @returns `ok({lessonId})` on success; `fail` on invalid URL or DB error.
 */
export async function addLessonFromUrl(
  courseId: string,
  url: string
): Promise<ActionResult<{ lessonId: string }>> {
  // 1. Guard.
  await requireAdmin()

  // 2. Parse video id from URL.
  const videoId = extractVideoId(url)
  if (!videoId) {
    return fail<{ lessonId: string }>(
      "Invalid YouTube URL. Please enter a valid YouTube video URL.",
      { url: "Invalid YouTube URL. Could not extract a video ID." }
    )
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`

  // 3. Fetch oEmbed metadata (best-effort; degrade gracefully).
  let title = `Video ${videoId}`
  let thumbnailUrl: string | null = null

  const oEmbedResult = await fetchVideoOEmbed(videoId)
  if (oEmbedResult.ok) {
    title = oEmbedResult.data.title
    thumbnailUrl = oEmbedResult.data.thumbnailUrl
  }

  // 4. Compute next sort_order.
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from("lessons")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = maxRow ? maxRow.sort_order + 1 : 0

  // 5. Generate a slug from the title.
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80) || `lesson-${videoId}`

  // 6. Insert the lesson.
  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      slug,
      title,
      youtube_video_id: videoId,
      youtube_url: watchUrl,
      thumbnail_url: thumbnailUrl,
      sort_order: sortOrder,
      is_preview: false,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[admin/lesson-actions] addLessonFromUrl:", error)
    return fail<{ lessonId: string }>(
      "Failed to add lesson. The video may already exist in this course or the sort order conflicted."
    )
  }

  revalidateLessonRoutes(courseId)
  return ok({ lessonId: lesson.id })
}

// ---------------------------------------------------------------------------
// updateLesson
// ---------------------------------------------------------------------------

/**
 * Updates an existing lesson by id. Only supplied fields are changed.
 *
 * @param id - Lesson UUID.
 * @param input - Partial lesson data matching {@link UpdateLessonInput}.
 * @returns `ok(null)` on success, `fail` on validation or DB error.
 */
export async function updateLesson(
  id: string,
  input: unknown
): Promise<ActionResult<null>> {
  // 1. Guard.
  await requireAdmin()

  // 2. Validate input.
  const parsed = parseWithSchema(updateLessonSchema, input)
  if (!parsed.ok) return parsed

  const data = parsed.data as UpdateLessonInput

  // Build the update payload with the correct DB type, excluding undefined fields.
  const updatePayload: LessonUpdate = {}
  if (data.slug !== undefined) updatePayload.slug = data.slug
  if (data.title !== undefined) updatePayload.title = data.title
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.youtubeVideoId !== undefined) updatePayload.youtube_video_id = data.youtubeVideoId
  if (data.youtubeUrl !== undefined) updatePayload.youtube_url = data.youtubeUrl
  if (data.sortOrder !== undefined) updatePayload.sort_order = data.sortOrder
  if (data.durationSeconds !== undefined) updatePayload.duration_seconds = data.durationSeconds
  if (data.thumbnailUrl !== undefined) updatePayload.thumbnail_url = data.thumbnailUrl
  if (data.isPreview !== undefined) updatePayload.is_preview = data.isPreview

  // 3. Write to DB.
  const supabase = await createClient()

  // Fetch course_id for revalidation.
  const { data: existing } = await supabase
    .from("lessons")
    .select("course_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("lessons")
    .update(updatePayload)
    .eq("id", id)

  if (error) {
    console.error("[admin/lesson-actions] updateLesson:", error)
    return fail<null>("Failed to update lesson. Please try again.")
  }

  if (existing?.course_id) {
    revalidateLessonRoutes(existing.course_id)
  }
  return ok(null)
}

// ---------------------------------------------------------------------------
// deleteLesson
// ---------------------------------------------------------------------------

/**
 * Deletes a lesson by id.
 *
 * @param id - Lesson UUID.
 * @returns `ok(null)` on success, `fail` on DB error.
 */
export async function deleteLesson(id: string): Promise<ActionResult<null>> {
  // 1. Guard.
  await requireAdmin()

  const supabase = await createClient()

  // Fetch course_id for revalidation.
  const { data: existing } = await supabase
    .from("lessons")
    .select("course_id")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("lessons").delete().eq("id", id)

  if (error) {
    console.error("[admin/lesson-actions] deleteLesson:", error)
    return fail<null>("Failed to delete lesson. Please try again.")
  }

  if (existing?.course_id) {
    revalidateLessonRoutes(existing.course_id)
  }
  return ok(null)
}
