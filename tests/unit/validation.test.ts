import { describe, expect, it } from "vitest"

import { parseWithSchema } from "@/lib/validation/parse"
import {
  createCourseSchema,
  enrollmentSchema,
  markWatchedSchema,
  updateCourseSchema,
} from "@/lib/validation/course"
import {
  createLessonSchema,
  reorderLessonsSchema,
} from "@/lib/validation/lesson"
import { tutorMessageSchema } from "@/lib/validation/tutor"
import { checkoutSchema, confirmPaymentSchema } from "@/lib/validation/payment"
import { searchQuerySchema } from "@/lib/validation/search"
import { createGroupSchema, groupMembershipSchema } from "@/lib/validation/group"
import { reminderActionSchema } from "@/lib/validation/reminder"
import { certificateSchema } from "@/lib/validation/certificate"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectFail<T>(
  result: ReturnType<typeof parseWithSchema<T>>,
  fieldKey?: string
): void {
  if (result.ok) throw new Error("Expected fail but got ok")
  if (fieldKey) {
    expect(result.fieldErrors).toBeDefined()
    expect(result.fieldErrors![fieldKey]).toBeDefined()
  }
}

// ---------------------------------------------------------------------------
// parseWithSchema helper
// ---------------------------------------------------------------------------

describe("parseWithSchema", () => {
  it("returns ok with parsed data on valid input", () => {
    const result = parseWithSchema(createCourseSchema, {
      slug: "intro-to-rust",
      title: "Intro to Rust",
      description: "Learn Rust from scratch",
      level: "beginner",
      status: "draft",
      language: "en",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.slug).toBe("intro-to-rust")
  })

  it("returns fail with fieldErrors on invalid input", () => {
    const result = parseWithSchema(createCourseSchema, { title: "" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("Validation failed")
      expect(result.fieldErrors).toBeDefined()
    }
  })

  it("surfaces first error per field, not an array", () => {
    const result = parseWithSchema(createCourseSchema, { slug: "", title: "" })
    if (!result.ok) {
      expect(typeof result.fieldErrors?.["slug"]).toBe("string")
      expect(typeof result.fieldErrors?.["title"]).toBe("string")
    }
  })
})

// ---------------------------------------------------------------------------
// Course schemas
// ---------------------------------------------------------------------------

describe("createCourseSchema - valid", () => {
  const valid = {
    slug: "react-fundamentals",
    title: "React Fundamentals",
    description: "Learn React",
    level: "intermediate",
    status: "published",
    language: "en",
  }

  it("accepts a valid course", () => {
    const result = parseWithSchema(createCourseSchema, valid)
    expect(result.ok).toBe(true)
  })

  it("accepts an optional coverImageUrl", () => {
    const result = parseWithSchema(createCourseSchema, {
      ...valid,
      coverImageUrl: "https://example.com/img.jpg",
    })
    expect(result.ok).toBe(true)
  })

  it("accepts all three level values", () => {
    for (const level of ["beginner", "intermediate", "advanced"] as const) {
      expect(parseWithSchema(createCourseSchema, { ...valid, level }).ok).toBe(
        true
      )
    }
  })
})

describe("createCourseSchema - invalid", () => {
  const base = {
    slug: "valid-slug",
    title: "Valid Title",
    description: "Valid description",
    level: "beginner",
    status: "draft",
    language: "en",
  }

  it("rejects an empty title", () => {
    expectFail(parseWithSchema(createCourseSchema, { ...base, title: "" }), "title")
  })

  it("rejects an empty description", () => {
    expectFail(
      parseWithSchema(createCourseSchema, { ...base, description: "" }),
      "description"
    )
  })

  it("rejects a slug with uppercase letters", () => {
    expectFail(
      parseWithSchema(createCourseSchema, { ...base, slug: "Invalid-Slug" }),
      "slug"
    )
  })

  it("rejects a slug with spaces", () => {
    expectFail(
      parseWithSchema(createCourseSchema, { ...base, slug: "invalid slug" }),
      "slug"
    )
  })

  it("rejects an invalid level", () => {
    expectFail(
      parseWithSchema(createCourseSchema, { ...base, level: "expert" }),
      "level"
    )
  })

  it("rejects an invalid status", () => {
    expectFail(
      parseWithSchema(createCourseSchema, { ...base, status: "pending" }),
      "status"
    )
  })

  it("rejects an invalid coverImageUrl", () => {
    expectFail(
      parseWithSchema(createCourseSchema, {
        ...base,
        coverImageUrl: "not-a-url",
      }),
      "coverImageUrl"
    )
  })
})

describe("updateCourseSchema", () => {
  it("accepts an empty object (all optional)", () => {
    expect(parseWithSchema(updateCourseSchema, {}).ok).toBe(true)
  })

  it("accepts a partial update", () => {
    const result = parseWithSchema(updateCourseSchema, { title: "New Title" })
    expect(result.ok).toBe(true)
  })

  it("rejects an invalid status in partial update", () => {
    expectFail(
      parseWithSchema(updateCourseSchema, { status: "invalid" }),
      "status"
    )
  })
})

describe("enrollmentSchema", () => {
  it("accepts a valid uuid", () => {
    const result = parseWithSchema(enrollmentSchema, {
      courseId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.ok).toBe(true)
  })

  it("rejects a non-uuid courseId", () => {
    expectFail(parseWithSchema(enrollmentSchema, { courseId: "not-a-uuid" }), "courseId")
  })

  it("rejects a missing courseId", () => {
    expectFail(parseWithSchema(enrollmentSchema, {}), "courseId")
  })
})

describe("markWatchedSchema", () => {
  it("accepts valid uuids", () => {
    const result = parseWithSchema(markWatchedSchema, {
      courseId: "550e8400-e29b-41d4-a716-446655440000",
      lessonId: "550e8400-e29b-41d4-a716-446655440001",
    })
    expect(result.ok).toBe(true)
  })

  it("rejects a missing lessonId", () => {
    expectFail(
      parseWithSchema(markWatchedSchema, {
        courseId: "550e8400-e29b-41d4-a716-446655440000",
      }),
      "lessonId"
    )
  })
})

// ---------------------------------------------------------------------------
// Lesson schemas
// ---------------------------------------------------------------------------

describe("createLessonSchema - valid", () => {
  const valid = {
    slug: "intro-lesson",
    title: "Intro Lesson",
    youtubeVideoId: "dQw4w9WgXcQ",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    sortOrder: 0,
  }

  it("accepts a valid lesson", () => {
    expect(parseWithSchema(createLessonSchema, valid).ok).toBe(true)
  })

  it("accepts optional fields", () => {
    const result = parseWithSchema(createLessonSchema, {
      ...valid,
      description: "A description",
      durationSeconds: 300,
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
      isPreview: true,
    })
    expect(result.ok).toBe(true)
  })
})

describe("createLessonSchema - invalid", () => {
  const base = {
    slug: "valid-slug",
    title: "Valid Title",
    youtubeVideoId: "dQw4w9WgXcQ",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    sortOrder: 0,
  }

  it("rejects a youtube_video_id that is not 11 chars", () => {
    expectFail(
      parseWithSchema(createLessonSchema, {
        ...base,
        youtubeVideoId: "short",
      }),
      "youtubeVideoId"
    )
  })

  it("rejects a negative sortOrder", () => {
    expectFail(
      parseWithSchema(createLessonSchema, { ...base, sortOrder: -1 }),
      "sortOrder"
    )
  })

  it("rejects a non-integer sortOrder", () => {
    expectFail(
      parseWithSchema(createLessonSchema, { ...base, sortOrder: 1.5 }),
      "sortOrder"
    )
  })

  it("rejects an invalid youtubeUrl", () => {
    expectFail(
      parseWithSchema(createLessonSchema, { ...base, youtubeUrl: "not-a-url" }),
      "youtubeUrl"
    )
  })
})

describe("reorderLessonsSchema", () => {
  it("accepts a valid array", () => {
    const result = parseWithSchema(reorderLessonsSchema, [
      { id: "550e8400-e29b-41d4-a716-446655440000", sortOrder: 0 },
      { id: "550e8400-e29b-41d4-a716-446655440001", sortOrder: 1 },
    ])
    expect(result.ok).toBe(true)
  })

  it("accepts an empty array", () => {
    expect(parseWithSchema(reorderLessonsSchema, []).ok).toBe(true)
  })

  it("rejects non-uuid IDs", () => {
    expect(
      parseWithSchema(reorderLessonsSchema, [{ id: "bad", sortOrder: 0 }]).ok
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tutor schemas
// ---------------------------------------------------------------------------

describe("tutorMessageSchema - valid", () => {
  const valid = {
    courseId: "550e8400-e29b-41d4-a716-446655440000",
    content: "What is a closure?",
  }

  it("accepts a valid message", () => {
    expect(parseWithSchema(tutorMessageSchema, valid).ok).toBe(true)
  })

  it("trims content whitespace", () => {
    const result = parseWithSchema(tutorMessageSchema, {
      ...valid,
      content: "  trimmed  ",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.content).toBe("trimmed")
  })

  it("accepts optional lessonId and conversationId", () => {
    const result = parseWithSchema(tutorMessageSchema, {
      ...valid,
      lessonId: "550e8400-e29b-41d4-a716-446655440001",
      conversationId: "550e8400-e29b-41d4-a716-446655440002",
    })
    expect(result.ok).toBe(true)
  })
})

describe("tutorMessageSchema - invalid", () => {
  it("rejects empty content", () => {
    expectFail(
      parseWithSchema(tutorMessageSchema, {
        courseId: "550e8400-e29b-41d4-a716-446655440000",
        content: "",
      }),
      "content"
    )
  })

  it("rejects content over 4000 chars", () => {
    expectFail(
      parseWithSchema(tutorMessageSchema, {
        courseId: "550e8400-e29b-41d4-a716-446655440000",
        content: "x".repeat(4001),
      }),
      "content"
    )
  })

  it("rejects a missing courseId", () => {
    expectFail(
      parseWithSchema(tutorMessageSchema, { content: "hello" }),
      "courseId"
    )
  })
})

// ---------------------------------------------------------------------------
// Payment schemas
// ---------------------------------------------------------------------------

describe("checkoutSchema", () => {
  it("accepts a valid courseId", () => {
    expect(
      parseWithSchema(checkoutSchema, {
        courseId: "550e8400-e29b-41d4-a716-446655440000",
      }).ok
    ).toBe(true)
  })

  it("rejects a missing courseId", () => {
    expectFail(parseWithSchema(checkoutSchema, {}), "courseId")
  })

  it("rejects a non-uuid courseId", () => {
    expectFail(
      parseWithSchema(checkoutSchema, { courseId: "not-uuid" }),
      "courseId"
    )
  })
})

describe("confirmPaymentSchema", () => {
  const valid = {
    courseId: "550e8400-e29b-41d4-a716-446655440000",
    simulationEventId: "evt_abc123",
  }

  it("accepts valid input", () => {
    expect(parseWithSchema(confirmPaymentSchema, valid).ok).toBe(true)
  })

  it("accepts optional fakeSummary", () => {
    expect(
      parseWithSchema(confirmPaymentSchema, { ...valid, fakeSummary: "Paid $9.99" }).ok
    ).toBe(true)
  })

  it("rejects empty simulationEventId", () => {
    expectFail(
      parseWithSchema(confirmPaymentSchema, { ...valid, simulationEventId: "" }),
      "simulationEventId"
    )
  })
})

// ---------------------------------------------------------------------------
// Search schema
// ---------------------------------------------------------------------------

describe("searchQuerySchema", () => {
  it("accepts a valid query", () => {
    const result = parseWithSchema(searchQuerySchema, { q: "React hooks" })
    expect(result.ok).toBe(true)
  })

  it("trims whitespace from query", () => {
    const result = parseWithSchema(searchQuerySchema, { q: "  hello  " })
    if (result.ok) expect(result.data.q).toBe("hello")
  })

  it("rejects an empty query", () => {
    expectFail(parseWithSchema(searchQuerySchema, { q: "" }), "q")
  })

  it("rejects a whitespace-only query", () => {
    expectFail(parseWithSchema(searchQuerySchema, { q: "   " }))
  })

  it("rejects a query over 200 chars", () => {
    expectFail(
      parseWithSchema(searchQuerySchema, { q: "x".repeat(201) }),
      "q"
    )
  })
})

// ---------------------------------------------------------------------------
// Group schemas
// ---------------------------------------------------------------------------

describe("createGroupSchema", () => {
  it("accepts valid input", () => {
    expect(
      parseWithSchema(createGroupSchema, { slug: "cohort-2026", name: "Cohort 2026" }).ok
    ).toBe(true)
  })

  it("rejects an invalid slug", () => {
    expectFail(
      parseWithSchema(createGroupSchema, { slug: "Bad Slug", name: "x" }),
      "slug"
    )
  })

  it("rejects an empty name", () => {
    expectFail(
      parseWithSchema(createGroupSchema, { slug: "valid", name: "" }),
      "name"
    )
  })
})

describe("groupMembershipSchema", () => {
  it("accepts valid uuids", () => {
    expect(
      parseWithSchema(groupMembershipSchema, {
        groupId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "550e8400-e29b-41d4-a716-446655440001",
      }).ok
    ).toBe(true)
  })

  it("rejects non-uuid groupId", () => {
    expectFail(
      parseWithSchema(groupMembershipSchema, {
        groupId: "not-uuid",
        userId: "550e8400-e29b-41d4-a716-446655440001",
      }),
      "groupId"
    )
  })
})

// ---------------------------------------------------------------------------
// Reminder schema
// ---------------------------------------------------------------------------

describe("reminderActionSchema", () => {
  it("accepts valid input", () => {
    expect(
      parseWithSchema(reminderActionSchema, {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "Inactive for 7 days",
        status: "queued",
      }).ok
    ).toBe(true)
  })

  it("accepts optional courseId", () => {
    expect(
      parseWithSchema(reminderActionSchema, {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        courseId: "550e8400-e29b-41d4-a716-446655440001",
        reason: "No progress",
        status: "queued",
      }).ok
    ).toBe(true)
  })

  it("rejects an invalid status", () => {
    expectFail(
      parseWithSchema(reminderActionSchema, {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "Inactive",
        status: "invalid",
      }),
      "status"
    )
  })

  it("rejects an empty reason", () => {
    expectFail(
      parseWithSchema(reminderActionSchema, {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "",
        status: "queued",
      }),
      "reason"
    )
  })
})

// ---------------------------------------------------------------------------
// Certificate schema
// ---------------------------------------------------------------------------

describe("certificateSchema", () => {
  it("accepts valid uuids", () => {
    expect(
      parseWithSchema(certificateSchema, {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        courseId: "550e8400-e29b-41d4-a716-446655440001",
      }).ok
    ).toBe(true)
  })

  it("rejects a non-uuid userId", () => {
    expectFail(
      parseWithSchema(certificateSchema, {
        userId: "not-uuid",
        courseId: "550e8400-e29b-41d4-a716-446655440001",
      }),
      "userId"
    )
  })
})
