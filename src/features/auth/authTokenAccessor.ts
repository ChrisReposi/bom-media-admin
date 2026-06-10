let currentAccessToken: string | null = null;

export function setAuthAccessToken(accessToken: string | null): void {
  currentAccessToken = accessToken;
}

export function getAuthAccessToken(): string | null {
  return currentAccessToken;
}
