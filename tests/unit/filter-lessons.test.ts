import { describe, expect, it } from "vitest"

import { filterLessons } from "@/lib/courses/filter-lessons"

/** Minimal lesson stubs - filterLessons only reads title + description. */
const lessons = [
  { title: "Intro to HTML", description: "Tags and structure" },
  { title: "CSS Basics", description: "Selectors and the box model" },
  { title: "Flexbox", description: null },
  { title: "Async JavaScript", description: "Promises and await" },
]

describe("filterLessons", () => {
  it("returns all lessons for a blank query", () => {
    expect(filterLessons(lessons, "")).toHaveLength(4)
    expect(filterLessons(lessons, "   ")).toHaveLength(4)
  })

  it("matches on title, case-insensitively", () => {
    const r = filterLessons(lessons, "css")
    expect(r.map((l) => l.title)).toEqual(["CSS Basics"])
  })

  it("matches on description", () => {
    const r = filterLessons(lessons, "promises")
    expect(r.map((l) => l.title)).toEqual(["Async JavaScript"])
  })

  it("tolerates a null description", () => {
    const r = filterLessons(lessons, "flexbox")
    expect(r.map((l) => l.title)).toEqual(["Flexbox"])
  })

  it("returns an empty list when nothing matches", () => {
    expect(filterLessons(lessons, "rust")).toEqual([])
  })

  it("preserves input order among matches", () => {
    // "s" appears in several lessons; matches must keep the input ordering.
    const r = filterLessons(lessons, "s")
    const titles = r.map((l) => l.title)
    const expectedOrder = lessons
      .filter((l) => l.title.toLowerCase().includes("s") || (l.description ?? "").toLowerCase().includes("s"))
      .map((l) => l.title)
    expect(titles).toEqual(expectedOrder)
  })
})
