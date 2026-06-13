"use client"

import { useEffect, useRef, useState } from "react"
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
                        : "max-w-[85%] rounded-2xl rounded-es-sm bg-muted px-3 py-2 text-sm"
                    }
                  >
                    <span className="sr-only">
                      {isUser ? t("you") : t("assistant")}:{" "}
                    </span>
                    <span className="whitespace-pre-wrap break-words">
                      {textOf(message)}
                    </span>
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
