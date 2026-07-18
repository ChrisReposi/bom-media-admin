import type { NormalizedApiError } from "@/lib/api/apiError";

export type LogoutFailurePolicy = {
  clearLocalSession: boolean;
  canRetry: boolean;
  allowExplicitLocalClear: boolean;
  message: string;
};

export function getLogoutFailurePolicy(
  error: NormalizedApiError,
): LogoutFailurePolicy {
  if (error.status === 401) {
    return {
      clearLocalSession: true,
      canRetry: false,
      allowExplicitLocalClear: false,
      message: "Phiên máy chủ đã không còn hợp lệ. Đã xóa phiên cục bộ.",
    };
  }

  return {
    clearLocalSession: false,
    canRetry: true,
    allowExplicitLocalClear: true,
    message: error.isNetworkError
      ? "Không thể xác nhận đăng xuất với máy chủ. Phiên cục bộ vẫn được giữ để bạn thử lại."
      : "Máy chủ chưa xác nhận thu hồi phiên. Phiên cục bộ vẫn được giữ để bạn thử lại.",
  };
}
