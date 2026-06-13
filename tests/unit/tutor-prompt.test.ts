/**
 * Unit tests for lib/tutor/prompt.ts.
 *
 * Pure tests: no network, no DB, no mocks needed.
 * Asserts that the prompt builder includes required context, enforces the
 * no-transcript/no-timestamp guardrail, varies by locale, and that the
 * history-cap helper trims correctly.
 */

import { describe, it, expect } from "vitest"
import type { UIMessage } from "ai"

import {
  buildTutorSystemPrompt,
  capHistory,
  HISTORY_CAP,
} from "@/lib/tutor/prompt"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMsg(id: string, role: "user" | "assistant", text: string): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  }
}

const BASE_CTX = {
  courseName: "JavaScript for Beginners",
  courseDescription: "Learn JS from scratch",
  lessonTitle: "Variables and Data Types",
  lessonDescription: "Covers var, let, const",
  youtubeUrl: "https://www.youtube.com/watch?v=abc123",
  locale: "en",
} as const

// ---------------------------------------------------------------------------
// buildTutorSystemPrompt
// ---------------------------------------------------------------------------

describe("buildTutorSystemPrompt", () => {
  it("includes the course name", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt).toContain("JavaScript for Beginners")
  })

  it("includes the course description", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt).toContain("Learn JS from scratch")
  })

  it("includes the lesson title when provided", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt).toContain("Variables and Data Types")
  })

  it("includes the lesson description when provided", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt).toContain("Covers var, let, const")
  })

  it("includes the youtube URL when provided", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt).toContain("https://www.youtube.com/watch?v=abc123")
  })

  it("contains the no-transcript instruction", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    // Must explicitly tell the model it has NOT watched the video.
    expect(prompt.toLowerCase()).toContain("have not watched")
  })

  it("contains the no-timestamp instruction", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt.toLowerCase()).toContain("timestamp")
  })

  it("instructs the model not to claim to have seen the video content", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    // The guardrail section must be present.
    expect(prompt).toContain("Critical Limitations")
  })

  it("answers in English for en locale", () => {
    const prompt = buildTutorSystemPrompt({ ...BASE_CTX, locale: "en" })
    expect(prompt).toContain("Answer in English")
  })

  it("answers in Hebrew for he locale", () => {
    const prompt = buildTutorSystemPrompt({ ...BASE_CTX, locale: "he" })
    expect(prompt).toContain("Answer in Hebrew")
    expect(prompt).toContain("עברית")
  })

  it("differs between en and he locale prompts", () => {
    const en = buildTutorSystemPrompt({ ...BASE_CTX, locale: "en" })
    const he = buildTutorSystemPrompt({ ...BASE_CTX, locale: "he" })
    expect(en).not.toBe(he)
  })

  it("handles null lessonTitle gracefully (course-scope)", () => {
    const prompt = buildTutorSystemPrompt({
      ...BASE_CTX,
      lessonTitle: null,
      lessonDescription: null,
      youtubeUrl: null,
    })
    expect(prompt).toContain("course in general")
    expect(prompt).not.toContain("null")
  })

  it("handles null courseDescription gracefully", () => {
    const prompt = buildTutorSystemPrompt({ ...BASE_CTX, courseDescription: null })
    // Should not crash and should not contain "null" literally.
    expect(prompt).not.toContain('"null"')
    expect(prompt).not.toMatch(/^null$/m)
    expect(prompt).toContain("JavaScript for Beginners")
  })

  it("does not contain secrets or injection markers", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt).not.toContain("AI_GATEWAY_API_KEY")
    expect(prompt).not.toContain("SUPABASE_SECRET_KEY")
    expect(prompt).not.toContain("<script")
    expect(prompt).not.toContain("</script")
  })

  it("mentions programming tutor identity", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt.toLowerCase()).toContain("programming tutor")
  })

  it("mentions asking ONE clarifying question", () => {
    const prompt = buildTutorSystemPrompt(BASE_CTX)
    expect(prompt.toLowerCase()).toMatch(/one.{0,30}clarifying question/)
  })
})

// ---------------------------------------------------------------------------
// capHistory
// ---------------------------------------------------------------------------

describe("capHistory", () => {
  it("returns the same array when length <= cap", () => {
    const msgs = [makeMsg("1", "user", "hi"), makeMsg("2", "assistant", "hello")]
    const result = capHistory(msgs, 10)
    expect(result).toHaveLength(2)
    expect(result).toBe(msgs) // same reference (no copy when within limit)
  })

  it("returns the LAST cap messages when over the limit", () => {
    const msgs = Array.from({ length: 30 }, (_, i) =>
      makeMsg(String(i), i % 2 === 0 ? "user" : "assistant", `msg ${i}`)
    )
    const result = capHistory(msgs, 10)
    expect(result).toHaveLength(10)
    // Last 10 items from 0..29 are 20..29.
    expect(result[0].id).toBe("20")
    expect(result[9].id).toBe("29")
  })

  it("uses HISTORY_CAP as the default cap", () => {
    const msgs = Array.from({ length: HISTORY_CAP + 5 }, (_, i) =>
      makeMsg(String(i), "user", `msg ${i}`)
    )
    const result = capHistory(msgs)
    expect(result).toHaveLength(HISTORY_CAP)
  })

  it("returns empty array for empty input", () => {
    expect(capHistory([], 10)).toHaveLength(0)
  })

  it("returns the full array when length exactly equals cap", () => {
    const msgs = Array.from({ length: 5 }, (_, i) =>
      makeMsg(String(i), "user", `msg ${i}`)
    )
    const result = capHistory(msgs, 5)
    expect(result).toHaveLength(5)
  })
})
