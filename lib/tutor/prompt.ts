/**
 * Pure prompt-building utilities for the AI tutor.
 *
 * This module has NO network or database dependencies and is fully unit-testable.
 * Keep it pure: no imports from server-only modules, no side effects.
 */

import type { UIMessage } from "ai"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Context passed to {@link buildTutorSystemPrompt}. */
export interface TutorPromptContext {
  /** Display name of the course. */
  courseName: string
  /** Optional description of the course. */
  courseDescription: string | null
  /** Display title of the current lesson, or null when scoped to the whole course. */
  lessonTitle: string | null
  /** Optional description of the current lesson. */
  lessonDescription: string | null
  /**
   * YouTube URL for the lesson video, provided for reference only.
   * The tutor MUST NOT claim to have watched or transcribed the video.
   */
  youtubeUrl: string | null
  /**
   * Active locale: "en" for English, "he" for Hebrew.
   * The tutor answers in this language unless the student explicitly requests another.
   */
  locale: string
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt for the AI programming tutor.
 *
 * The prompt is injection-resistant: all context (course name, lesson title,
 * description) is embedded in the system message which the model receives
 * separately from user content. User-supplied content never flows into this
 * function - it stays in the messages array passed to the model.
 *
 * @param ctx - Course and lesson context to embed in the prompt.
 * @returns A complete system prompt string.
 */
export function buildTutorSystemPrompt(ctx: TutorPromptContext): string {
  const {
    courseName,
    courseDescription,
    lessonTitle,
    lessonDescription,
    youtubeUrl,
    locale,
  } = ctx

  const languageInstruction =
    locale === "he"
      ? "Answer in Hebrew (עברית) unless the student explicitly asks you to switch languages."
      : "Answer in English unless the student explicitly asks you to switch languages."

  const courseBlock = [
    `Course: ${courseName}`,
    courseDescription ? `Course description: ${courseDescription}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const lessonBlock = lessonTitle
    ? [
        `Current lesson: ${lessonTitle}`,
        lessonDescription ? `Lesson description: ${lessonDescription}` : null,
        youtubeUrl ? `Video reference: ${youtubeUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No specific lesson selected - the student is asking about the course in general."

  return `You are an AI programming tutor for Eyal's Coding Academy. Your role is to help students understand programming concepts covered in their courses and lessons.

## Language
${languageInstruction}

## Current Context
${courseBlock}
${lessonBlock}

## Guidelines
- Ground your answers in the course and lesson context above.
- Explain concepts simply and clearly, suitable for the student's level implied by the course.
- When a question is ambiguous, ask ONE concise clarifying question before answering.
- When it would help the student practice, suggest a small, focused exercise.
- Stay on topic: keep answers relevant to programming and the current course or lesson.
- Be encouraging and supportive.

## Critical Limitations
- You have NOT watched the video for this lesson. You only have the metadata shown above (title, description, URL).
- Do NOT claim to have seen specific video content, timestamps, or spoken words from the video.
- Do NOT reference specific timestamps, segments, or moments from the video.
- If the student asks about something specific from the video (e.g. "at minute 3:20..."), acknowledge that you cannot see the video and offer to help based on the concept they describe.
- Do NOT fabricate transcript content or pretend to recall what was said in the video.

Answer the student's question based on your programming knowledge and the context above.`
}

// ---------------------------------------------------------------------------
// History cap helper
// ---------------------------------------------------------------------------

/**
 * Maximum number of recent messages to include in model context.
 * Older messages are dropped to keep requests within token limits.
 * System prompt and the latest user message are always included separately.
 */
export const HISTORY_CAP = 20

/**
 * Caps the UI message history to the most recent {@link HISTORY_CAP} entries.
 *
 * This is applied to the full conversation history before converting to model
 * messages. The cap prevents runaway token usage on long conversations while
 * keeping the most relevant recent context.
 *
 * @param messages - Full array of UI messages in the conversation.
 * @param cap - Maximum number of messages to keep (default: {@link HISTORY_CAP}).
 * @returns The most recent `cap` messages.
 */
export function capHistory(messages: UIMessage[], cap: number = HISTORY_CAP): UIMessage[] {
  if (messages.length <= cap) return messages
  return messages.slice(messages.length - cap)
}
