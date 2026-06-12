import type { Metadata } from "next"

import { ChatClient } from "./chat-client"

// A chat surface should not be search-indexed.
export const metadata: Metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
}

export default function ChatPage() {
  return <ChatClient />
}
