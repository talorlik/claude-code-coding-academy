/**
 * Unit tests for LessonSidebar component.
 *
 * Wraps in NextIntlClientProvider to resolve "Course" namespace messages.
 * Mocks @/i18n/navigation so Link renders as a plain <a> element (no router
 * dependency in jsdom).
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import enMessages from "@/messages/en-US.json"
import type { LessonSummary } from "@/lib/courses/types"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
    "aria-current": ariaCurrent,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    "aria-current"?: React.AriaAttributes["aria-current"]
  }) => (
    <a href={href} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}))

// Static import AFTER mocks.
import { LessonSidebar } from "@/components/courses/lesson-sidebar"

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

function makeLesson(overrides: Partial<LessonSummary> = {}): LessonSummary {
  const id = overrides.id ?? `lesson-${Math.random()}`
  return {
    id,
    slug: overrides.slug ?? `slug-${id}`,
    title: overrides.title ?? `Lesson ${id}`,
    description: null,
    youtubeVideoId: "dQw4w9WgXcQ",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    durationSeconds: 300,
    thumbnailUrl: null,
    sortOrder: overrides.sortOrder ?? 0,
    isPreview: overrides.isPreview ?? false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LessonSidebar", () => {
  const lessons: LessonSummary[] = [
    makeLesson({ id: "lesson-1", slug: "intro", title: "Introduction", sortOrder: 0 }),
    makeLesson({
      id: "lesson-2",
      slug: "basics",
      title: "Basics",
      sortOrder: 1,
      isPreview: true,
    }),
    makeLesson({ id: "lesson-3", slug: "advanced", title: "Advanced", sortOrder: 2 }),
  ]

  it("renders all lesson titles", () => {
    render(
      wrap(
        <LessonSidebar
          lessons={lessons}
          activeSlug="intro"
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    expect(screen.getByText("Introduction")).toBeInTheDocument()
    expect(screen.getByText("Basics")).toBeInTheDocument()
    expect(screen.getByText("Advanced")).toBeInTheDocument()
  })

  it("shows a checkmark icon for completed lessons (CheckCircle2 replaces number)", () => {
    // Completed lessons have their number replaced by a CheckCircle2 SVG.
    // The sr-only "Completed" span is present.
    render(
      wrap(
        <LessonSidebar
          lessons={lessons}
          activeSlug="intro"
          courseSlug="my-course"
          completedLessonIds={new Set(["lesson-1"])}
        />
      )
    )
    // sr-only completed label should be present.
    const completedText = screen.getAllByText("Completed")
    expect(completedText.length).toBeGreaterThanOrEqual(1)
  })

  it("sets aria-current on the active lesson link", () => {
    render(
      wrap(
        <LessonSidebar
          lessons={lessons}
          activeSlug="basics"
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    // The link for "basics" should carry aria-current="true".
    const links = screen.getAllByRole("link")
    const basicsLink = links.find((l) => l.getAttribute("href")?.includes("lesson=basics"))
    expect(basicsLink).toBeDefined()
    expect(basicsLink?.getAttribute("aria-current")).toBe("true")
  })

  it("does NOT set aria-current on non-active lesson links", () => {
    render(
      wrap(
        <LessonSidebar
          lessons={lessons}
          activeSlug="basics"
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    const links = screen.getAllByRole("link")
    const introLink = links.find((l) => l.getAttribute("href")?.includes("lesson=intro"))
    expect(introLink?.getAttribute("aria-current")).toBeNull()
  })

  it("renders a Preview badge on lessons marked isPreview", () => {
    render(
      wrap(
        <LessonSidebar
          lessons={lessons}
          activeSlug="intro"
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    expect(screen.getByText("Preview")).toBeInTheDocument()
  })

  it("does not render Preview badges for non-preview lessons", () => {
    const nonPreviewLessons = lessons.filter((l) => !l.isPreview)
    render(
      wrap(
        <LessonSidebar
          lessons={nonPreviewLessons}
          activeSlug="intro"
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    expect(screen.queryByText("Preview")).not.toBeInTheDocument()
  })

  it("renders lesson links with correct ?lesson= href", () => {
    render(
      wrap(
        <LessonSidebar
          lessons={lessons}
          activeSlug="intro"
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    const links = screen.getAllByRole("link")
    const hrefs = links.map((l) => l.getAttribute("href"))
    expect(hrefs).toContain("/courses/my-course?lesson=intro")
    expect(hrefs).toContain("/courses/my-course?lesson=basics")
    expect(hrefs).toContain("/courses/my-course?lesson=advanced")
  })

  it("renders an accessible nav landmark", () => {
    render(
      wrap(
        <LessonSidebar
          lessons={lessons}
          activeSlug="intro"
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    const nav = screen.getByRole("navigation", { name: /lessons/i })
    expect(nav).toBeInTheDocument()
  })

  it("renders empty state when lesson list is empty", () => {
    render(
      wrap(
        <LessonSidebar
          lessons={[]}
          activeSlug=""
          courseSlug="my-course"
          completedLessonIds={new Set()}
        />
      )
    )
    // Should render a nav but no links.
    expect(screen.getByRole("navigation")).toBeInTheDocument()
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })
})
