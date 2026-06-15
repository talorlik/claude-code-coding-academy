/**
 * Render tests for the course-card cover slot (Batch 23): a real `coverImageUrl`
 * always wins and renders the course's own `<img>`; a course with no cover falls
 * back to the deterministic Unsplash photo (a `next/image` plus an inline
 * credit), never a blank placeholder. The same course id always selects the same
 * fallback photo.
 *
 * The slot is the sync {@link CourseCardCover} extracted from `<CourseCard>` for
 * exactly this reason - it renders without an i18n request context (the parent
 * passes the localized fallback alt in as a prop). `next/image` and the credit
 * component are mocked so the assertions are about which branch renders, not the
 * Next image runtime.
 */

import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"

// ---------------------------------------------------------------------------
// Mocks - declared before importing the component under test.
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    priority: _priority,
    ...rest
  }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src as string}
      alt={alt as string}
      data-testid="next-image"
      {...rest}
    />
  ),
}))

vi.mock("@/components/unsplash-image", () => ({
  UnsplashCredit: ({ name }: { name: string }) => (
    <span data-testid="credit">{name}</span>
  ),
}))

// The card module imports Link from the next-intl navigation re-export, which
// pulls in next/navigation - unresolvable under jsdom. Stub it; the cover slot
// does not use Link, so an inert stub is enough to load the module.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: Record<string, unknown>) => (
    <a href={href as string} {...rest}>
      {children as React.ReactNode}
    </a>
  ),
}))

import { CourseCardCover } from "@/components/courses/course-card"
import type { CatalogCourse } from "@/lib/catalog/types"
import { pickCoverFallbackImage, UNSPLASH_IMAGES } from "@/lib/images/unsplash"

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<CatalogCourse> = {}): CatalogCourse {
  return {
    id: "course-123",
    slug: "intro-to-js",
    title: "Intro to JS",
    description: "Learn the basics.",
    level: "beginner",
    lessonCount: 10,
    coverImageUrl: null,
    categorySlug: null,
    categoryName: null,
    ratingAverage: null,
    ratingCount: 0,
    enrollmentCount: 0,
    progressPercent: null,
    isEnrolled: false,
    ...overrides,
  } as CatalogCourse
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CourseCardCover", () => {
  it("renders the course's own cover image when coverImageUrl is set", () => {
    const { container } = render(
      <CourseCardCover
        course={makeCourse({ coverImageUrl: "https://cdn.example.com/cover.jpg" })}
        coverAlt="ignored"
      />,
    )
    const own = container.querySelector(
      'img[src="https://cdn.example.com/cover.jpg"]',
    )
    expect(own).not.toBeNull()
    // The Unsplash fallback must NOT render when a real cover exists.
    expect(container.querySelector('[data-testid="next-image"]')).toBeNull()
    expect(container.querySelector('[data-testid="credit"]')).toBeNull()
  })

  it("renders the deterministic Unsplash fallback when there is no cover", () => {
    const course = makeCourse({ coverImageUrl: null })
    const expected = UNSPLASH_IMAGES[pickCoverFallbackImage(course.id)]

    const { container } = render(
      <CourseCardCover course={course} coverAlt="A coding photo" />,
    )
    const fallback = container.querySelector('[data-testid="next-image"]')
    expect(fallback).not.toBeNull()
    expect(fallback?.getAttribute("src")).toBe(expected.src)
    expect(fallback?.getAttribute("alt")).toBe("A coding photo")
    // The inline credit is present for the fallback.
    expect(container.querySelector('[data-testid="credit"]')?.textContent).toBe(
      pickCoverFallbackImage(course.id),
    )
  })

  it("picks the same fallback photo for the same course id across renders", () => {
    const course = makeCourse({ id: "stable-id", coverImageUrl: null })
    const srcOf = () =>
      render(<CourseCardCover course={course} coverAlt="x" />).container
        .querySelector('[data-testid="next-image"]')
        ?.getAttribute("src")

    expect(srcOf()).toBe(srcOf())
    expect(srcOf()).toBe(UNSPLASH_IMAGES[pickCoverFallbackImage("stable-id")].src)
  })
})
