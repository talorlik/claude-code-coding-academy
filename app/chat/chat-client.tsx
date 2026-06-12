"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

/** Reads the concatenated text of a UI message's text parts. */
function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

/**
 * Interactive chat. The model call lives behind `/api/chat` (the server route
 * is the trust boundary); this component only renders messages and posts new
 * ones via `useChat`.
 */
export function ChatClient() {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const isStreaming = status === "streaming" || status === "submitted"

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <div>
      <header>Chat</header>

      <ScrollArea>
        <div>
          {messages.length === 0 ? (
            <p>Ask me anything to get started.</p>
          ) : (
            messages.map((message) => (
              <div key={message.id}>
                <Card>
                  <CardContent>{textOf(message)}</CardContent>
                </Card>
              </div>
            ))
          )}
          {isStreaming && <p>Thinking…</p>}
          {error != null && <p role="alert">Something went wrong.</p>}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message"
          disabled={isStreaming}
          aria-label="Type a message"
        />
        <Button type="submit" disabled={isStreaming || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
