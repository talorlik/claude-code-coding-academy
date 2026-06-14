/**
 * Integration tests for lib/courses/actions.ts - submitReview.
 *
 * submitReview is a Tier-2 FormData action that redirects with a
 * `?notice=`/`?error=` code rather than returning an ActionResult, so the
 * i18n redirect is mocked to capture the href. The Supabase client is mocked
 * with the project's chainable-builder pattern plus a mock auth user and a
 * configurable enrollments lookup.
 *
 * Tested invariants:
 * - anon -> redirects with ?error=signInRequired.
 * - signed-in but NOT enrolled -> ?error=enrollmentRequired.
 * - enrolled -> upserts and redirects with ?notice=reviewSaved.
 * - invalid rating -> ?error=invalidRating (validation before the DB write).
 * - the upsert targets course_reviews with onConflict course_id,user_id
 *   (idempotent edit).
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Captured redirect
// ---------------------------------------------------------------------------

const redirect = vi.fn()
vi.mock("@/i18n/navigation", () => ({
  redirect: (args: { href: string; locale: string }) => redirect(args),
}))

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// ---------------------------------------------------------------------------
// Supabase builder mock
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string } }
const mockTableResults: Record<string, MockResult> = {}
let lastUpsert: { table: string; values: unknown; opts: unknown } | null = null

function makeBuilder(table: string) {
  const b: Record<string, (...args: unknown[]) => unknown> = {
    select: () => b,
    eq: () => b,
    maybeSingle: () =>
      Promise.resolve(
        mockTableResults[`${table}:maybeSingle`] ?? { data: null, error: null }
      ),
    upsert: (values: unknown, opts: unknown) => {
      lastUpsert = { table, values, opts }
      return Promise.resolve(
        mockTableResults[`${table}:upsert`] ?? { data: null, error: null }
      )
    },
  }
  return b
}

let mockAuthUser: { id: string } | null = null

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockAuthUser } })),
    },
    from: (table: string) => makeBuilder(table),
  }),
}))

const { submitReview } = await import("@/lib/courses/actions")

// ---------------------------------------------------------------------------
// Helpers + fixtures
// ---------------------------------------------------------------------------

const COURSE_ID = "550e8400-e29b-41d4-a716-446655440000"
const SLUG = "html-css-fundamentals"

function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

function setEnrolled(enrolled: boolean) {
  mockTableResults["enrollments:maybeSingle"] = {
    data: enrolled ? { id: "enr-1" } : null,
    error: null,
  }
}

function hrefOf(): string {
  return (redirect.mock.calls[0]?.[0]?.href as string) ?? ""
}

beforeEach(() => {
  redirect.mockClear()
  for (const k of Object.keys(mockTableResults)) delete mockTableResults[k]
  lastUpsert = null
  mockAuthUser = null
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("submitReview", () => {
  it("redirects with signInRequired when anonymous", async () => {
    mockAuthUser = null
    await submitReview(form({ courseId: COURSE_ID, slug: SLUG, rating: "5" }))
    expect(hrefOf()).toBe(`/courses/${SLUG}?error=signInRequired`)
    expect(lastUpsert).toBeNull()
  })

  it("redirects with enrollmentRequired when signed in but not enrolled", async () => {
    mockAuthUser = { id: "user-1" }
    setEnrolled(false)
    await submitReview(form({ courseId: COURSE_ID, slug: SLUG, rating: "4" }))
    expect(hrefOf()).toBe(`/courses/${SLUG}?error=enrollmentRequired`)
    expect(lastUpsert).toBeNull()
  })

  it("upserts and redirects with reviewSaved when enrolled", async () => {
    mockAuthUser = { id: "user-1" }
    setEnrolled(true)
    await submitReview(
      form({ courseId: COURSE_ID, slug: SLUG, rating: "5", body: "Great course" })
    )
    expect(hrefOf()).toBe(`/courses/${SLUG}?notice=reviewSaved`)
    expect(lastUpsert?.table).toBe("course_reviews")
    expect(lastUpsert?.opts).toMatchObject({ onConflict: "course_id,user_id" })
    expect(lastUpsert?.values).toMatchObject({
      course_id: COURSE_ID,
      user_id: "user-1",
      rating: 5,
      body: "Great course",
    })
  })

  it("treats a blank body as null (optional comment)", async () => {
    mockAuthUser = { id: "user-1" }
    setEnrolled(true)
    await submitReview(form({ courseId: COURSE_ID, slug: SLUG, rating: "3", body: "" }))
    expect(hrefOf()).toBe(`/courses/${SLUG}?notice=reviewSaved`)
    expect(lastUpsert?.values).toMatchObject({ rating: 3, body: null })
  })

  it("rejects an out-of-range rating before any write", async () => {
    mockAuthUser = { id: "user-1" }
    setEnrolled(true)
    await submitReview(form({ courseId: COURSE_ID, slug: SLUG, rating: "9" }))
    expect(hrefOf()).toBe(`/courses/${SLUG}?error=invalidRating`)
    expect(lastUpsert).toBeNull()
  })

  it("redirects with submissionFailed when the upsert errors", async () => {
    mockAuthUser = { id: "user-1" }
    setEnrolled(true)
    mockTableResults["course_reviews:upsert"] = {
      data: null,
      error: { message: "boom" },
    }
    await submitReview(form({ courseId: COURSE_ID, slug: SLUG, rating: "5" }))
    expect(hrefOf()).toBe(`/courses/${SLUG}?error=submissionFailed`)
  })

  it("falls back to /courses when the slug is forged (open-redirect guard)", async () => {
    mockAuthUser = null
    await submitReview(
      form({ courseId: COURSE_ID, slug: "//evil.com", rating: "5" })
    )
    expect(hrefOf()).toBe("/courses")
  })
})
