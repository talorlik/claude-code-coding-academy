"use server"

import { createClient } from "@/lib/supabase/server"
import { toCertificateDTO } from "@/lib/certificates/types"
import type { CertificateDTO } from "@/lib/certificates/types"

/**
 * Checks whether a user is eligible to receive a certificate for a course.
 *
 * Eligibility requires a completed enrollment (completed_at IS NOT NULL).
 * The enrollment.completed_at is set by the mark-watched flow when the final
 * lesson is marked watched and all lessons are done.
 *
 * Uses the request-scoped (publishable-key) client; RLS enforces that a
 * student can only see their own enrollment row.
 *
 * @param userId  - UUID of the user to check.
 * @param courseId - UUID of the course to check.
 * @returns `true` when the enrollment has a non-null completed_at.
 */
export async function isEligibleForCertificate(
  userId: string,
  courseId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("enrollments")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .not("completed_at", "is", null)
    .maybeSingle()

  return data !== null
}

/**
 * Returns all certificates belonging to the authenticated user.
 *
 * RLS ensures a student can only read their own rows; admins can read all.
 * The call uses the request-scoped client (no service role).
 *
 * @param userId - UUID of the authenticated user.
 * @returns Array of {@link CertificateDTO}, ordered by issued_at descending.
 */
export async function getMyCertificates(
  userId: string
): Promise<CertificateDTO[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("certificates")
    .select("id, user_id, course_id, issued_at, created_at, metadata")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false })

  if (error) {
    console.error("[certificates/queries] getMyCertificates:", error)
    return []
  }

  return (data ?? []).map(toCertificateDTO)
}

/**
 * Returns a single certificate for a user+course pair, or null.
 *
 * RLS ensures own-only access for students.
 *
 * @param userId   - UUID of the authenticated user.
 * @param courseId - UUID of the course.
 * @returns The {@link CertificateDTO} or null if not found.
 */
export async function getCertificateByCourse(
  userId: string,
  courseId: string
): Promise<CertificateDTO | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("certificates")
    .select("id, user_id, course_id, issued_at, created_at, metadata")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (error) {
    console.error("[certificates/queries] getCertificateByCourse:", error)
    return null
  }

  return data ? toCertificateDTO(data) : null
}

/**
 * Returns a certificate by its UUID.
 *
 * RLS ensures only the certificate owner (or admin) can read it.
 *
 * @param id - UUID of the certificate row.
 * @returns The {@link CertificateDTO} or null if not found / not permitted.
 */
export async function getCertificateById(
  id: string
): Promise<CertificateDTO | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("certificates")
    .select("id, user_id, course_id, issued_at, created_at, metadata")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[certificates/queries] getCertificateById:", error)
    return null
  }

  return data ? toCertificateDTO(data) : null
}
