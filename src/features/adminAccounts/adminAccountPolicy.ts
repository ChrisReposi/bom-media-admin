import type { NormalizedApiError } from "@/lib/api/apiError";

const ERROR_MESSAGES: Record<string, string> = {
  ADMIN_USERNAME_TAKEN: "Tên đăng nhập đã được sử dụng.",
  ADMIN_ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản quản trị.",
  ADMIN_ACCOUNT_DISABLED: "Tài khoản quản trị đang bị vô hiệu hóa.",
  ADMIN_ACCOUNT_DELETED: "Tài khoản quản trị đã bị xóa logic.",
  ADMIN_ROLE_NOT_ALLOWED: "Vai trò được chọn không được phép.",
  ADMIN_OWNER_PROTECTED: "Không thể thay đổi tài khoản OWNER.",
  ADMIN_SELF_ACTION_FORBIDDEN:
    "OWNER không thể thực hiện thao tác này với chính mình.",
  ADMIN_ACCOUNT_ALREADY_DISABLED: "Tài khoản đã bị vô hiệu hóa.",
  ADMIN_ACCOUNT_ALREADY_ACTIVE: "Tài khoản đã hoạt động.",
  ADMIN_ACTIVE_UPLOAD_BLOCKS_DELETE:
    "Tài khoản còn phiên tải lên đang hoạt động; hãy hoàn tất hoặc hủy trước.",
  ADMIN_CONCURRENT_MUTATION:
    "Tài khoản vừa được thay đổi ở nơi khác. Danh sách đã được tải lại.",
  OWNER_REAUTH_REQUIRED: "Mật khẩu OWNER hiện tại không đúng.",
  ADMIN_ACCOUNT_MANAGEMENT_DISABLED: "Quản lý tài khoản đang tắt trên máy chủ.",
};

export function getAdminAccountErrorMessage(error: NormalizedApiError): string {
  return (error.code && ERROR_MESSAGES[error.code]) || error.message;
}

export function shouldRefreshCurrentAdmin(error: NormalizedApiError): boolean {
  return error.status === 403;
}
