import { beforeEach, describe, expect, it } from "vitest"

import { buildCourse } from "@/tests/factories/course"
import { buildLesson } from "@/tests/factories/lesson"
import { resetFactorySequence } from "@/tests/factories/sequence"
import { buildUser } from "@/tests/factories/user"

/**
 * Smoke test for the Vitest harness and the shared factories. Proves the
 * runner, jsdom environment, `@` alias, and setup file are wired, and pins
 * the factory contract: distinct ids per build, full determinism across
 * resets, and overrides winning over generated values.
 */
describe("test data factories", () => {
  beforeEach(() => {
    resetFactorySequence()
  })

  it("produces distinct identities for sequential builds", () => {
    const first = buildCourse()
    const second = buildCourse()
    expect(first.id).not.toBe(second.id)
    expect(first.slug).not.toBe(second.slug)
  })

  it("is fully deterministic across sequence resets", () => {
    const before = [buildCourse(), buildLesson(), buildUser()]
    resetFactorySequence()
    const after = [buildCourse(), buildLesson(), buildUser()]
    expect(after).toEqual(before)
  })

  it("lets overrides win over generated values", () => {
    const course = buildCourse({ title: "Intro to Rust", status: "draft" })
    expect(course.title).toBe("Intro to Rust")
    expect(course.status).toBe("draft")
    // Non-overridden fields still come from the sequence.
    expect(course.slug).toBe("course-1")
  })

  it("shares one sequence across entity types", () => {
    const user = buildUser()
    const lesson = buildLesson()
    expect(user.id.endsWith("000000000001")).toBe(true)
    expect(lesson.id.endsWith("000000000002")).toBe(true)
  })

  it("keeps factory emails on the reserved example.com domain", () => {
    expect(buildUser().email).toMatch(/@example\.com$/)
  })
})
