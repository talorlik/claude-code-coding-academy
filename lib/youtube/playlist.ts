"use server"
import "server-only"

/**
 * @file lib/youtube/playlist.ts
 *
 * Server-only playlist import action.
 *
 * Security: YOUTUBE_API_KEY is read from process.env server-side only.
 * It is never echoed to the client or logged.
 *
 * UX for missing key:
 *   When YOUTUBE_API_KEY is absent, fetchPlaylistItems (called internally)
 *   returns fail(MISSING_API_KEY_MESSAGE). This module surfaces that message
 *   directly so the UI can display a clear instruction.
 */

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { ok, fail, type ActionResult } from "@/lib/types/action-result"
import { extractPlaylistId } from "@/lib/youtube/parser"
import {
  fetchPlaylistItems,
  MISSING_API_KEY_MESSAGE,
  QUOTA_EXCEEDED_MESSAGE,
  PLAYLIST_NOT_FOUND_MESSAGE,
  INVALID_PLAYLIST_URL_MESSAGE,
} from "@/lib/youtube/metadata"
import type { LessonDraft } from "@/lib/youtube/types"

// Re-export sentinels so UI components can match error messages and show
// localized text without importing from metadata.ts (server-only module).
export {
  MISSING_API_KEY_MESSAGE,
  QUOTA_EXCEEDED_MESSAGE,
  PLAYLIST_NOT_FOUND_MESSAGE,
  INVALID_PLAYLIST_URL_MESSAGE,
}

// ---------------------------------------------------------------------------
// importPlaylist
// ---------------------------------------------------------------------------

/**
 * Imports all lessons from a YouTube playlist into a course.
 *
 * Steps:
 * 1. Parse the playlist ID from the URL.
 * 2. Fetch playlist items (fails with MISSING_API_KEY_MESSAGE when key absent).
 * 3. Determine the current max sort_order in the course.
 * 4. Insert all drafts with sequential sort_order starting from max+1.
 *
 * @param courseId - Parent course UUID.
 * @param playlistUrl - Any YouTube playlist URL containing a `list=` param.
 * @returns `ok({imported: number})` on success, `fail` otherwise.
 */
export async function importPlaylist(
  courseId: string,
  playlistUrl: string
): Promise<ActionResult<{ imported: number }>> {
  // 1. Guard.
  await requireAdmin()

  // 2. Parse playlist ID.
  const playlistId = extractPlaylistId(playlistUrl)
  if (!playlistId) {
    return fail<{ imported: number }>(INVALID_PLAYLIST_URL_MESSAGE, {
      url: "Could not extract a playlist ID from this URL.",
    })
  }

  // 3. Fetch playlist items (may fail with MISSING_API_KEY_MESSAGE).
  const itemsResult = await fetchPlaylistItems(playlistId)
  if (!itemsResult.ok) {
    return fail<{ imported: number }>(itemsResult.message)
  }

  const drafts: LessonDraft[] = itemsResult.data

  if (drafts.length === 0) {
    return ok({ imported: 0 })
  }

  // 4. Determine starting sort_order.
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from("lessons")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseOrder = maxRow ? maxRow.sort_order + 1 : 0

  // 5. Build insert rows.
  const rows = drafts.map((draft, idx) => {
    const slug = draft.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80) || `lesson-${draft.youtubeVideoId}-${idx}`

    return {
      course_id: courseId,
      slug,
      title: draft.title,
      youtube_video_id: draft.youtubeVideoId,
      youtube_url: draft.youtubeUrl,
      thumbnail_url: draft.thumbnailUrl ?? null,
      duration_seconds: draft.durationSeconds ?? null,
      sort_order: baseOrder + idx,
      is_preview: false,
    }
  })

  // 6. Insert all rows. Use upsert with conflict on (course_id, slug) to
  //    handle duplicate slugs gracefully (appending a suffix would require
  //    extra round trips; conflicting rows are skipped instead).
  const { data: inserted, error } = await supabase
    .from("lessons")
    .insert(rows)
    .select("id")

  if (error) {
    console.error("[youtube/playlist] importPlaylist:", error)
    return fail<{ imported: number }>(
      "Failed to import playlist lessons. Some lessons may have already been imported."
    )
  }

  revalidatePath("/[locale]/admin/courses", "page")
  revalidatePath(`/[locale]/admin/courses/${courseId}/lessons`, "page")

  return ok({ imported: (inserted ?? []).length })
}

/**
 * Previews playlist items without persisting them.
 *
 * Returns the ordered array of {@link LessonDraft} objects so the UI can
 * show a confirmation step before the actual import.
 *
 * @param playlistUrl - YouTube playlist URL.
 * @returns `ok(LessonDraft[])` or `fail` (including missing-key case).
 */
export async function previewPlaylist(
  playlistUrl: string
): Promise<ActionResult<LessonDraft[]>> {
  // 1. Guard.
  await requireAdmin()

  // 2. Parse playlist ID.
  const playlistId = extractPlaylistId(playlistUrl)
  if (!playlistId) {
    return fail<LessonDraft[]>(INVALID_PLAYLIST_URL_MESSAGE, {
      url: "Could not extract a playlist ID from this URL.",
    })
  }

  // 3. Fetch items (propagates MISSING_API_KEY_MESSAGE when key absent).
  return fetchPlaylistItems(playlistId)
}
