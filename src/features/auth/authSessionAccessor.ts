import type {
  AdminAuthTokens,
  RefreshAdminTokenResponse,
  SafeAdmin,
} from "./authTypes";

type AuthSessionSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthSessionHandlers = {
  getSnapshot: () => AuthSessionSnapshot;
  updateSession: (payload: {
    admin?: SafeAdmin;
    tokens: AdminAuthTokens;
  }) => void;
  clearSession: (reason?: string) => void;
};

let handlers: AuthSessionHandlers = {
  getSnapshot: () => ({ accessToken: null, refreshToken: null }),
  updateSession: () => undefined,
  clearSession: () => undefined,
};

export function configureAuthSessionHandlers(
  nextHandlers: AuthSessionHandlers,
): void {
  handlers = nextHandlers;
}

export function getAuthSessionSnapshot(): AuthSessionSnapshot {
  return handlers.getSnapshot();
}

export function updateAuthSessionFromRefresh(
  response: RefreshAdminTokenResponse,
): void {
  handlers.updateSession({
    admin: response.admin,
    tokens: response.tokens,
  });
}

export function clearAuthSession(reason?: string): void {
  handlers.clearSession(reason);
}
