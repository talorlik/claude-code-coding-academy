import { Skeleton } from "@/components/ui/skeleton"

/**
 * Suspense loading skeleton for the course learning page.
 *
 * Mirrors the two-column layout (sidebar + lesson area) so the viewport does
 * not shift when data loads.
 */
export default function CourseLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header skeleton */}
      <div className="border-b bg-background px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-1.5 h-4 w-1/2" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        {/* Sidebar skeleton (desktop) */}
        <div className="hidden w-72 shrink-0 border-e p-4 md:block">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>

        {/* Lesson area skeleton */}
        <div className="min-w-0 flex-1 px-4 py-6">
          {/* Video skeleton */}
          <Skeleton className="mb-4 aspect-video w-full rounded-lg" />
          <Skeleton className="mb-2 h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}
