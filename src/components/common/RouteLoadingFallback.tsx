import { AppStatePanel } from "@/components/common/AppStatePanel";

export function RouteLoadingFallback() {
  return (
    <AppStatePanel
      description="Vui lòng chờ trong giây lát."
      title="Đang tải trang…"
    />
  );
}
