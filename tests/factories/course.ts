import {
  deterministicUuid,
  ENTITY_CODES,
  FACTORY_TIMESTAMP,
  nextSequence,
} from "./sequence"

/**
 * Course difficulty level mirroring the planned `course_level` Postgres enum
 * (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.2).
 */
export type CourseLevel = "beginner" | "intermediate" | "advanced"

/**
 * Course lifecycle status mirroring the planned `course_status` Postgres
 * enum (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.2).
 */
export type CourseStatus = "draft" | "published" | "archived"

/**
 * Course content language per the planned `courses.language` column
 * (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.3).
 */
export type CourseLanguage = "en" | "he" | "mixed"

/**
 * Row shape of the planned `courses` table
 * (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.3).
 *
 * Defined locally because domain types do not exist yet; batch 03
 * introduces the real database types, at which point this interface should
 * be replaced by (or asserted against) the generated row type.
 */
export interface CourseFactoryRecord {
  id: string
  slug: string
  title: string
  description: string
  level: CourseLevel
  cover_image_url: string | null
  status: CourseStatus
  language: CourseLanguage
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Builds a deterministic course record.
 *
 * Each call consumes one number from the shared factory sequence; identity
 * fields derive from that number and timestamps are fixed. Pass `overrides`
 * to pin any field - overrides always win over generated values.
 */
export function buildCourse(
  overrides: Partial<CourseFactoryRecord> = {}
): CourseFactoryRecord {
  const seq = nextSequence()
  return {
    id: deterministicUuid(ENTITY_CODES.course, seq),
    slug: `course-${seq}`,
    title: `Course ${seq}`,
    description: `Deterministic description for course ${seq}.`,
    level: "beginner",
    cover_image_url: null,
    status: "published",
    language: "en",
    created_by: deterministicUuid(ENTITY_CODES.user, seq),
    created_at: FACTORY_TIMESTAMP,
    updated_at: FACTORY_TIMESTAMP,
    ...overrides,
  }
}
