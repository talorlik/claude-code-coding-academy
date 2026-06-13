"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LessonSidebar } from "./lesson-sidebar"
import type { LessonSummary } from "@/lib/courses/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LessonSidebarMobileProps {
  lessons: LessonSummary[]
  activeSlug: string
  courseSlug: string
  completedLessonIds: Set<string>
  courseTitle: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Mobile-only lesson sidebar rendered inside a Sheet/drawer. The trigger
 * button is visible only below the `md` breakpoint (the parent hides it on
 * desktop with `md:hidden`). Clicking a lesson link closes the drawer so the
 * video area gains full focus.
 *
 * Sheet side is "left" which aligns with the inline-start position for LTR.
 * In RTL (Hebrew), the CSS logical utility `border-e` in the sheet handles
 * the correct border. The sheet uses `data-[side=left]` classes already
 * defined in components/ui/sheet.tsx.
 */
export function LessonSidebarMobile({
  lessons,
  activeSlug,
  courseSlug,
  completedLessonIds,
  courseTitle,
}: LessonSidebarMobileProps) {
  const t = useTranslations("Course")
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("openLessonList")}
      >
        <Menu className="size-4" aria-hidden="true" />
        <span>{t("lessonListLabel")}</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-80 overflow-y-auto p-0"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm font-medium leading-tight">
            {courseTitle}
          </SheetTitle>
        </SheetHeader>
        {/* The div wrapper closes the sheet when a lesson link is clicked.
            The accessible interaction is on the child <a> links themselves;
            this div exists only for the close side-effect. role="none"
            communicates that the div adds no semantic meaning. */}
        <div
          role="none"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              (e.target as HTMLElement).tagName === "A"
            ) {
              setOpen(false)
            }
          }}
        >
          <LessonSidebar
            lessons={lessons}
            activeSlug={activeSlug}
            courseSlug={courseSlug}
            completedLessonIds={completedLessonIds}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
