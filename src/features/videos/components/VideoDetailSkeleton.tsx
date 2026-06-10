import { Skeleton } from "@/components/ui/skeleton";

export function VideoDetailSkeleton() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-7 w-44" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
