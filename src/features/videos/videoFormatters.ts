export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "--:--";
  }

  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const sec = safeSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatViews(value?: string | number | null): string {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n) || n < 0) return "0";

  if (n >= 1_000_000) {
    return `${(n / 1_000_000)
      .toFixed(n >= 10_000_000 ? 0 : 1)
      .replace(".0", "")} Tr`;
  }

  if (n >= 1_000) {
    return `${Math.round(n / 1_000)} N`;
  }

  return String(Math.round(n));
}

export function formatRelativeTime(date?: string | null): string {
  if (!date) return "Chưa xuất bản";

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return "Chưa xuất bản";

  const diff = Math.max(0, (Date.now() - timestamp) / 1000);

  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần trước`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng trước`;

  return `${Math.floor(diff / 31536000)} năm trước`;
}

export function getProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    BUNNY: "Bunny",
    CLOUDINARY: "Cloudinary",
    MANUAL: "Manual",
    MUX: "Mux",
  };

  return labels[provider] ?? provider;
}
