import type { Database } from "@/lib/supabase/database.types"

type ClassGroupRow = Database["public"]["Tables"]["class_groups"]["Row"]
type ClassGroupMemberRow =
  Database["public"]["Tables"]["class_group_members"]["Row"]
type GroupProgressSummaryRow =
  Database["public"]["Views"]["group_progress_summary"]["Row"]

/**
 * DTO for a class group (cohort) managed by an instructor.
 * Maps from the `class_groups` table row.
 */
export interface ClassGroupDTO {
  /** UUID primary key. */
  id: string
  /** URL-safe slug, unique across all groups. */
  slug: string
  /** Display name. */
  name: string
  /** Instructor who created the group, or null when the creator was deleted. */
  createdBy: string | null
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last update. */
  updatedAt: string
}

/**
 * DTO for a single group membership record.
 * Maps from the `class_group_members` table row.
 */
export interface ClassGroupMemberDTO {
  /** UUID primary key of the membership record. */
  id: string
  /** Group the user belongs to. */
  groupId: string
  /** User who is a member. */
  userId: string
  /** ISO timestamp when the user was added to the group. */
  createdAt: string
}

/**
 * Aggregate progress summary for a group within a course.
 * Derived from the `group_progress_summary` view.
 */
export interface GroupProgressSummary {
  /** Group this summary applies to. */
  groupId: string | null
  /** Course this summary applies to. */
  courseId: string | null
  /** Number of group members enrolled in the course. */
  enrolledCount: number | null
  /** Number of members who have completed the course. */
  completedCount: number | null
  /** Total number of members in the group. */
  memberCount: number | null
  /**
   * Average completion percentage across enrolled members.
   * Null when no members are enrolled.
   */
  avgProgressPercent: number | null
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * Maps a raw `class_groups` row to a {@link ClassGroupDTO}.
 */
export function toClassGroupDTO(row: ClassGroupRow): ClassGroupDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Maps a raw `class_group_members` row to a {@link ClassGroupMemberDTO}.
 */
export function toClassGroupMemberDTO(
  row: ClassGroupMemberRow
): ClassGroupMemberDTO {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

/**
 * Maps a raw `group_progress_summary` view row to a {@link GroupProgressSummary}.
 */
export function toGroupProgressSummary(
  row: GroupProgressSummaryRow
): GroupProgressSummary {
  return {
    groupId: row.group_id,
    courseId: row.course_id,
    enrolledCount: row.enrolled_count,
    completedCount: row.completed_count,
    memberCount: row.member_count,
    avgProgressPercent: row.avg_progress_percent,
  }
}
