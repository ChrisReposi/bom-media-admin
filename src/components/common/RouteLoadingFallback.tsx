export function RouteLoadingFallback() {
  return (
    <section aria-busy="true" aria-label="Đang tải trang" className="space-y-6">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-(--admin-surface)" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-lg bg-(--admin-surface)" />
        <div className="h-24 animate-pulse rounded-lg bg-(--admin-surface)" />
        <div className="h-24 animate-pulse rounded-lg bg-(--admin-surface)" />
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-(--admin-surface)" />
    </section>
  );
}
