/**
 * Unit tests for the YouTubePlayer component.
 *
 * Verifies that a valid video id renders an iframe with the youtube-nocookie
 * embed URL and the lesson title as its accessible title attribute. Verifies
 * that an invalid or missing video id renders a localized "video unavailable"
 * placeholder instead of a broken iframe.
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import enMessages from "@/messages/en-US.json"

// YouTubePlayer is a server component syntactically but renders fine under
// jsdom since it has no async dependencies - it uses useTranslations which
// works with NextIntlClientProvider.
import { YouTubePlayer } from "@/components/youtube/youtube-player"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("YouTubePlayer", () => {
  it("renders an iframe with the youtube-nocookie embed URL for a valid id", () => {
    render(
      wrap(
        <YouTubePlayer videoId="dQw4w9WgXcQ" title="Test Lesson" />
      )
    )
    const iframe = screen.getByTitle("Test Lesson")
    expect(iframe.tagName).toBe("IFRAME")
    expect(iframe.getAttribute("src")).toContain(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    )
  })

  it("sets title attribute on the iframe for accessibility", () => {
    render(
      wrap(
        <YouTubePlayer videoId="dQw4w9WgXcQ" title="Accessible Lesson Title" />
      )
    )
    const iframe = screen.getByTitle("Accessible Lesson Title")
    expect(iframe).toBeInTheDocument()
  })

  it("renders the video unavailable placeholder for null videoId", () => {
    render(wrap(<YouTubePlayer videoId={null} title="Test" />))
    expect(screen.getByText("Video unavailable")).toBeInTheDocument()
    expect(screen.queryByRole("figure")).not.toBeInTheDocument()
    expect(screen.queryByTitle("Test")).not.toBeInTheDocument()
  })

  it("renders the video unavailable placeholder for an empty string videoId", () => {
    render(wrap(<YouTubePlayer videoId="" title="Test" />))
    expect(screen.getByText("Video unavailable")).toBeInTheDocument()
  })

  it("renders the video unavailable placeholder for a short/invalid videoId", () => {
    // YouTube ids are exactly 11 chars; shorter strings are invalid.
    render(wrap(<YouTubePlayer videoId="abc" title="Test" />))
    expect(screen.getByText("Video unavailable")).toBeInTheDocument()
  })

  it("renders the video unavailable placeholder for a 12-char id (too long)", () => {
    render(wrap(<YouTubePlayer videoId="dQw4w9WgXcQQ" title="Test" />))
    expect(screen.getByText("Video unavailable")).toBeInTheDocument()
  })

  it("renders an iframe with allowfullscreen", () => {
    render(
      wrap(<YouTubePlayer videoId="dQw4w9WgXcQ" title="Test" />)
    )
    const iframe = screen.getByTitle("Test")
    // allowFullScreen is a boolean attr - present means truthy.
    expect(iframe.hasAttribute("allowfullscreen")).toBe(true)
  })

  it("renders an iframe with loading=lazy", () => {
    render(
      wrap(<YouTubePlayer videoId="dQw4w9WgXcQ" title="Test" />)
    )
    const iframe = screen.getByTitle("Test")
    expect(iframe.getAttribute("loading")).toBe("lazy")
  })

  it("does not include autoplay in the embed URL", () => {
    render(
      wrap(<YouTubePlayer videoId="dQw4w9WgXcQ" title="Test" />)
    )
    const iframe = screen.getByTitle("Test")
    expect(iframe.getAttribute("src")).not.toContain("autoplay=1")
  })
})
