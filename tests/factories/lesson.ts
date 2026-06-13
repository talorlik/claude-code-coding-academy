import type { Database } from "@/lib/supabase/database.types"
import {
  deterministicUuid,
  ENTITY_CODES,
  FACTORY_TIMESTAMP,
  nextSequence,
} from "./sequence"

/**
 * Row type for the `lessons` table, sourced from the generated Supabase types.
 * All fields match the local interface that previously existed here, so no
 * factory callsites required updating.
 */
export type LessonFactoryRecord = Database["public"]["Tables"]["lessons"]["Row"]

/**
 * Builds a deterministic lesson record.
 *
 * Each call consumes one number from the shared factory sequence. The
 * default `course_id` is a deterministic placeholder; tests that need a
 * real relation should pass `buildLesson({ course_id: course.id })`. The
 * video id is an 11-character deterministic string matching YouTube's id
 * length, never a real video. Overrides always win over generated values.
 */
export function buildLesson(
  overrides: Partial<LessonFactoryRecord> = {}
): LessonFactoryRecord {
  const seq = nextSequence()
  const videoId = `vid${String(seq).padStart(8, "0")}`
  return {
    id: deterministicUuid(ENTITY_CODES.lesson, seq),
    course_id: deterministicUuid(ENTITY_CODES.course, seq),
    slug: `lesson-${seq}`,
    title: `Lesson ${seq}`,
    description: null,
    youtube_video_id: videoId,
    youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
    duration_seconds: 300,
    thumbnail_url: null,
    sort_order: seq,
    is_preview: false,
    created_at: FACTORY_TIMESTAMP,
    updated_at: FACTORY_TIMESTAMP,
    ...overrides,
  }
}
