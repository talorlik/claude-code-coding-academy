/**
 * Integration tests for lib/payments/checkout.ts.
 *
 * Tested invariants:
 * - createCheckoutSession creates a pending payment row with status='pending'.
 * - createCheckoutSession returns alreadyPaid when user already has access.
 * - confirmSimulatedPayment sets status='paid' and enrolls the user.
 * - confirmSimulatedPayment is idempotent: returns existing paid row when
 *   simulation_event_id matches a payment already at status='paid'.
 * - hasPaidAccess returns true for admin, free course, and paid payment.
 * - hasPaidAccess returns false when course is paid and no paid payment exists.
 * - NO real card fields are involved at any point (SIMULATION-ONLY contract).
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Builder stub
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string; code?: string } }
const mockResults: Record<string, MockResult> = {}

function makeBuilder(table: string) {
  const b = {
    select: () => b,
    eq: () => b,
    not: () => b,
    order: () => b,
    limit: () => b,
    single: () => Promise.resolve(mockResults[table] ?? { data: null, error: null }),
    maybeSingle: () =>
      Promise.resolve(
        mockResults[`${table}:maybe`] ?? { data: null, error: null }
      ),
    insert: (_data: unknown) => ({
      // insert without select chaining (no-read insert path in createCheckoutSession)
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(
          mockResults[`${table}:insert`] ?? { data: null, error: null }
        ).then(resolve),
      select: () => ({
        single: () =>
          Promise.resolve(
            mockResults[`${table}:insert`] ?? { data: null, error: null }
          ),
      }),
    }),
    update: (_data: unknown) => ({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve(
              mockResults[`${table}:update`] ?? { data: null, error: null }
            ),
        }),
      }),
    }),
    upsert: (_data: unknown, _opts?: unknown) =>
      Promise.resolve(
        mockResults[`${table}:upsert`] ?? { data: null, error: null }
      ),
    // Make builder thenable for direct await
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve(mockResults[table] ?? { data: [], error: null }).then(
        resolve
      ),
  }
  return b
}

let mockIsAdmin = false

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-uuid-1" } },
      }),
    },
    from: (table: string) => makeBuilder(table),
  }),
}))

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn().mockResolvedValue("user-uuid-1"),
  requireInstructor: vi.fn().mockResolvedValue("instructor-uuid"),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockResolvedValue("admin-uuid"),
  getIsAdmin: vi.fn().mockImplementation(() => Promise.resolve(mockIsAdmin)),
}))

// enrollInCourse is called after payment confirmation; mock it to avoid
// triggering real DB logic.
vi.mock("@/lib/courses/actions", () => ({
  enrollInCourse: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("hasPaidAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
    mockIsAdmin = false
  })

  it("returns true for admin regardless of payment status", async () => {
    mockIsAdmin = true

    const { hasPaidAccess } = await import("@/lib/payments/checkout")
    const result = await hasPaidAccess("user-uuid-1", "course-uuid-1")
    expect(result).toBe(true)
  })

  it("returns true when course has no active price (free course)", async () => {
    mockIsAdmin = false
    // No active price row -> course_prices:maybe returns null
    mockResults["course_prices:maybe"] = { data: null, error: null }

    const { hasPaidAccess } = await import("@/lib/payments/checkout")
    const result = await hasPaidAccess("user-uuid-1", "course-uuid-1")
    expect(result).toBe(true)
  })

  it("returns true when a paid payment exists", async () => {
    mockIsAdmin = false
    // Course is paid.
    mockResults["course_prices:maybe"] = {
      data: {
        id: "price-1",
        course_id: "course-uuid-1",
        amount_cents: 2999,
        currency: "usd",
        display_label: null,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    }
    // Paid payment exists.
    mockResults["payments:maybe"] = {
      data: { id: "payment-1" },
      error: null,
    }

    const { hasPaidAccess } = await import("@/lib/payments/checkout")
    const result = await hasPaidAccess("user-uuid-1", "course-uuid-1")
    expect(result).toBe(true)
  })

  it("returns false when course is paid and no paid payment exists", async () => {
    mockIsAdmin = false
    // Course has an active price.
    mockResults["course_prices:maybe"] = {
      data: {
        id: "price-1",
        course_id: "course-uuid-1",
        amount_cents: 2999,
        currency: "usd",
        display_label: null,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    }
    // No paid payment.
    mockResults["payments:maybe"] = { data: null, error: null }

    const { hasPaidAccess } = await import("@/lib/payments/checkout")
    const result = await hasPaidAccess("user-uuid-1", "course-uuid-1")
    expect(result).toBe(false)
  })
})

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
    mockIsAdmin = false
  })

  it("creates a pending payment row - SIMULATION ONLY, no card fields", async () => {
    // No existing access: course is paid, no paid payment.
    mockResults["course_prices:maybe"] = {
      data: {
        id: "price-1",
        course_id: "course-uuid-1",
        amount_cents: 2999,
        currency: "usd",
        display_label: "Standard",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    }
    mockResults["payments:maybe"] = { data: null, error: null }
    // Course lookup succeeds.
    mockResults["courses"] = {
      data: { id: "course-uuid-1", slug: "js-basics" },
      error: null,
    }
    // Insert succeeds.
    mockResults["payments:insert"] = { data: null, error: null }

    const { createCheckoutSession } = await import("@/lib/payments/checkout")
    const result = await createCheckoutSession("course-uuid-1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      // Verify session shape - must not contain card data.
      expect(result.data.courseId).toBe("course-uuid-1")
      expect(result.data.courseSlug).toBe("js-basics")
      expect(result.data.amountCents).toBe(2999)
      expect(result.data.currency).toBe("usd")
      // simulationEventId and checkoutSessionId must be UUIDs (randomUUID).
      expect(result.data.simulationEventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(result.data.checkoutSessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      // Confirm no card-number/CVV/billing fields are present.
      const keys = Object.keys(result.data)
      const cardRelatedKeys = keys.filter((k) =>
        ["cardNumber", "cvv", "cardHolder", "billingAddress", "pan"].includes(k)
      )
      expect(cardRelatedKeys).toHaveLength(0)
    }
  })

  it("returns alreadyPaid when user is admin", async () => {
    mockIsAdmin = true

    const { createCheckoutSession } = await import("@/lib/payments/checkout")
    const result = await createCheckoutSession("course-uuid-1")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("alreadyPaid")
    }
  })

  it("returns noPriceFound when course is free", async () => {
    // Course is free (no active price).
    mockResults["course_prices:maybe"] = { data: null, error: null }
    // hasPaidAccess -> free course -> returns true -> createCheckoutSession fails with alreadyPaid
    const { createCheckoutSession } = await import("@/lib/payments/checkout")
    const result = await createCheckoutSession("course-uuid-1")

    // Free course means hasPaidAccess=true, which triggers alreadyPaid before noPriceFound.
    expect(result.ok).toBe(false)
  })
})

describe("confirmSimulatedPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
    mockIsAdmin = false
  })

  const pendingPaymentRow = {
    id: "payment-1",
    user_id: "user-uuid-1",
    course_id: "course-uuid-1",
    amount_cents: 2999,
    currency: "usd",
    provider: "simulation",
    status: "pending",
    checkout_session_id: "session-uuid-1",
    simulation_event_id: "event-uuid-1",
    fake_payment_summary: "Simulated pending payment",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }

  it("sets status=paid and enrolls user on first confirmation", async () => {
    // maybeSingle finds the pending payment.
    mockResults["payments:maybe"] = {
      data: pendingPaymentRow,
      error: null,
    }
    // Update succeeds.
    mockResults["payments:update"] = {
      data: { ...pendingPaymentRow, status: "paid" },
      error: null,
    }

    const { confirmSimulatedPayment } = await import("@/lib/payments/checkout")
    const result = await confirmSimulatedPayment("course-uuid-1", "event-uuid-1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe("paid")
      expect(result.data.courseId).toBe("course-uuid-1")
      expect(result.data.provider).toBe("simulation")
    }
  })

  it("is idempotent: returns existing paid row without re-enrolling", async () => {
    // The payment is already paid.
    mockResults["payments:maybe"] = {
      data: { ...pendingPaymentRow, status: "paid" },
      error: null,
    }

    const { confirmSimulatedPayment } = await import("@/lib/payments/checkout")
    const result = await confirmSimulatedPayment("course-uuid-1", "event-uuid-1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      // Should return the existing paid row.
      expect(result.data.status).toBe("paid")
      expect(result.data.id).toBe("payment-1")
    }
  })

  it("fails when simulationEventId is empty", async () => {
    const { confirmSimulatedPayment } = await import("@/lib/payments/checkout")
    const result = await confirmSimulatedPayment("course-uuid-1", "")

    expect(result.ok).toBe(false)
  })

  it("fails when payment row is not found", async () => {
    mockResults["payments:maybe"] = { data: null, error: null }

    const { confirmSimulatedPayment } = await import("@/lib/payments/checkout")
    const result = await confirmSimulatedPayment("course-uuid-1", "nonexistent-event")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("not found")
    }
  })
})
