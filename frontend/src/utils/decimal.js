/**
 * Decimal helpers.
 *
 * Every price and weight in this system is 2 decimal places — in the database,
 * on screen, in inputs and on PDFs. These helpers are the single place that
 * rule is expressed, so it stays consistent everywhere.
 */

export const DP = 2;

/**
 * Format a value for display, always with exactly 2 decimals.
 * Returns the `fallback` for null/undefined/blank/non-numeric input, so a
 * missing field never renders as "NaN".
 */
export const format2 = (value, fallback = '0.00') => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(DP) : fallback;
};

/** Money for display: "$1,234.56" */
export const money2 = (value, fallback = '$0.00') => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: DP,
    maximumFractionDigits: DP,
  })}`;
};

/** Carat for display: "12.34 ct" */
export const carat2 = (value, fallback = '0.00 ct') => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(DP)} ct` : fallback;
};

/**
 * Round a number to 2 decimals and return a NUMBER (not a string).
 * Use before sending a value to the API so the client and server agree.
 */
export const round2 = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? parseFloat(n.toFixed(DP)) : 0;
};

/**
 * Restrict what a user can TYPE into a decimal field to 2 decimal places.
 *
 * Applied on every change, so a third decimal simply never appears. Partial
 * input is deliberately preserved — "", "-", "12." and "12.5" all pass through
 * untouched so the field stays usable while typing. Only the digits after the
 * decimal point are truncated.
 */
export const limitDecimals = (value, dp = DP) => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s === '') return '';

  // Anything that isn't a plain decimal number (e.g. "1e5") is left alone —
  // validation elsewhere will reject it rather than us mangling it here.
  const m = s.match(/^(-?\d*)(\.(\d*))?$/);
  if (!m) return s;

  const [, intPart, dot, decimals] = m;
  if (dot === undefined) return s;              // "12"  -> unchanged
  if (decimals === '') return `${intPart}.`;    // "12." -> keep the dot while typing
  return `${intPart}.${decimals.slice(0, dp)}`; // "12.567" -> "12.56"
};

/**
 * Normalise a field's value on blur so it always ends up as "12.00" rather
 * than "12" or "12.". Blank stays blank so required-field validation works.
 */
export const normaliseOnBlur = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(DP) : String(value);
};
