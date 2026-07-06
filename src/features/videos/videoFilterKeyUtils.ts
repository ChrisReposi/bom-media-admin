export const VIDEO_FILTER_KEY_MAX_LENGTH = 64;

export const VIDEO_FILTER_KEY_EXAMPLES = [
  "sml",
  "msa",
  "judge_judy",
  "coryxkenshin",
] as const;

const VIDEO_FILTER_KEY_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function normalizeVideoFilterKeyInput(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, VIDEO_FILTER_KEY_MAX_LENGTH);
}

export function isValidVideoFilterKey(value: string): boolean {
  const normalizedValue = normalizeVideoFilterKeyInput(value);

  if (!normalizedValue) {
    return true;
  }

  return (
    normalizedValue !== "all" && VIDEO_FILTER_KEY_PATTERN.test(normalizedValue)
  );
}

export function getVideoFilterKeyValue(
  value: string | null | undefined,
): string | null {
  const normalizedValue = normalizeVideoFilterKeyInput(value ?? "");
  return normalizedValue && isValidVideoFilterKey(normalizedValue)
    ? normalizedValue
    : null;
}

export function formatVideoFilterKeyLabel(
  value: string | null | undefined,
): string {
  return getVideoFilterKeyValue(value) ?? "Chưa gắn key";
}
