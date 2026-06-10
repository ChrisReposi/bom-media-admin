import axios from "axios";

export type NormalizedApiError = {
  status: number | null;
  message: string;
  code?: string;
  isAuthError: boolean;
  isNetworkError: boolean;
  isServerError: boolean;
};

function readStringProperty(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== "object" || !(key in data)) {
    return undefined;
  }

  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function readApiMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const directMessage = (data as { message?: unknown }).message;

  if (typeof directMessage === "string") {
    return directMessage;
  }

  if (
    Array.isArray(directMessage) &&
    directMessage.every((item) => typeof item === "string")
  ) {
    return directMessage.join(" ");
  }

  if ("data" in data) {
    return readApiMessage((data as { data?: unknown }).data);
  }

  return null;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (!axios.isAxiosError(error)) {
    return {
      status: null,
      message: "Có lỗi xảy ra. Vui lòng thử lại.",
      isAuthError: false,
      isNetworkError: false,
      isServerError: false,
    };
  }

  if (!error.response) {
    return {
      status: null,
      message: "Không thể kết nối tới API. Vui lòng kiểm tra server hoặc mạng.",
      code: error.code,
      isAuthError: false,
      isNetworkError: true,
      isServerError: false,
    };
  }

  const status = error.response.status;
  const code =
    readStringProperty(error.response.data, "code") ??
    readStringProperty(error.response.data, "reasonCode");

  if (status === 401) {
    return {
      status,
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      code,
      isAuthError: true,
      isNetworkError: false,
      isServerError: false,
    };
  }

  if (status === 403) {
    return {
      status,
      message: "Bạn không có quyền thực hiện thao tác này.",
      code,
      isAuthError: true,
      isNetworkError: false,
      isServerError: false,
    };
  }

  if (status >= 500) {
    return {
      status,
      message: "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.",
      code,
      isAuthError: false,
      isNetworkError: false,
      isServerError: true,
    };
  }

  return {
    status,
    message:
      readApiMessage(error.response.data) ?? "Có lỗi xảy ra. Vui lòng thử lại.",
    code,
    isAuthError: false,
    isNetworkError: false,
    isServerError: false,
  };
}

export function getApiErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}
