"use server"

import { randomUUID } from "crypto"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/require-user"
import { getIsAdmin } from "@/lib/auth/guards"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { toCoursePriceDTO, toPaymentDTO } from "@/lib/payments/types"
import type { CoursePriceDTO, PaymentDTO } from "@/lib/payments/types"
import { enrollInCourse } from "@/lib/courses/actions"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of a successful checkout session creation.
 *
 * SIMULATION-ONLY: no real card data is involved. These fields are used to
 * render the demo checkout page and confirm the simulated payment.
 */
export interface CheckoutSessionResult {
  /** Opaque session ID for this checkout (stored on the payments row). */
  checkoutSessionId: string
  /** Idempotency key used to confirm this specific simulated event. */
  simulationEventId: string
  /** Amount in smallest currency unit (e.g. cents). */
  amountCents: number
  /** ISO 4217 currency code. */
  currency: string
  /** Optional human-readable price label from course_prices. */
  displayLabel: string | null
  /** UUID of the course being purchased. */
  courseId: string
  /** Slug of the course for post-payment redirect. */
  courseSlug: string
}

// ---------------------------------------------------------------------------
// getActiveCoursePrice
// ---------------------------------------------------------------------------

/**
 * Returns the active price for a course, or null when the course is free.
 *
 * Uses the publishable-key client; RLS permits anon+authenticated to read
 * is_active prices for published courses.
 *
 * @param courseId - UUID of the course.
 */
export async function getActiveCoursePrice(
  courseId: string
): Promise<CoursePriceDTO | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("course_prices")
    .select(
      "id, course_id, amount_cents, currency, display_label, is_active, created_at, updated_at"
    )
    .eq("course_id", courseId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ? toCoursePriceDTO(data) : null
}

// ---------------------------------------------------------------------------
// hasPaidAccess
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has access to a paid course.
 *
 * Access is granted when any of these are true:
 * - The user is an admin (instructor): always bypass payment.
 * - The course has no active price (free course).
 * - A payments row with status='paid' exists for this user+course.
 *
 * @param userId   - UUID of the user.
 * @param courseId - UUID of the course.
 */
export async function hasPaidAccess(
  userId: string,
  courseId: string
): Promise<boolean> {
  // Admin bypass.
  const isAdmin = await getIsAdmin()
  if (isAdmin) return true

  const supabase = await createClient()

  // Free course check.
  const activePrice = await getActiveCoursePrice(courseId)
  if (!activePrice) return true

  // Paid payment check.
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle()

  return data !== null
}

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------

/**
 * Creates a simulated checkout session for a paid course.
 *
 * SIMULATION-ONLY: no real card processing occurs. This action:
 * 1. Verifies the user is authenticated (requireUser).
 * 2. Looks up the active price for the course.
 * 3. Generates a checkout_session_id and simulation_event_id (UUIDs).
 * 4. Creates a pending payments row.
 * 5. Returns the session data for the checkout UI.
 *
 * @param courseId - UUID of the course to purchase.
 * @returns `ok(CheckoutSessionResult)` or `fail(message)`.
 */
export async function createCheckoutSession(
  courseId: string
): Promise<ActionResult<CheckoutSessionResult>> {
  const userId = await requireUser()
  const supabase = await createClient()

  // Check if user already has access.
  const alreadyAccess = await hasPaidAccess(userId, courseId)
  if (alreadyAccess) {
    return fail<CheckoutSessionResult>("alreadyPaid")
  }

  // Look up the course.
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug")
    .eq("id", courseId)
    .eq("status", "published")
    .single()

  if (!course) {
    return fail<CheckoutSessionResult>("Course not found.")
  }

  // Look up the active price.
  const activePrice = await getActiveCoursePrice(courseId)
  if (!activePrice) {
    return fail<CheckoutSessionResult>("noPriceFound")
  }

  const checkoutSessionId = randomUUID()
  const simulationEventId = randomUUID()

  // Create a pending payment row.
  const { error: insertError } = await supabase.from("payments").insert({
    user_id: userId,
    course_id: courseId,
    amount_cents: activePrice.amountCents,
    currency: activePrice.currency,
    provider: "simulation",
    status: "pending",
    checkout_session_id: checkoutSessionId,
    simulation_event_id: simulationEventId,
    fake_payment_summary: `Simulated pending payment of ${(activePrice.amountCents / 100).toFixed(2)} ${activePrice.currency.toUpperCase()} for course ${courseId}`,
  })

  if (insertError) {
    console.error(
      "[payments/checkout] createCheckoutSession insert:",
      insertError
    )
    return fail<CheckoutSessionResult>(
      "Failed to create checkout session. Please try again."
    )
  }

  return ok<CheckoutSessionResult>({
    checkoutSessionId,
    simulationEventId,
    amountCents: activePrice.amountCents,
    currency: activePrice.currency,
    displayLabel: activePrice.displayLabel,
    courseId,
    courseSlug: course.slug,
  })
}

// ---------------------------------------------------------------------------
// confirmSimulatedPayment
// ---------------------------------------------------------------------------

/**
 * Confirms a simulated payment and enrolls the user in the course.
 *
 * SIMULATION-ONLY: sets payments.status='paid' and inserts an enrollment.
 *
 * Idempotency: the simulation_event_id UNIQUE constraint prevents
 * double-processing. If the insert fails with 23505, we check whether the
 * existing payment is already 'paid' and treat it as success.
 *
 * @param courseId           - UUID of the course.
 * @param simulationEventId  - The idempotency key from the checkout session.
 * @returns `ok(PaymentDTO)` on success or `fail(message)` on error.
 */
export async function confirmSimulatedPayment(
  courseId: string,
  simulationEventId: string
): Promise<ActionResult<PaymentDTO>> {
  const userId = await requireUser()
  const supabase = await createClient()

  if (!simulationEventId) {
    return fail<PaymentDTO>("simulationEventId is required.")
  }

  // Find the pending payment by simulationEventId + user + course.
  const { data: payment, error: findError } = await supabase
    .from("payments")
    .select(
      "id, user_id, course_id, amount_cents, currency, provider, status, checkout_session_id, simulation_event_id, fake_payment_summary, created_at, updated_at"
    )
    .eq("simulation_event_id", simulationEventId)
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (findError) {
    console.error(
      "[payments/checkout] confirmSimulatedPayment find:",
      findError
    )
    return fail<PaymentDTO>("Could not find payment record.")
  }

  if (!payment) {
    return fail<PaymentDTO>("Payment session not found or already expired.")
  }

  // Idempotency: already paid.
  if (payment.status === "paid") {
    return ok<PaymentDTO>(toPaymentDTO(payment))
  }

  // Mark as paid.
  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({
      status: "paid",
      fake_payment_summary: `Simulated confirmed payment of ${(payment.amount_cents / 100).toFixed(2)} ${payment.currency.toUpperCase()} for course ${courseId}`,
    })
    .eq("id", payment.id)
    .select(
      "id, user_id, course_id, amount_cents, currency, provider, status, checkout_session_id, simulation_event_id, fake_payment_summary, created_at, updated_at"
    )
    .single()

  if (updateError || !updated) {
    console.error(
      "[payments/checkout] confirmSimulatedPayment update:",
      updateError
    )
    return fail<PaymentDTO>("Failed to confirm payment. Please try again.")
  }

  // Enroll the user in the course now that payment is confirmed.
  const enrollResult = await enrollInCourse({ courseId })
  if (!enrollResult.ok) {
    console.error(
      "[payments/checkout] confirmSimulatedPayment enroll:",
      enrollResult.message
    )
    // Non-fatal: the payment succeeded; enrollment failure is a data issue.
    // Log but return success so the user knows the payment went through.
  }

  return ok<PaymentDTO>(toPaymentDTO(updated))
}
