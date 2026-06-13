/**
 * Type-level assertions for the generated Database type.
 *
 * These tests do not make network calls. They assert that the generated
 * database.types.ts file exposes the expected table shapes, so a
 * regeneration that drops or renames a critical column fails the build.
 *
 * Strategy: assign a literal object to the Row type. TypeScript errors at
 * compile time if a required field is missing or has the wrong type.
 * The runtime test just asserts(true) - the value is in the type check.
 */

import { describe, it, expect, expectTypeOf } from "vitest"

import type { Database } from "@/lib/supabase/database.types"

type Tables = Database["public"]["Tables"]

// Shorthand for Row types of key tables.
type CoursesRow = Tables["courses"]["Row"]
type LessonsRow = Tables["lessons"]["Row"]
type EnrollmentsRow = Tables["enrollments"]["Row"]
type LessonProgressRow = Tables["lesson_progress"]["Row"]
type PaymentsRow = Tables["payments"]["Row"]
type ProfilesRow = Tables["profiles"]["Row"]
type CertificatesRow = Tables["certificates"]["Row"]
type AiConversationsRow = Tables["ai_tutor_conversations"]["Row"]

describe("Database type shape", () => {
  it("courses Row has required fields with correct types", () => {
    expectTypeOf<CoursesRow["id"]>().toEqualTypeOf<string>()
    expectTypeOf<CoursesRow["slug"]>().toEqualTypeOf<string>()
    expectTypeOf<CoursesRow["title"]>().toEqualTypeOf<string>()
    expectTypeOf<CoursesRow["status"]>().toEqualTypeOf<
      "draft" | "published" | "archived"
    >()
    expectTypeOf<CoursesRow["level"]>().toEqualTypeOf<
      "beginner" | "intermediate" | "advanced"
    >()
    expectTypeOf<CoursesRow["language"]>().toEqualTypeOf<string>()
    expectTypeOf<CoursesRow["created_by"]>().toEqualTypeOf<string | null>()
    expect(true).toBe(true)
  })

  it("lessons Row has youtube fields and course FK", () => {
    expectTypeOf<LessonsRow["course_id"]>().toEqualTypeOf<string>()
    expectTypeOf<LessonsRow["youtube_video_id"]>().toEqualTypeOf<string>()
    expectTypeOf<LessonsRow["youtube_url"]>().toEqualTypeOf<string>()
    expectTypeOf<LessonsRow["sort_order"]>().toEqualTypeOf<number>()
    expectTypeOf<LessonsRow["is_preview"]>().toEqualTypeOf<boolean>()
    expect(true).toBe(true)
  })

  it("enrollments Row tracks completion and last lesson", () => {
    expectTypeOf<EnrollmentsRow["user_id"]>().toEqualTypeOf<string>()
    expectTypeOf<EnrollmentsRow["course_id"]>().toEqualTypeOf<string>()
    expectTypeOf<EnrollmentsRow["completed_at"]>().toEqualTypeOf<
      string | null
    >()
    expectTypeOf<EnrollmentsRow["last_accessed_lesson_id"]>().toEqualTypeOf<
      string | null
    >()
    expect(true).toBe(true)
  })

  it("lesson_progress Row has user, course, lesson FKs", () => {
    expectTypeOf<LessonProgressRow["user_id"]>().toEqualTypeOf<string>()
    expectTypeOf<LessonProgressRow["course_id"]>().toEqualTypeOf<string>()
    expectTypeOf<LessonProgressRow["lesson_id"]>().toEqualTypeOf<string>()
    expectTypeOf<LessonProgressRow["watched_at"]>().toEqualTypeOf<string>()
    expect(true).toBe(true)
  })

  it("payments Row has simulation fields", () => {
    expectTypeOf<PaymentsRow["status"]>().toEqualTypeOf<
      "pending" | "paid" | "failed" | "refunded"
    >()
    expectTypeOf<PaymentsRow["provider"]>().toEqualTypeOf<string>()
    expectTypeOf<PaymentsRow["simulation_event_id"]>().toEqualTypeOf<
      string | null
    >()
    expectTypeOf<PaymentsRow["fake_payment_summary"]>().toEqualTypeOf<
      string | null
    >()
    expectTypeOf<PaymentsRow["amount_cents"]>().toEqualTypeOf<number>()
    expect(true).toBe(true)
  })

  it("profiles Row has extended columns from migration 0003", () => {
    expectTypeOf<ProfilesRow["user_id"]>().toEqualTypeOf<string>()
    expectTypeOf<ProfilesRow["email"]>().toEqualTypeOf<string | null>()
    expectTypeOf<ProfilesRow["avatar_url"]>().toEqualTypeOf<string | null>()
    expectTypeOf<ProfilesRow["locale"]>().toEqualTypeOf<string>()
    expectTypeOf<ProfilesRow["full_name"]>().toEqualTypeOf<string | null>()
    expect(true).toBe(true)
  })

  it("certificates Row is unique per user/course", () => {
    expectTypeOf<CertificatesRow["user_id"]>().toEqualTypeOf<string>()
    expectTypeOf<CertificatesRow["course_id"]>().toEqualTypeOf<string>()
    expectTypeOf<CertificatesRow["issued_at"]>().toEqualTypeOf<string>()
    expect(true).toBe(true)
  })

  it("ai_tutor_conversations Row links user, course, optional lesson", () => {
    expectTypeOf<AiConversationsRow["user_id"]>().toEqualTypeOf<string>()
    expectTypeOf<AiConversationsRow["course_id"]>().toEqualTypeOf<string>()
    expectTypeOf<AiConversationsRow["lesson_id"]>().toEqualTypeOf<
      string | null
    >()
    expect(true).toBe(true)
  })

  it("all expected tables exist in public schema", () => {
    // Compile-time check: these types must resolve without 'never'.
    type CheckTables = {
      courses: Tables["courses"]
      lessons: Tables["lessons"]
      enrollments: Tables["enrollments"]
      lesson_progress: Tables["lesson_progress"]
      ai_tutor_conversations: Tables["ai_tutor_conversations"]
      ai_tutor_messages: Tables["ai_tutor_messages"]
      certificates: Tables["certificates"]
      class_groups: Tables["class_groups"]
      class_group_members: Tables["class_group_members"]
      reminder_events: Tables["reminder_events"]
      course_prices: Tables["course_prices"]
      payments: Tables["payments"]
      profiles: Tables["profiles"]
      user_roles: Tables["user_roles"]
    }
    // If any key above doesn't exist in Tables, the type assignment fails.
    type _Assert = CheckTables extends Record<string, object> ? true : never
    const _check: _Assert = true
    expect(_check).toBe(true)
  })
})
