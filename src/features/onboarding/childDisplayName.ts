export const CHILD_DISPLAY_NAME_MAX_LENGTH = 64;

function compactWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeChildDisplayName(value: string, fallback: string): string {
  const normalized = compactWhitespace(value) || compactWhitespace(fallback);
  return normalized.slice(0, CHILD_DISPLAY_NAME_MAX_LENGTH);
}
