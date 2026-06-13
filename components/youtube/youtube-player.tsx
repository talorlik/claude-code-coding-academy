import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface YouTubePlayerProps {
  /**
   * YouTube video id (11-character alphanumeric string from the DB row).
   * When null or empty the player renders a localized "video unavailable"
   * placeholder instead of an iframe.
   */
  videoId: string | null | undefined
  /** Lesson title used as the iframe's accessible title attribute. */
  title: string
  /** Additional class names applied to the outer wrapper. */
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validates a YouTube video id: 11 alphanumeric characters (A-Z a-z 0-9 _ -). */
function isValidVideoId(id: string | null | undefined): id is string {
  if (!id) return false
  return /^[A-Za-z0-9_-]{11}$/.test(id)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a privacy-enhanced YouTube iframe for a lesson video.
 *
 * Uses `youtube-nocookie.com` to reduce cross-site tracking. The iframe is
 * lazy-loaded (loading="lazy") and respects prefers-reduced-motion via CSS.
 * Aspect ratio is enforced via the `aspect-video` Tailwind utility (16/9) so
 * the player never overflows its container.
 *
 * This is a **server component** - no "use client" needed. The iframe renders
 * on the server and is interactive without hydration (native browser video).
 *
 * When `videoId` is invalid or missing, renders a localized placeholder div
 * rather than a broken embed.
 *
 * Autoplay is intentionally disabled - no `autoplay=1` param is added.
 */
export function YouTubePlayer({ videoId, title, className }: YouTubePlayerProps) {
  const t = useTranslations("Course")

  if (!isValidVideoId(videoId)) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center rounded-lg",
          "bg-muted text-sm text-muted-foreground",
          className
        )}
        role="img"
        aria-label={t("videoUnavailable")}
      >
        <span>{t("videoUnavailable")}</span>
      </div>
    )
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`

  return (
    <div className={cn("aspect-video w-full overflow-hidden rounded-lg", className)}>
      <iframe
        src={embedUrl}
        title={title}
        className="size-full"
        loading="lazy"
        allowFullScreen
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
