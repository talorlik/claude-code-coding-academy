/**
 * Unit tests for the pure badge computation function in lib/dashboard/badges.ts.
 *
 * No database, no async, no I/O. The function takes plain objects and returns
 * a plain array.
 */

import { describe, expect, it } from "vitest"

import {
  computeAchievementBadges,
  type BadgeEnrollment,
} from "@/lib/dashboard/badges"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noEnrollments(): BadgeEnrollment[] {
  return []
}

function completedBeginner(): BadgeEnrollment {
  return { completedAt: "2026-01-01T00:00:00Z", courseLevel: "beginner" }
}

function completedIntermediate(): BadgeEnrollment {
  return { completedAt: "2026-01-01T00:00:00Z", courseLevel: "intermediate" }
}

function notCompleted(level = "beginner"): BadgeEnrollment {
  return { completedAt: null, courseLevel: level }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeAchievementBadges", () => {
  it("returns all badges locked for a fresh user with no enrollments", () => {
    const badges = computeAchievementBadges(noEnrollments(), 0)
    expect(badges).toHaveLength(3)
    for (const b of badges) {
      expect(b.earned).toBe(false)
    }
  })

  it("earns first_course_completed when any enrollment has completedAt set", () => {
    const badges = computeAchievementBadges([completedIntermediate()], 0)
    const badge = badges.find((b) => b.id === "first_course_completed")
    expect(badge?.earned).toBe(true)
  })

  it("does NOT earn first_course_completed when no enrollment is completed", () => {
    const badges = computeAchievementBadges([notCompleted()], 2)
    const badge = badges.find((b) => b.id === "first_course_completed")
    expect(badge?.earned).toBe(false)
  })

  it("earns five_lessons_this_week at exactly 5 weekly lessons", () => {
    const badges = computeAchievementBadges(noEnrollments(), 5)
    const badge = badges.find((b) => b.id === "five_lessons_this_week")
    expect(badge?.earned).toBe(true)
  })

  it("does NOT earn five_lessons_this_week at 4 weekly lessons", () => {
    const badges = computeAchievementBadges(noEnrollments(), 4)
    const badge = badges.find((b) => b.id === "five_lessons_this_week")
    expect(badge?.earned).toBe(false)
  })

  it("earns five_lessons_this_week when count exceeds 5", () => {
    const badges = computeAchievementBadges(noEnrollments(), 10)
    const badge = badges.find((b) => b.id === "five_lessons_this_week")
    expect(badge?.earned).toBe(true)
  })

  it("earns beginner_course_finished when a completed beginner enrollment exists", () => {
    const badges = computeAchievementBadges([completedBeginner()], 0)
    const badge = badges.find((b) => b.id === "beginner_course_finished")
    expect(badge?.earned).toBe(true)
  })

  it("does NOT earn beginner_course_finished for a completed non-beginner course", () => {
    const badges = computeAchievementBadges([completedIntermediate()], 0)
    const badge = badges.find((b) => b.id === "beginner_course_finished")
    expect(badge?.earned).toBe(false)
  })

  it("does NOT earn beginner_course_finished for an incomplete beginner enrollment", () => {
    const badges = computeAchievementBadges([notCompleted("beginner")], 0)
    const badge = badges.find((b) => b.id === "beginner_course_finished")
    expect(badge?.earned).toBe(false)
  })

  it("earns all three badges simultaneously when all conditions are met", () => {
    const enrollments: BadgeEnrollment[] = [
      completedBeginner(),
      completedIntermediate(),
    ]
    const badges = computeAchievementBadges(enrollments, 7)
    for (const b of badges) {
      expect(b.earned).toBe(true)
    }
  })

  it("returns exactly the three expected badge ids in any order", () => {
    const badges = computeAchievementBadges(noEnrollments(), 0)
    const ids = badges.map((b) => b.id).sort()
    expect(ids).toEqual([
      "beginner_course_finished",
      "first_course_completed",
      "five_lessons_this_week",
    ])
  })
})
