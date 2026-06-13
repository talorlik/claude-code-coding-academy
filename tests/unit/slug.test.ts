/**
 * Unit tests for lib/utils/slug.ts - slugify().
 *
 * Covers: lowercasing, space/underscore/punctuation -> hyphen, leading/
 * trailing hyphen trim, consecutive-hyphen collapse, truncation at 80 chars,
 * already-valid input passthrough, empty/whitespace-only input, long strings,
 * diacritics/Latin accented chars, and Hebrew/non-ASCII stripping.
 */

import { describe, expect, it } from "vitest"
import { slugify } from "@/lib/utils/slug"

describe("slugify", () => {
  // -------------------------------------------------------------------------
  // Basic transformations
  // -------------------------------------------------------------------------

  it("lowercases ASCII letters", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("converts spaces to hyphens", () => {
    expect(slugify("intro to rust")).toBe("intro-to-rust")
  })

  it("converts underscores to hyphens", () => {
    expect(slugify("my_course_title")).toBe("my-course-title")
  })

  it("converts mixed separators to a single hyphen", () => {
    expect(slugify("foo  bar--baz__qux")).toBe("foo-bar-baz-qux")
  })

  it("strips leading hyphens", () => {
    expect(slugify("--leading")).toBe("leading")
  })

  it("strips trailing hyphens", () => {
    expect(slugify("trailing--")).toBe("trailing")
  })

  it("strips both leading and trailing hyphens", () => {
    expect(slugify("  --both--  ")).toBe("both")
  })

  it("collapses duplicate hyphens into one", () => {
    expect(slugify("a---b")).toBe("a-b")
  })

  // -------------------------------------------------------------------------
  // Punctuation and special characters
  // -------------------------------------------------------------------------

  it("strips punctuation and keeps letters/digits", () => {
    expect(slugify("React & TypeScript!")).toBe("react-typescript")
  })

  it("handles parentheses and brackets", () => {
    expect(slugify("Course (Part 1)")).toBe("course-part-1")
  })

  it("handles dots", () => {
    expect(slugify("v1.2.3")).toBe("v1-2-3")
  })

  it("keeps digits unchanged", () => {
    expect(slugify("Lesson 42")).toBe("lesson-42")
  })

  // -------------------------------------------------------------------------
  // Already-valid slug passthrough
  // -------------------------------------------------------------------------

  it("passes through an already-valid lowercase slug", () => {
    expect(slugify("already-valid-slug")).toBe("already-valid-slug")
  })

  it("passes through a single word", () => {
    expect(slugify("rust")).toBe("rust")
  })

  // -------------------------------------------------------------------------
  // Edge cases: empty / whitespace
  // -------------------------------------------------------------------------

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("")
  })

  it("returns empty string for whitespace-only input", () => {
    expect(slugify("   ")).toBe("")
  })

  it("returns empty string for hyphen-only input", () => {
    expect(slugify("---")).toBe("")
  })

  // -------------------------------------------------------------------------
  // Length cap at 80 characters
  // -------------------------------------------------------------------------

  it("truncates to 80 characters", () => {
    const long = "a".repeat(100)
    expect(slugify(long)).toBe("a".repeat(80))
  })

  it("does not leave a trailing hyphen after truncation", () => {
    // 79 "a"s + a space + "b" -> at 80 chars the hyphen from the space
    // would land exactly at position 80, which should be trimmed.
    const input = "a".repeat(79) + " b"
    const result = slugify(input)
    expect(result).not.toMatch(/-$/)
    expect(result.length).toBeLessThanOrEqual(80)
  })

  // -------------------------------------------------------------------------
  // Diacritics / Latin accented characters
  // -------------------------------------------------------------------------

  it("strips acute accents from Latin letters", () => {
    expect(slugify("Café au lait")).toBe("cafe-au-lait")
  })

  it("strips umlaut from Latin letters", () => {
    expect(slugify("Über cool")).toBe("uber-cool")
  })

  it("handles multiple diacritics in one word", () => {
    expect(slugify("résumé")).toBe("resume")
  })

  // -------------------------------------------------------------------------
  // Non-ASCII / non-Latin scripts
  // -------------------------------------------------------------------------

  it("returns empty string for Hebrew-only input", () => {
    // Hebrew letters have no ASCII equivalent - they are dropped.
    expect(slugify("שלום עולם")).toBe("")
  })

  it("extracts ASCII parts from mixed Hebrew/English input", () => {
    // Only the ASCII "react" portion survives.
    expect(slugify("react שלום")).toBe("react")
  })

  it("extracts digits from mixed non-ASCII input", () => {
    expect(slugify("שלום 2026 עולם")).toBe("2026")
  })
})
