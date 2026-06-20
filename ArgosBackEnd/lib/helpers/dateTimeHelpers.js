// lib/helpers/dateTimeHelpers.js  (ESM)
//
// Centralized, timezone-safe handling for DATE/TIME columns.
// MySQL DATE/TIME values have no timezone (they're wall-clock values), so we
// never want to round-trip them through JS `Date` objects (which always
// carry an implicit UTC/local timezone and can shift the calendar day).
// The pool is configured with `dateStrings: true`, so anything coming out of
// MySQL is already a plain 'YYYY-MM-DD' / 'HH:MM:SS' string — these helpers
// only need to validate/normalize plain strings.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

/**
 * Normalizes a DATE field coming from the request body.
 * - undefined  -> undefined (field not sent, leave untouched on UPDATE)
 * - null / ""  -> null (explicitly clear the field)
 * - 'YYYY-MM-DD' -> returned as-is
 * - anything else invalid -> null (avoid '0000-00-00' / SQL errors)
 */
export function sanitizeDateField(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'string' && DATE_RE.test(value.slice(0, 10))) {
    return value.slice(0, 10);
  }
  return null;
}

/**
 * Normalizes a TIME field coming from the request body.
 * Accepts 'HH:MM' or 'HH:MM:SS' and always stores as 'HH:MM:SS' (24h).
 */
export function sanitizeTimeField(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'string' && TIME_RE.test(value)) {
    return value.length === 5 ? `${value}:00` : value;
  }
  return null;
}

/**
 * Today's date as 'YYYY-MM-DD' using the server's LOCAL timezone
 * (never UTC) — for comparisons against DATE columns.
 */
export function todayLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a 'YYYY-MM-DD' string for human-readable output (e.g. Excel)
 * without ever constructing a JS Date object out of it.
 */
export function formatDateOnlyEs(value) {
  if (!value || typeof value !== 'string') return '-';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthIdx = Number(m) - 1;
  const monthName = months[monthIdx] || m;
  return `${Number(d)}-${monthName}-${y}`;
}

/**
 * Formats a TIME string ('HH:MM' or 'HH:MM:SS') as a stable 24h 'HH:MM' string.
 */
export function formatTimeOnly(value) {
  if (!value || typeof value !== 'string') return '-';
  return value.slice(0, 5);
}
