import { Shield } from "lucide-react";

export function AdminReadOnlyNotice() {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) px-4 py-3 text-sm text-(--admin-text)"
      role="status"
    >
      <Shield className="mt-0.5 size-4 shrink-0 text-(--admin-primary)" />
      <p>
        Tài khoản này đang ở chế độ chỉ đọc. Máy chủ sẽ từ chối mọi thao tác
        thay đổi dữ liệu.
      </p>
    </div>
  );
}
