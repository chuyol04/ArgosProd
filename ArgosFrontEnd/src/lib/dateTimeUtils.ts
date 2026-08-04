/**
 * Timezone-safe helpers for DATE/TIME fields coming from the backend.
 *
 * MySQL DATE/TIME columns have no timezone — they're wall-clock values like
 * '2024-01-15' or '08:00:00'. Never round-trip them through `new Date(str)`
 * + `toISOString()`/`toLocaleDateString()`: `new Date('2024-01-15')` parses
 * as UTC midnight, and formatting it back with the browser's LOCAL timezone
 * can shift the displayed day by one depending on the user's offset. These
 * helpers work directly on the string components instead.
 */

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Extracts the 'YYYY-MM-DD' portion regardless of any trailing time/offset. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/** Extracts 'HH:MM' for binding to <input type="time">. */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

/** Human-readable 'D-mon-YYYY' display, built from string parts only. */
export function formatDateDisplay(value: string | null | undefined): string {
  if (!value) return "-";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  const monthName = MONTHS_ES[Number(m) - 1] ?? m;
  return `${Number(d)}-${monthName}-${y}`;
}

/** Human-readable 'HH:MM' (always 24h, since the DB already stores 24h strings). */
export function formatTimeDisplay(value: string | null | undefined): string {
  if (!value) return "-";
  return value.slice(0, 5);
}

/** Today's date as 'YYYY-MM-DD' using the browser's LOCAL date (never UTC). */
export function todayLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Lexicographic 'YYYY-MM-DD' comparison is safe and avoids any Date parsing. */
export function isPastLocalDate(value: string | null | undefined): boolean {
  if (!value) return false;
  return toDateInputValue(value) < todayLocalDateString();
}

/**
 * Converts an empty string to `undefined` so payloads sent to the backend
 * either carry a valid value or omit the field — never `""`, which would
 * get written into a DATE/TIME column.
 */
export function emptyToUndefined(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Worked hours = end_time - start_time, for a single inspector's own
 * report (never summed across inspectors, never multiplied by headcount).
 * Returns `null` when either time is missing or end isn't strictly after
 * start (an invalid range we never silently "fix" into a wrong number).
 */
export function calculateWorkedHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number | null {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return null;
  if (end <= start) return null;
  return Math.round(((end - start) / 60) * 100) / 100;
}

/** True when both times are present but end_time isn't strictly after start_time. */
export function isInvalidTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): boolean {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return false;
  return end <= start;
}

/** `true` for a well-formed 'HH:MM' 24-hour string (00:00–23:59). */
export function isValidTimeFormat(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}
