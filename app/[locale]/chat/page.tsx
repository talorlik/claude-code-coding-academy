import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ChatClient } from "./chat-client"

// A chat surface should not be search-indexed.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Chat")
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  }
}

export default function ChatPage() {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <ChatClient />
    </main>
  )
}
