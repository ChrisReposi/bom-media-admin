import type { AdminAuthTokens, SafeAdmin } from "./authTypes";

const CHANNEL_NAME = "bom-media-admin-auth";
const EVENT_KEY = "bom-media-admin-auth-event";
const LOCK_KEY = "bom-media-admin-refresh-lock";
const REFRESH_HANDOFF_KEY = "bom-media-admin-refresh-handoff";
const TAB_ID = crypto.randomUUID();

export type AuthCrossTabEvent =
  | {
      type: "AUTH_UPDATED";
      origin: string;
      admin: SafeAdmin;
      tokens: AdminAuthTokens;
    }
  | {
      type: "IDENTITY_CHANGED";
      origin: string;
      admin: SafeAdmin;
      tokens: AdminAuthTokens;
    }
  | { type: "AUTH_CLEARED"; origin: string; reason?: string };

type AuthCrossTabEventInput =
  | {
      type: "AUTH_UPDATED";
      admin: SafeAdmin;
      tokens: AdminAuthTokens;
    }
  | {
      type: "IDENTITY_CHANGED";
      admin: SafeAdmin;
      tokens: AdminAuthTokens;
    }
  | { type: "AUTH_CLEARED"; reason?: string };

type Listener = (event: AuthCrossTabEvent) => void;
const listeners = new Set<Listener>();
const channel =
  typeof window === "undefined" || typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel(CHANNEL_NAME);

export type AuthCrossTabAction = "clear" | "update" | "replace-and-reload";

export function getAuthCrossTabAction(
  currentAdminId: string | null,
  event: AuthCrossTabEvent,
): AuthCrossTabAction {
  if (event.type === "AUTH_CLEARED") return "clear";
  if (event.type === "AUTH_UPDATED" && currentAdminId === event.admin.id) {
    return "update";
  }
  return "replace-and-reload";
}

function deliver(event: AuthCrossTabEvent): void {
  if (event.origin === TAB_ID) return;
  listeners.forEach((listener) => listener(event));
}

channel?.addEventListener("message", (message: MessageEvent<unknown>) => {
  if (isAuthEvent(message.data)) deliver(message.data);
});

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== EVENT_KEY || !event.newValue) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      if (isAuthEvent(parsed)) deliver(parsed);
    } catch {
      // Ignore malformed events from unrelated scripts/extensions.
    }
  });
}

export function publishAuthEvent(event: AuthCrossTabEventInput): void {
  const message = { ...event, origin: TAB_ID } as AuthCrossTabEvent;
  channel?.postMessage(message);
  if (typeof localStorage !== "undefined") {
    if (event.type === "AUTH_CLEARED" || event.type === "IDENTITY_CHANGED") {
      localStorage.removeItem(REFRESH_HANDOFF_KEY);
    }
    localStorage.setItem(EVENT_KEY, JSON.stringify(message));
    localStorage.removeItem(EVENT_KEY);
  }
}

export async function writeRefreshHandoff(
  previousRefreshToken: string,
  payload: { admin: SafeAdmin; tokens: AdminAuthTokens },
): Promise<void> {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    REFRESH_HANDOFF_KEY,
    JSON.stringify({
      previousTokenHash: await digestToken(previousRefreshToken),
      expiresAt: Date.now() + 15_000,
      admin: payload.admin,
      tokens: payload.tokens,
    }),
  );
}

export async function readRefreshHandoff(
  previousRefreshToken: string,
): Promise<{ admin: SafeAdmin; tokens: AdminAuthTokens } | null> {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFRESH_HANDOFF_KEY);
    if (!raw) return null;
    const candidate = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof candidate.expiresAt !== "number" ||
      candidate.expiresAt <= Date.now() ||
      typeof candidate.previousTokenHash !== "string" ||
      candidate.previousTokenHash !==
        (await digestToken(previousRefreshToken)) ||
      !isSafeAdmin(candidate.admin) ||
      !isAuthTokens(candidate.tokens)
    ) {
      localStorage.removeItem(REFRESH_HANDOFF_KEY);
      return null;
    }
    return { admin: candidate.admin, tokens: candidate.tokens };
  } catch {
    return null;
  }
}

export function subscribeAuthEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function withCrossTabRefreshLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(CHANNEL_NAME, operation);
  }
  return withLease(operation);
}

async function withLease<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof localStorage === "undefined") {
    return operation();
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const now = Date.now();
    const existing = readLease();
    if (!existing || existing.expiresAt <= now) {
      const lease = { owner: TAB_ID, expiresAt: now + 5000 };
      localStorage.setItem(LOCK_KEY, JSON.stringify(lease));
      const acquired = readLease();
      if (acquired?.owner === TAB_ID) {
        try {
          return await operation();
        } finally {
          if (readLease()?.owner === TAB_ID) localStorage.removeItem(LOCK_KEY);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error("Unable to coordinate session refresh safely.");
}

function readLease(): { owner: string; expiresAt: number } | null {
  try {
    const value = localStorage.getItem(LOCK_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as {
      owner?: unknown;
      expiresAt?: unknown;
    };
    return typeof parsed.owner === "string" &&
      typeof parsed.expiresAt === "number"
      ? { owner: parsed.owner, expiresAt: parsed.expiresAt }
      : null;
  } catch {
    return null;
  }
}

async function digestToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isAuthEvent(value: unknown): value is AuthCrossTabEvent {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.origin !== "string") return false;
  if (candidate.type === "AUTH_CLEARED") {
    return (
      candidate.reason === undefined || typeof candidate.reason === "string"
    );
  }
  if (
    candidate.type !== "AUTH_UPDATED" &&
    candidate.type !== "IDENTITY_CHANGED"
  ) {
    return false;
  }
  return isSafeAdmin(candidate.admin) && isAuthTokens(candidate.tokens);
}

function isSafeAdmin(value: unknown): value is SafeAdmin {
  if (typeof value !== "object" || value === null) return false;
  const admin = value as Record<string, unknown>;
  return (
    typeof admin.id === "string" &&
    typeof admin.username === "string" &&
    ["OWNER", "ADMIN", "STAFF"].includes(String(admin.role)) &&
    typeof admin.mustChangePassword === "boolean"
  );
}

function isAuthTokens(value: unknown): value is AdminAuthTokens {
  if (typeof value !== "object" || value === null) return false;
  const tokens = value as Record<string, unknown>;
  return (
    typeof tokens.accessToken === "string" &&
    typeof tokens.refreshToken === "string" &&
    typeof tokens.tokenType === "string" &&
    typeof tokens.expiresIn === "number"
  );
}
