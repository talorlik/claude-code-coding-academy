import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton placeholder shown while the async catalog section loads.
 * Renders 3 card-shaped skeletons in the same responsive grid as CourseCatalog.
 */
export function CourseCatalogSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading courses"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="min-w-0">
          <div className="flex flex-col gap-4 overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Skeleton className="aspect-video w-full rounded-none rounded-t-xl" />
            <div className="flex flex-col gap-3 px-4 pb-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="mt-2 h-8 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
