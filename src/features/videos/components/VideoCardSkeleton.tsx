import { Skeleton } from "@/components/ui/skeleton";

export function VideoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
      <Skeleton className="aspect-video w-full rounded-none" />

      <div className="flex gap-3 p-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />

        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
