import {
  deterministicUuid,
  ENTITY_CODES,
  FACTORY_TIMESTAMP,
  nextSequence,
} from "./sequence"

/**
 * Row shape of the planned `lessons` table
 * (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.3).
 *
 * Defined locally because domain types do not exist yet; batch 03
 * introduces the real database types, at which point this interface should
 * be replaced by (or asserted against) the generated row type.
 */
export interface LessonFactoryRecord {
  id: string
  course_id: string
  slug: string
  title: string
  description: string | null
  youtube_video_id: string
  youtube_url: string
  duration_seconds: number | null
  thumbnail_url: string | null
  sort_order: number
  is_preview: boolean
  created_at: string
  updated_at: string
}

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
