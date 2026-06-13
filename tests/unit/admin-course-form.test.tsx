/**
 * Unit test for the AdminCourseForm component.
 *
 * Wraps with NextIntlClientProvider to resolve useTranslations.
 * Mocks server actions and navigation so no live network calls occur.
 *
 * Tested invariants:
 * - Renders all form fields.
 * - Shows a field error from a failed ActionResult (slug taken).
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import enMessages from "@/messages/en-US.json"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn()

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

// Default: createCourse returns a slug-taken error.
const mockCreateCourse = vi.fn().mockResolvedValue({
  ok: false,
  message: "A course with this slug already exists.",
  fieldErrors: { slug: "A course with this slug already exists." },
})

vi.mock("@/lib/admin/course-actions", () => ({
  createCourse: (...args: unknown[]) => mockCreateCourse(...args),
  updateCourse: vi.fn().mockResolvedValue({ ok: true, data: { id: "x", slug: "x" } }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Static imports after mocks.
import { AdminCourseForm } from "@/components/admin/admin-course-form"

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

describe("AdminCourseForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateCourse.mockResolvedValue({
      ok: false,
      message: "A course with this slug already exists.",
      fieldErrors: { slug: "A course with this slug already exists." },
    })
  })

  it("renders all main form fields", () => {
    render(wrap(<AdminCourseForm mode="create" />))

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/level/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it("shows slug field error when action returns fieldErrors.slug", async () => {
    render(wrap(<AdminCourseForm mode="create" />))

    // Fill in required fields.
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "My Course" },
    })
    fireEvent.change(screen.getByLabelText(/slug/i), {
      target: { value: "existing-slug" },
    })
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Description text" },
    })

    fireEvent.submit(screen.getByRole("button", { name: /create course/i }).closest("form")!)

    await waitFor(() => {
      const matches = screen.getAllByText(/slug already exists/i)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("renders create button in create mode", () => {
    render(wrap(<AdminCourseForm mode="create" />))
    expect(
      screen.getByRole("button", { name: /create course/i })
    ).toBeInTheDocument()
  })

  it("renders save changes button in edit mode", () => {
    render(
      wrap(
        <AdminCourseForm
          mode="edit"
          courseId="course-uuid"
          defaultValues={{
            title: "Existing",
            slug: "existing",
            description: "Desc",
            level: "beginner",
            status: "draft",
            language: "en",
          }}
        />
      )
    )
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument()
  })
})
