export type ShareLinkComposerPayload = {
  label?: string;
  maxViews?: number;
  expiresAt?: string;
};

export type DashboardVideoSearchStatus =
  | "idle"
  | "too-short"
  | "loading"
  | "error";
