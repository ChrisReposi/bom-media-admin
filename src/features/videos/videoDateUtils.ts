const FORMATTED_ADMIN_PUBLISHED_AT_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:,|\s)\s*(\d{1,2}):(\d{1,2}))?$/;
const COMPACT_ADMIN_PUBLISHED_AT_PATTERN =
  /^(\d{2})(\d{2})(\d{4})(?:(?:\s*,\s*|\s+)?(\d{2})(\d{2}))?$/;

type AdminPublishedAtParts = {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  hasTime: boolean;
};

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function sanitizeAdminPublishedAtInput(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function isValidAdminPublishedAtParts(parts: AdminPublishedAtParts): boolean {
  const { day, month, year, hour, minute } = parts;

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return false;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
}

function createAdminPublishedAtParts(
  rawDay: string,
  rawMonth: string,
  rawYear: string,
  rawHour: string | undefined,
  rawMinute: string | undefined,
): AdminPublishedAtParts | null {
  const parts: AdminPublishedAtParts = {
    day: Number(rawDay),
    month: Number(rawMonth),
    year: Number(rawYear),
    hour: rawHour === undefined ? 0 : Number(rawHour),
    minute: rawMinute === undefined ? 0 : Number(rawMinute),
    hasTime: rawHour !== undefined || rawMinute !== undefined,
  };

  return isValidAdminPublishedAtParts(parts) ? parts : null;
}

function readAdminPublishedAtParts(
  value: string,
): AdminPublishedAtParts | null {
  const sanitized = sanitizeAdminPublishedAtInput(value);

  if (sanitized === "") {
    return null;
  }

  const formattedMatch = FORMATTED_ADMIN_PUBLISHED_AT_PATTERN.exec(sanitized);
  if (formattedMatch !== null) {
    const [, rawDay, rawMonth, rawYear, rawHour, rawMinute] = formattedMatch;

    return createAdminPublishedAtParts(
      rawDay,
      rawMonth,
      rawYear,
      rawHour,
      rawMinute,
    );
  }

  const compactMatch = COMPACT_ADMIN_PUBLISHED_AT_PATTERN.exec(sanitized);
  if (compactMatch !== null) {
    const [, rawDay, rawMonth, rawYear, rawHour, rawMinute] = compactMatch;

    return createAdminPublishedAtParts(
      rawDay,
      rawMonth,
      rawYear,
      rawHour,
      rawMinute,
    );
  }

  return null;
}

function formatAdminPublishedAtParts(parts: AdminPublishedAtParts): string {
  const dateLabel = `${padDatePart(parts.day)}/${padDatePart(parts.month)}/${
    parts.year
  }`;

  if (!parts.hasTime) {
    return dateLabel;
  }

  return `${dateLabel}, ${padDatePart(parts.hour)}:${padDatePart(
    parts.minute,
  )}`;
}

export function normalizeAdminPublishedAtInput(value: string): string {
  const sanitized = sanitizeAdminPublishedAtInput(value);

  if (sanitized === "") {
    return "";
  }

  const parts = readAdminPublishedAtParts(sanitized);

  return parts === null ? sanitized : formatAdminPublishedAtParts(parts);
}

export function formatAdminPublishedAtTypingValue(value: string): string {
  return normalizeAdminPublishedAtInput(value);
}

export function parseAdminPublishedAtInput(value: string): string | undefined {
  const parts = readAdminPublishedAtParts(value);

  if (parts === null) {
    return undefined;
  }

  const date = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0,
  );

  return date.toISOString();
}

export function formatAdminPublishedAtInput(date: Date): string {
  return `${padDatePart(date.getDate())}/${padDatePart(
    date.getMonth() + 1,
  )}/${date.getFullYear()}, ${padDatePart(date.getHours())}:${padDatePart(
    date.getMinutes(),
  )}`;
}

export function isoToDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${padDatePart(
    date.getMonth() + 1,
  )}-${padDatePart(date.getDate())}T${padDatePart(
    date.getHours(),
  )}:${padDatePart(date.getMinutes())}`;
}

export function dateTimeLocalToIso(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}
