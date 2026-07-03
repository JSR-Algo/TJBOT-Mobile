// Coerce an untrusted wire value to a finite number, falling back to `fallback`
// (default 0) for null/undefined/non-numeric input. Unlike a bare `Number(x ?? 0)`,
// this also rejects `NaN`/`Infinity` — a backend field like "n/a" or "" would
// otherwise surface as "NaN%" / "NaN of NaN steps" in the UI.
export function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Same as toFiniteNumber but clamps negatives to the fallback — for counts and
// percentages that can never be below zero.
export function toNonNegativeNumber(value: unknown, fallback = 0): number {
  const n = toFiniteNumber(value, fallback);
  return n >= 0 ? n : fallback;
}
