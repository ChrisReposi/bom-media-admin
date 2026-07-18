export type AdminRole = "OWNER" | "ADMIN" | "STAFF";

export type AdminStatus = "ACTIVE" | "DISABLED";

export type SafeAdmin = {
  id: string;
  username: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
};

export type AdminAuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type LoginAdminRequest = {
  username: string;
  password: string;
};

export type LoginAdminResponse = {
  message: string;
  admin: SafeAdmin;
  tokens: AdminAuthTokens;
};

export type RefreshAdminTokenRequest = {
  refreshToken: string;
};

export type RefreshAdminTokenResponse = {
  message: string;
  admin: SafeAdmin;
  tokens: AdminAuthTokens;
};

export type LogoutAdminRequest = {
  refreshToken: string;
};

export type LogoutAdminResponse = {
  message: string;
};

export type ChangeAdminPasswordRequest = {
  oldPassword: string;
  newPassword: string;
  secretCode: string;
};

export type ChangeAdminPasswordResponse = {
  message: string;
};

export type ChangeOwnAdminPasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type AdminOwnSession = {
  id: string;
  isCurrent: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
};

export type AdminOwnSessionListResponse = { items: AdminOwnSession[] };
export type RevokeOwnAdminSessionResponse = {
  message: string;
  currentSessionRevoked: boolean;
};

export type MeAdminResponse = {
  admin: SafeAdmin;
};

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "error"
  | "checking";

export type AuthState = {
  admin: SafeAdmin | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: "Bearer" | null;
  expiresIn: number | null;
  status: AuthStatus;
  error: string | null;
  isAuthenticated: boolean;
};
