"use server"

import { createClient } from "@/lib/supabase/server"
import {
  toClassGroupDTO,
  toClassGroupMemberDTO,
  toGroupProgressSummary,
} from "@/lib/groups/types"
import type {
  ClassGroupDTO,
  ClassGroupMemberDTO,
  GroupProgressSummary,
} from "@/lib/groups/types"

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

/**
 * Returns all class groups, ordered by created_at descending.
 *
 * Admin-only: the caller MUST have already called requireAdmin() before
 * invoking this. RLS permits admin (instructor) reads on all rows.
 *
 * @returns Array of {@link ClassGroupDTO}.
 */
export async function listGroups(): Promise<ClassGroupDTO[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("class_groups")
    .select("id, slug, name, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[groups/queries] listGroups:", error)
    return []
  }

  return (data ?? []).map(toClassGroupDTO)
}

/**
 * Returns all members of a group.
 *
 * Admin-only: the caller MUST have already called requireAdmin().
 *
 * @param groupId - UUID of the group.
 * @returns Array of {@link ClassGroupMemberDTO}.
 */
export async function listGroupMembers(
  groupId: string
): Promise<ClassGroupMemberDTO[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("class_group_members")
    .select("id, group_id, user_id, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[groups/queries] listGroupMembers:", error)
    return []
  }

  return (data ?? []).map(toClassGroupMemberDTO)
}

/**
 * Returns group progress summaries from the `group_progress_summary` view.
 *
 * Admin-only: the caller MUST have already called requireAdmin().
 *
 * @param groupId - UUID of the group to summarise.
 * @returns Array of {@link GroupProgressSummary} (one row per course).
 */
export async function getGroupProgress(
  groupId: string
): Promise<GroupProgressSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("group_progress_summary")
    .select(
      "group_id, course_id, enrolled_count, completed_count, member_count, avg_progress_percent"
    )
    .eq("group_id", groupId)

  if (error) {
    console.error("[groups/queries] getGroupProgress:", error)
    return []
  }

  return (data ?? []).map(toGroupProgressSummary)
}

// ---------------------------------------------------------------------------
// Student queries
// ---------------------------------------------------------------------------

/**
 * Returns the groups the authenticated user belongs to.
 *
 * RLS scopes the `class_group_members` SELECT to rows where user_id =
 * auth.uid(). This function does NOT call requireAdmin(); it is safe to
 * call for any authenticated user.
 *
 * @param userId - UUID of the authenticated user.
 * @returns Array of {@link ClassGroupDTO} the user is a member of.
 */
export async function getMyGroups(userId: string): Promise<ClassGroupDTO[]> {
  const supabase = await createClient()

  // First get the group IDs the user belongs to.
  const { data: memberships, error: memberError } = await supabase
    .from("class_group_members")
    .select("group_id")
    .eq("user_id", userId)

  if (memberError) {
    console.error("[groups/queries] getMyGroups memberships:", memberError)
    return []
  }

  const groupIds = (memberships ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return []

  const { data, error } = await supabase
    .from("class_groups")
    .select("id, slug, name, created_by, created_at, updated_at")
    .in("id", groupIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[groups/queries] getMyGroups groups:", error)
    return []
  }

  return (data ?? []).map(toClassGroupDTO)
}

/**
 * Returns group progress summaries for all groups the user belongs to.
 *
 * RLS on `class_group_members` limits visibility to the user's own rows.
 * The `group_progress_summary` view uses security_invoker so RLS applies.
 *
 * @param userId - UUID of the authenticated user.
 * @returns Array of {@link GroupProgressSummary} for the user's groups.
 */
export async function getMyGroupProgress(
  userId: string
): Promise<GroupProgressSummary[]> {
  const supabase = await createClient()

  const { data: memberships, error: memberError } = await supabase
    .from("class_group_members")
    .select("group_id")
    .eq("user_id", userId)

  if (memberError || !memberships?.length) return []

  const groupIds = memberships.map((m) => m.group_id)

  const { data, error } = await supabase
    .from("group_progress_summary")
    .select(
      "group_id, course_id, enrolled_count, completed_count, member_count, avg_progress_percent"
    )
    .in("group_id", groupIds)

  if (error) {
    console.error("[groups/queries] getMyGroupProgress:", error)
    return []
  }

  return (data ?? []).map(toGroupProgressSummary)
}
