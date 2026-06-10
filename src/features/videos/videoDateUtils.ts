const ADMIN_PUBLISHED_AT_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?$/;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseAdminPublishedAtInput(value: string): string | undefined {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const match = ADMIN_PUBLISHED_AT_PATTERN.exec(trimmed);
  if (match === null) {
    return undefined;
  }

  const [, rawDay, rawMonth, rawYear, rawHour, rawMinute] = match;
  const day = Number(rawDay);
  const month = Number(rawMonth);
  const year = Number(rawYear);
  const hour = rawHour === undefined ? 0 : Number(rawHour);
  const minute = rawMinute === undefined ? 0 : Number(rawMinute);

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
    return undefined;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return undefined;
  }

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
