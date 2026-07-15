export const PUBLIC_LEADERBOARD_KEYS = [
  'badges',
  'childName',
  'completedLessonCount',
  'currentStreakDays',
  'parentEmailMasked',
  'rank',
  'rankStatus',
  'robotId',
  'robotName',
  'xp',
] as const;

export const OWNED_LEADERBOARD_KEYS = [
  ...PUBLIC_LEADERBOARD_KEYS,
  'optedIn',
  'visibility',
] as const;

const forbiddenKeys = new Set([
  'assignmentId',
  'coins',
  'email',
  'householdId',
  'parentEmail',
  'parentId',
  'rewardId',
  'sessionId',
]);

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected leaderboard object at ${path}`);
  }
  return value as Record<string, unknown>;
}

function arrayAt(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Expected leaderboard array at ${path}`);
  return value;
}

function assertExactKeys(value: unknown, allowed: readonly string[], path: string): void {
  const keys = Object.keys(objectAt(value, path)).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error(`Unexpected leaderboard keys at ${path}: ${keys.join(',')}`);
  }
}

function inspect(value: unknown, path: string, rawEmails: readonly string[]): void {
  if (typeof value === 'string') {
    const leaked = rawEmails.find((email) => email.length > 0 && value.includes(email));
    if (leaked) throw new Error(`Raw leaderboard email leaked at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${path}[${index}]`, rawEmails));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}.${key}`;
    if (forbiddenKeys.has(key)) throw new Error(`Forbidden leaderboard key at ${itemPath}`);
    inspect(item, itemPath, rawEmails);
  }
}

export function assertRawLeaderboardPrivacy(envelope: unknown, rawEmails: readonly string[]): void {
  const response = objectAt(envelope, 'response');
  const data = objectAt(response.data, 'response.data');
  const rows = arrayAt(data.rows, 'response.data.rows');
  const ownedRows = arrayAt(data.ownedRows, 'response.data.ownedRows');
  rows.forEach((row, index) => assertExactKeys(
    row,
    PUBLIC_LEADERBOARD_KEYS,
    `response.data.rows[${index}]`,
  ));
  ownedRows.forEach((row, index) => assertExactKeys(
    row,
    OWNED_LEADERBOARD_KEYS,
    `response.data.ownedRows[${index}]`,
  ));
  inspect(envelope, 'response', rawEmails);
}
