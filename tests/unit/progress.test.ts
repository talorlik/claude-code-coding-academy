import { describe, expect, it } from "vitest"

import { calculateCourseProgress } from "@/lib/progress/calculate"
import type { ProgressLesson } from "@/lib/progress/calculate"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLessons(count: number): ProgressLesson[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `lesson-${i + 1}`,
    sortOrder: i,
  }))
}

// ---------------------------------------------------------------------------
// Zero lessons
// ---------------------------------------------------------------------------

describe("calculateCourseProgress - zero lessons", () => {
  it("returns percent 0 when there are no lessons", () => {
    const result = calculateCourseProgress(0, [])
    expect(result.percent).toBe(0)
  })

  it("returns isComplete false when there are no lessons", () => {
    const result = calculateCourseProgress(0, [])
    expect(result.isComplete).toBe(false)
  })

  it("returns nextLessonId null when there are no lessons", () => {
    const result = calculateCourseProgress(0, [])
    expect(result.nextLessonId).toBeNull()
  })

  it("returns zero counts when there are no lessons", () => {
    const result = calculateCourseProgress(0, [])
    expect(result.totalLessons).toBe(0)
    expect(result.completedLessons).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Partial completion
// ---------------------------------------------------------------------------

describe("calculateCourseProgress - partial completion", () => {
  it("calculates percent correctly for 1-of-3 completed", () => {
    const result = calculateCourseProgress(3, ["lesson-1"], makeLessons(3))
    expect(result.percent).toBe(33) // Math.round(1/3 * 100)
  })

  it("calculates percent correctly for 2-of-3 completed", () => {
    const result = calculateCourseProgress(3, ["lesson-1", "lesson-2"], makeLessons(3))
    expect(result.percent).toBe(67) // Math.round(2/3 * 100)
  })

  it("calculates percent correctly for 1-of-2 completed", () => {
    const result = calculateCourseProgress(2, ["lesson-1"], makeLessons(2))
    expect(result.percent).toBe(50)
  })

  it("returns isComplete false for partial completion", () => {
    const result = calculateCourseProgress(3, ["lesson-1"], makeLessons(3))
    expect(result.isComplete).toBe(false)
  })

  it("sets completedLessons to the number of completed IDs", () => {
    const result = calculateCourseProgress(3, ["lesson-1", "lesson-2"], makeLessons(3))
    expect(result.completedLessons).toBe(2)
  })

  it("accepts a Set for completedLessonIds", () => {
    const result = calculateCourseProgress(
      3,
      new Set(["lesson-1", "lesson-2"]),
      makeLessons(3)
    )
    expect(result.completedLessons).toBe(2)
    expect(result.percent).toBe(67)
  })
})

// ---------------------------------------------------------------------------
// Full completion
// ---------------------------------------------------------------------------

describe("calculateCourseProgress - full completion", () => {
  it("returns percent 100 when all lessons are complete", () => {
    const lessons = makeLessons(3)
    const result = calculateCourseProgress(
      3,
      lessons.map((l) => l.id),
      lessons
    )
    expect(result.percent).toBe(100)
  })

  it("returns isComplete true when all lessons are complete", () => {
    const lessons = makeLessons(3)
    const result = calculateCourseProgress(
      3,
      lessons.map((l) => l.id),
      lessons
    )
    expect(result.isComplete).toBe(true)
  })

  it("returns nextLessonId null when course is fully complete", () => {
    const lessons = makeLessons(3)
    const result = calculateCourseProgress(
      3,
      lessons.map((l) => l.id),
      lessons
    )
    expect(result.nextLessonId).toBeNull()
  })

  it("sets completedLessons equal to totalLessons on full completion", () => {
    const lessons = makeLessons(5)
    const result = calculateCourseProgress(
      5,
      lessons.map((l) => l.id),
      lessons
    )
    expect(result.completedLessons).toBe(5)
    expect(result.totalLessons).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// nextLessonId selection
// ---------------------------------------------------------------------------

describe("calculateCourseProgress - nextLessonId selection", () => {
  it("returns the first unwatched lesson by sortOrder", () => {
    // lesson-2 is completed; lesson-1 and lesson-3 are not.
    const lessons: ProgressLesson[] = [
      { id: "lesson-1", sortOrder: 0 },
      { id: "lesson-2", sortOrder: 1 },
      { id: "lesson-3", sortOrder: 2 },
    ]
    const result = calculateCourseProgress(3, ["lesson-2"], lessons)
    // lesson-1 has sortOrder 0, which is lower than lesson-3's sortOrder 2.
    expect(result.nextLessonId).toBe("lesson-1")
  })

  it("returns the second lesson when first is complete", () => {
    const lessons = makeLessons(4)
    const result = calculateCourseProgress(4, ["lesson-1"], lessons)
    expect(result.nextLessonId).toBe("lesson-2")
  })

  it("returns null when no lessons array is provided", () => {
    const result = calculateCourseProgress(3, ["lesson-1"])
    expect(result.nextLessonId).toBeNull()
  })

  it("returns null when lessons array is empty", () => {
    const result = calculateCourseProgress(3, ["lesson-1"], [])
    expect(result.nextLessonId).toBeNull()
  })

  it("selects by sortOrder even when IDs are not sequential", () => {
    const lessons: ProgressLesson[] = [
      { id: "alpha", sortOrder: 10 },
      { id: "beta", sortOrder: 20 },
      { id: "gamma", sortOrder: 30 },
    ]
    const result = calculateCourseProgress(3, ["beta"], lessons)
    expect(result.nextLessonId).toBe("alpha")
  })
})

// ---------------------------------------------------------------------------
// Percent rounding
// ---------------------------------------------------------------------------

describe("calculateCourseProgress - percent rounding", () => {
  it("rounds 33.33...% to 33", () => {
    const result = calculateCourseProgress(3, ["lesson-1"], makeLessons(3))
    expect(result.percent).toBe(33)
  })

  it("rounds 66.66...% to 67", () => {
    const result = calculateCourseProgress(3, ["lesson-1", "lesson-2"], makeLessons(3))
    expect(result.percent).toBe(67)
  })

  it("rounds 16.66...% (1/6) to 17", () => {
    const result = calculateCourseProgress(6, ["lesson-1"], makeLessons(6))
    expect(result.percent).toBe(17)
  })

  it("never returns more than 100", () => {
    // Simulate completedLessonIds larger than totalLessons (data inconsistency).
    const ids = Array.from({ length: 10 }, (_, i) => `x-${i}`)
    const result = calculateCourseProgress(3, ids, makeLessons(3))
    expect(result.percent).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// lastWatchedAt forwarding
// ---------------------------------------------------------------------------

describe("calculateCourseProgress - lastWatchedAt", () => {
  it("forwards the supplied lastWatchedAt timestamp", () => {
    const ts = "2026-01-01T12:00:00Z"
    const result = calculateCourseProgress(3, ["lesson-1"], makeLessons(3), ts)
    expect(result.lastWatchedAt).toBe(ts)
  })

  it("defaults lastWatchedAt to null when not supplied", () => {
    const result = calculateCourseProgress(3, ["lesson-1"], makeLessons(3))
    expect(result.lastWatchedAt).toBeNull()
  })
})
