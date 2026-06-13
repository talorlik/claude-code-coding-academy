/**
 * Unit tests for CourseCard and CourseCatalog components.
 *
 * next-intl server components cannot render under jsdom; this file tests
 * presentational behavior by wrapping with NextIntlClientProvider so
 * useTranslations resolves against the en-US.json catalog.
 *
 * Mocked:
 * - @/i18n/navigation (Link -> plain <a>, useRouter -> vi.fn())
 * - @/lib/courses/actions (enrollInCourse -> vi.fn())
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import enMessages from "@/messages/en-US.json"
import type { CourseSummary } from "@/lib/courses/types"

// ---------------------------------------------------------------------------
// Mocks - declared before static imports of the components under test
// ---------------------------------------------------------------------------

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/lib/courses/actions", () => ({
  enrollInCourse: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}))

// Static imports after mocks so vi.mock hoisting applies.
import { CourseCard } from "@/components/courses/course-card"
import { CourseCatalog } from "@/components/courses/course-catalog"

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

function makeCourse(overrides: Partial<CourseSummary> = {}): CourseSummary {
  return {
    id: "course-1",
    slug: "intro-to-js",
    title: "Introduction to JavaScript",
    description: "Learn the fundamentals of JavaScript programming.",
    level: "beginner",
    status: "published",
    language: "en",
    coverImageUrl: null,
    lessonCount: 12,
    totalDurationSeconds: 3600,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// CourseCard tests
// ---------------------------------------------------------------------------

describe("CourseCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the course title", () => {
    const course = makeCourse()
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(screen.getByText("Introduction to JavaScript")).toBeInTheDocument()
  })

  it("renders the course description", () => {
    const course = makeCourse()
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(
      screen.getByText("Learn the fundamentals of JavaScript programming.")
    ).toBeInTheDocument()
  })

  it("renders the level badge with localized label for beginner", () => {
    const course = makeCourse({ level: "beginner" })
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(screen.getByText("Beginner")).toBeInTheDocument()
  })

  it("renders Intermediate label for intermediate level", () => {
    const course = makeCourse({ level: "intermediate" })
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(screen.getByText("Intermediate")).toBeInTheDocument()
  })

  it("renders Advanced label for advanced level", () => {
    const course = makeCourse({ level: "advanced" })
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(screen.getByText("Advanced")).toBeInTheDocument()
  })

  it("renders the lesson count with plural", () => {
    const course = makeCourse({ lessonCount: 12 })
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(screen.getByText("12 lessons")).toBeInTheDocument()
  })

  it("uses singular for 1 lesson", () => {
    const course = makeCourse({ lessonCount: 1 })
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(screen.getByText("1 lesson")).toBeInTheDocument()
  })

  it("renders enroll CTA link for anonymous user", () => {
    const course = makeCourse()
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    expect(
      screen.getByRole("link", { name: /enroll now/i })
    ).toBeInTheDocument()
  })

  it("renders continue CTA link when already enrolled", () => {
    const course = makeCourse()
    render(
      wrap(
        <CourseCard course={course} userId="user-1" isEnrolled={true} />
      )
    )
    expect(
      screen.getByRole("link", { name: /continue learning/i })
    ).toBeInTheDocument()
  })

  it("renders cover image when coverImageUrl is set", () => {
    const course = makeCourse({ coverImageUrl: "https://example.com/img.jpg" })
    render(
      wrap(
        <CourseCard course={course} userId={null} isEnrolled={false} />
      )
    )
    const img = screen.getByRole("img", { name: "Introduction to JavaScript" })
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg")
  })

  it("renders an enroll button for authenticated but not enrolled user", () => {
    const course = makeCourse()
    render(
      wrap(
        <CourseCard course={course} userId="user-1" isEnrolled={false} />
      )
    )
    expect(
      screen.getByRole("button", { name: /enroll now/i })
    ).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// CourseCatalog tests
// ---------------------------------------------------------------------------

describe("CourseCatalog", () => {
  it("renders the empty state when courses array is empty", () => {
    render(
      wrap(
        <CourseCatalog
          courses={[]}
          userId={null}
          enrolledCourseIds={new Set()}
        />
      )
    )
    expect(screen.getByText("No Courses Yet")).toBeInTheDocument()
    expect(
      screen.getByText(/new courses are added regularly/i)
    ).toBeInTheDocument()
  })

  it("renders a card per course", () => {
    const courses = [
      makeCourse({ id: "c1", slug: "course-1", title: "Course Alpha" }),
      makeCourse({ id: "c2", slug: "course-2", title: "Course Beta" }),
    ]
    render(
      wrap(
        <CourseCatalog
          courses={courses}
          userId={null}
          enrolledCourseIds={new Set()}
        />
      )
    )
    expect(screen.getByText("Course Alpha")).toBeInTheDocument()
    expect(screen.getByText("Course Beta")).toBeInTheDocument()
  })

  it("marks enrolled course with Continue CTA", () => {
    const courses = [
      makeCourse({ id: "c1", slug: "course-1", title: "Course Alpha" }),
    ]
    render(
      wrap(
        <CourseCatalog
          courses={courses}
          userId="user-1"
          enrolledCourseIds={new Set(["c1"])}
        />
      )
    )
    expect(
      screen.getByRole("link", { name: /continue learning/i })
    ).toBeInTheDocument()
  })
})
