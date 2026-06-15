"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the concatenated text from a UI message's text parts. */
function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

/** A parsed segment of an assistant message: either prose or a fenced block. */
type Segment =
  | { kind: "prose"; text: string }
  | { kind: "code"; text: string }

/**
 * Splits an assistant message into prose and fenced-code segments on Markdown
 * triple-backtick fences (```lang ... ```), the convention the tutor uses to
 * return code and JSON. A trailing unterminated fence (still streaming) is
 * treated as code so the panel appears as soon as the model opens the block.
 * Presentation only - it never mutates the underlying message text.
 */
function segmentAssistantText(text: string): Segment[] {
  const segments: Segment[] = []
  // Match a fenced block: opening ``` + optional language token, body, closing
  // ``` (or end-of-string while streaming). [\s\S] so the body spans newlines.
  const fence = /```[^\n]*\n?([\s\S]*?)(?:```|$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = fence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "prose", text: text.slice(lastIndex, match.index) })
    }
    segments.push({ kind: "code", text: match[1] })
    lastIndex = fence.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "prose", text: text.slice(lastIndex) })
  }
  return segments
}

/**
 * The DESIGN.md Terminal Code Panel: code/JSON output on the dark code canvas
 * (`--color-code-bg`), 12px panel radius, JetBrains Mono at the 13px floor, with
 * an "I'M A DEVELOPER"-style eyebrow tab. Code text uses `--color-code-string`
 * (the syntax token for strings/identifiers), the most legible mono default on
 * the code canvas in both themes. The page's signature component.
 */
function CodePanel({ code, label }: { code: string; label: string }) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-code-panels)] bg-[var(--color-code-bg)]"
      dir="ltr"
    >
      <div className="border-b border-white/10 px-4 py-2">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-medium uppercase tracking-[var(--tracking-eyebrow)] text-[var(--color-text-muted)]">
          {label}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-[1.57] text-[var(--color-code-string)]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * Renders an assistant message with the Terminal Code Panel treatment applied to
 * any fenced code/JSON it contains; prose renders as before. Inline `code` spans
 * get a subtle `--color-code-surface` chip. Keeps `whitespace-pre-wrap break-words`
 * on prose so wrapping, streaming, and RTL behavior are unchanged.
 */
function AssistantContent({ text, codeLabel }: { text: string; codeLabel: string }) {
  const segments = segmentAssistantText(text)
  return (
    <span className="flex flex-col gap-2">
      {segments.map((segment, i) =>
        segment.kind === "code" ? (
          <CodePanel key={i} code={segment.text} label={codeLabel} />
        ) : (
          <span key={i} className="whitespace-pre-wrap break-words">
            {renderInlineCode(segment.text)}
          </span>
        )
      )}
    </span>
  )
}

/**
 * Splits prose on single-backtick inline code, rendering those spans on a quiet
 * `--color-code-surface` chip in JetBrains Mono. DESIGN.md: code never sits
 * directly on the page canvas.
 */
function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code
        key={i}
        dir="ltr"
        className="rounded-[var(--radius-badges)] bg-[var(--color-code-surface)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-code-string)]"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TutorChatProps {
  /** UUID of the course being studied. */
  courseId: string
  /** UUID of the selected lesson, or undefined for course-level scope. */
  lessonId?: string
  /** Conversation to resume (from server-side prefetch). Undefined = new. */
  initialConversationId?: string
  /** Pre-fetched messages to hydrate history on mount. */
  initialMessages?: UIMessage[]
  /** Active locale for the request body (so the tutor answers in the right language). */
  locale: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AI tutor chat panel for the course page.
 *
 * Communicates with /api/tutor (auth + enrollment gating + persistence).
 * Passes courseId, lessonId, conversationId, and locale in the useChat
 * transport body so the server has the full context for each request.
 *
 * The conversationId is seeded from `initialConversationId`. We intercept the
 * response to capture the x-conversation-id header for conversation continuity.
 */
export function TutorChat({
  courseId,
  lessonId,
  initialConversationId,
  initialMessages,
  locale,
}: TutorChatProps) {
  const t = useTranslations("Tutor")
  const [input, setInput] = useState("")
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  // Wrap the DefaultChatTransport to intercept the response header.
  // We use a custom fetch wrapper to read x-conversation-id before the
  // stream is consumed by the transport.
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/tutor",
        prepareSendMessagesRequest: ({ messages: msgs, body }) => ({
          body: {
            ...(body ?? {}),
            messages: msgs,
            courseId,
            lessonId,
            conversationId,
            locale,
          },
        }),
        fetch: async (url, init) => {
          const res = await globalThis.fetch(url, init)
          const convId = res.headers.get("x-conversation-id")
          if (convId) {
            setConversationId(convId)
          }
          return res
        },
      })
  )

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages ?? [],
  })

  const isStreaming = status === "streaming" || status === "submitted"

  // Scroll to the bottom when a new message arrives or streaming updates.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    sendMessage({ text })
    setInput("")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift). Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      const text = input.trim()
      if (!text || isStreaming) return
      sendMessage({ text })
      setInput("")
    }
  }

  return (
    <section
      aria-label={t("heading")}
      className="flex flex-col rounded-lg border bg-background"
    >
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{t("heading")}</h3>
      </div>

      {/* Message list */}
      <ScrollArea className="h-64 flex-1 px-4 py-3 sm:h-80">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul
            className="space-y-3"
            aria-live="polite"
            aria-label={t("heading")}
          >
            {messages.map((message) => {
              const isUser = message.role === "user"
              return (
                <li
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[80%] rounded-2xl rounded-ee-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "min-w-0 max-w-[85%] rounded-2xl rounded-es-sm bg-muted px-3 py-2 text-sm"
                    }
                  >
                    <span className="sr-only">
                      {isUser ? t("you") : t("assistant")}:{" "}
                    </span>
                    {isUser ? (
                      <span className="whitespace-pre-wrap break-words">
                        {textOf(message)}
                      </span>
                    ) : (
                      <AssistantContent
                        text={textOf(message)}
                        codeLabel={t("codeLabel")}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <div
            role="status"
            aria-live="polite"
            aria-label={t("thinking")}
            className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Spinner className="size-3" />
            <span>{t("thinking")}</span>
          </div>
        )}

        {/* Error state */}
        {error != null && (
          <div role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2">
            <p className="text-sm text-destructive">{t("error")}</p>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} aria-hidden="true" />
      </ScrollArea>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t px-4 py-3"
        aria-busy={isStreaming}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("inputPlaceholder")}
          disabled={isStreaming}
          aria-label={t("inputLabel")}
          rows={2}
          className="min-w-0 flex-1 resize-none"
        />
        <Button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="shrink-0 self-end"
          size="sm"
        >
          {t("send")}
        </Button>
      </form>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Gated variants (shown when the user cannot access the tutor)
// ---------------------------------------------------------------------------

/**
 * Shown when the user is not authenticated.
 */
export function TutorSignInCta() {
  const t = useTranslations("Tutor")
  return (
    <div className="flex items-center justify-center rounded-lg border bg-muted/40 px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{t("signInToAsk")}</p>
    </div>
  )
}

/**
 * Shown when the user is authenticated but not enrolled (and the lesson is not
 * a free preview).
 */
export function TutorEnrollCta() {
  const t = useTranslations("Tutor")
  return (
    <div className="flex items-center justify-center rounded-lg border bg-muted/40 px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{t("enrollToAsk")}</p>
    </div>
  )
}
