import type { Database } from "@/lib/supabase/database.types"

type CoursePriceRow = Database["public"]["Tables"]["course_prices"]["Row"]
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"]

/**
 * Payment lifecycle status. Mirrors the `payment_status` Postgres enum.
 */
export type PaymentStatus = Database["public"]["Enums"]["payment_status"]

/**
 * DTO for a course price entry.
 * Maps from the `course_prices` table row.
 */
export interface CoursePriceDTO {
  /** UUID primary key. */
  id: string
  /** Course this price applies to. */
  courseId: string
  /** Price in the smallest currency unit (e.g. cents for USD). */
  amountCents: number
  /** ISO 4217 currency code (e.g. "usd", "ils"). */
  currency: string
  /** Optional human-readable label (e.g. "Early Bird"). Null when not set. */
  displayLabel: string | null
  /** Whether this is the currently active price for the course. */
  isActive: boolean
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last update. */
  updatedAt: string
}

/**
 * DTO for a simulated payment record.
 * Maps from the `payments` table row.
 *
 * This is a simulation-only entity. No real card data is ever stored.
 * The `provider` field holds the simulation provider name (e.g. "simulation").
 */
export interface PaymentDTO {
  /** UUID primary key. */
  id: string
  /** User who initiated the payment. */
  userId: string
  /** Course being purchased. */
  courseId: string
  /** Amount charged in the smallest currency unit. */
  amountCents: number
  /** ISO 4217 currency code. */
  currency: string
  /** Payment provider identifier. Always "simulation" in this platform. */
  provider: string
  /** Current payment status. */
  status: PaymentStatus
  /**
   * Idempotency key for the simulated checkout session.
   * Null when not yet assigned.
   */
  checkoutSessionId: string | null
  /**
   * Idempotency key for the simulation event that confirmed this payment.
   * Used to prevent double-processing. Null when not yet set.
   */
  simulationEventId: string | null
  /**
   * Human-readable summary of the simulated transaction (e.g. "Simulated
   * payment of $29.99 for course XYZ"). Null when not yet generated.
   */
  fakeSummary: string | null
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last status update. */
  updatedAt: string
}

/**
 * Result returned after initiating a simulated checkout flow.
 */
export interface CheckoutResult {
  /** Whether the checkout was initiated successfully. */
  success: boolean
  /**
   * The created or retrieved payment record. Present on success.
   */
  payment?: PaymentDTO
  /** Human-facing error message. Present on failure. */
  error?: string
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * Maps a raw `course_prices` row to a {@link CoursePriceDTO}.
 */
export function toCoursePriceDTO(row: CoursePriceRow): CoursePriceDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    displayLabel: row.display_label,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Maps a raw `payments` row to a {@link PaymentDTO}.
 */
export function toPaymentDTO(row: PaymentRow): PaymentDTO {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    provider: row.provider,
    status: row.status,
    checkoutSessionId: row.checkout_session_id,
    simulationEventId: row.simulation_event_id,
    fakeSummary: row.fake_payment_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
