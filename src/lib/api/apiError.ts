import axios from "axios";

export type NormalizedApiError = {
  status: number | null;
  message: string;
  code?: string;
  isCanceled: boolean;
  isAuthError: boolean;
  isNetworkError: boolean;
  isRateLimitError: boolean;
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

function isAbortDomException(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (isAbortDomException(error)) {
    return {
      status: null,
      message: "Yêu cầu đã được hủy.",
      isCanceled: true,
      isAuthError: false,
      isNetworkError: false,
      isRateLimitError: false,
      isServerError: false,
    };
  }

  if (!axios.isAxiosError(error)) {
    return {
      status: null,
      message: "Có lỗi xảy ra. Vui lòng thử lại.",
      isCanceled: false,
      isAuthError: false,
      isNetworkError: false,
      isRateLimitError: false,
      isServerError: false,
    };
  }

  if (axios.isCancel(error)) {
    return {
      status: null,
      message: "Yêu cầu đã được hủy.",
      code: error.code,
      isCanceled: true,
      isAuthError: false,
      isNetworkError: false,
      isRateLimitError: false,
      isServerError: false,
    };
  }

  if (!error.response) {
    return {
      status: null,
      message: "Không thể kết nối tới API. Vui lòng kiểm tra server hoặc mạng.",
      code: error.code,
      isCanceled: false,
      isAuthError: false,
      isNetworkError: true,
      isRateLimitError: false,
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
      isCanceled: false,
      isAuthError: true,
      isNetworkError: false,
      isRateLimitError: false,
      isServerError: false,
    };
  }

  if (status === 403) {
    return {
      status,
      message: "Bạn không có quyền thực hiện thao tác này.",
      code,
      isCanceled: false,
      isAuthError: true,
      isNetworkError: false,
      isRateLimitError: false,
      isServerError: false,
    };
  }

  if (status === 429) {
    return {
      status,
      message: "Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.",
      code,
      isCanceled: false,
      isAuthError: false,
      isNetworkError: false,
      isRateLimitError: true,
      isServerError: false,
    };
  }

  if (status >= 500) {
    return {
      status,
      message: "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.",
      code,
      isCanceled: false,
      isAuthError: false,
      isNetworkError: false,
      isRateLimitError: false,
      isServerError: true,
    };
  }

  return {
    status,
    message:
      readApiMessage(error.response.data) ?? "Có lỗi xảy ra. Vui lòng thử lại.",
    code,
    isCanceled: false,
    isAuthError: false,
    isNetworkError: false,
    isRateLimitError: false,
    isServerError: false,
  };
}

export function getApiErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

export function isApiRequestCanceled(error: unknown): boolean {
  return normalizeApiError(error).isCanceled;
}
