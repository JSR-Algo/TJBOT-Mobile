import axios from 'axios';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import client from '@/services/http/client';
import { setTokens } from '@/services/http/tokens';
import {
  acknowledgeRewardSeen,
  getLeaderboard,
  getLeaderboardPreference,
  getRewardHistory,
  getRewardInbox,
  getRewardTotals,
  updateLeaderboardPreference,
} from '@/services/api/rewards.api';

const apiUrl = process.env.TBOT_API_URL ?? 'http://127.0.0.1:3100/v1';
const raw = axios.create({ baseURL: apiUrl, validateStatus: () => true });
const postgresContainer = process.env.TBOT_REWARDS_POSTGRES_CONTAINER ?? 'tbot-rewards-e2e-pg';
const backendRoot = process.env.TBOT_BACKEND_WORKTREE
  ?? '/Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/production-lesson-studio';
const backendPrivateKey = process.env.TBOT_BACKEND_PRIVATE_KEY
  ?? '/Users/manhhodinh/Documents/TBOT/tbot-backend/keys/dev-private.pem';

interface Fixture {
  token: string;
  email: string;
  parentId: string;
  householdId: string;
  childId: string;
  deviceId: string;
  assignmentId: string;
  sessionId: string;
  lessonId: string;
  lessonVersion: number;
}

function value(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

function requiredText(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  throw new Error(`Missing required field: ${keys.join(' or ')}`);
}

function sqlLiteral(input: string): string {
  return `'${input.replaceAll("'", "''")}'`;
}

function psql(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', postgresContainer, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'tbot', '-d', 'tbot', '-Atq'],
    { input: sql, encoding: 'utf8' },
  ).trim();
}

function signParentToken(parentId: string, householdId: string, email: string): string {
  const script = [
    "const fs=require('fs')",
    "const jwt=require('jsonwebtoken')",
    "const key=fs.readFileSync(process.env.E2E_PRIVATE_KEY,'utf8')",
    "process.stdout.write(jwt.sign({sub:process.env.E2E_PARENT_ID,household_id:process.env.E2E_HOUSEHOLD_ID,roles:['parent'],email:process.env.E2E_EMAIL,session_id:process.env.E2E_SESSION_ID},key,{algorithm:'RS256',expiresIn:'15m'}))",
  ].join(';');
  return execFileSync('node', ['-e', script], {
    cwd: backendRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      E2E_PARENT_ID: parentId,
      E2E_HOUSEHOLD_ID: householdId,
      E2E_EMAIL: email,
      E2E_SESSION_ID: randomUUID(),
      E2E_PRIVATE_KEY: backendPrivateKey,
    },
  }).trim();
}

function createIdentity(): Pick<Fixture, 'token' | 'email' | 'parentId' | 'householdId' | 'childId'> {
  const suffix = `${Date.now()}-${randomUUID()}`;
  const email = `rewards-live-${suffix}@example.test`;
  const parentId = randomUUID();
  const householdId = randomUUID();
  const childId = randomUUID();
  psql(
    `BEGIN;
     INSERT INTO parent_accounts (id, email, password_hash, coppa_verified)
     VALUES (${sqlLiteral(parentId)}, ${sqlLiteral(email)}, 'live-e2e-not-login-capable', TRUE);
     INSERT INTO households (id, owner_id, name)
     VALUES (${sqlLiteral(householdId)}, ${sqlLiteral(parentId)}, 'Rewards Live Family');
     INSERT INTO household_memberships (parent_id, household_id, role)
     VALUES (${sqlLiteral(parentId)}, ${sqlLiteral(householdId)}, 'owner');
     INSERT INTO child_profiles (id, household_id, display_name, birth_year, age_gate_passed)
     VALUES (${sqlLiteral(childId)}, ${sqlLiteral(householdId)}, 'Mai', 2018, TRUE);
     COMMIT;`,
  );
  const token = signParentToken(parentId, householdId, email);
  return { token, email, parentId, householdId, childId };
}

async function seedFixture(): Promise<Fixture> {
  const identity = createIdentity();
  const deviceId = randomUUID();
  const assignmentId = randomUUID();
  const sessionId = randomUUID();
  const courseId = randomUUID();
  const lessonId = randomUUID();
  const lessonVersion = 1;
  const fixtureKey = randomUUID();

  psql(
    `BEGIN;
     INSERT INTO courses
       (id, course_key, title, locale, age_band, status, created_by)
     VALUES (${sqlLiteral(courseId)}, ${sqlLiteral(`rewards-live-${fixtureKey}`)},
             'Rewards Live Course', 'en-US', '5-9', 'published', ${sqlLiteral(identity.parentId)})
     ON CONFLICT (course_key) DO NOTHING;
     INSERT INTO lessons
       (id, course_id, lesson_key, lesson_version, manifest_version, title, locale, age_band,
        manifest_checksum, status, published_at, created_by)
     VALUES (${sqlLiteral(lessonId)}, ${sqlLiteral(courseId)}, ${sqlLiteral(`rewards-live-lesson-${fixtureKey}`)},
             ${lessonVersion}, 'teebot-lesson-renderer.v1', 'Rewards Live Lesson', 'en-US', '5-9',
             ${sqlLiteral(`sha256:${fixtureKey.replaceAll('-', '').padEnd(64, '0').slice(0, 64)}`)},
             'published', NOW(), ${sqlLiteral(identity.parentId)})
     ON CONFLICT (lesson_key, lesson_version) DO NOTHING;
     INSERT INTO devices
       (id, serial_number, hardware_revision, state, current_household_id,
        lifecycle_state, status, assigned_child_profile_id, display_name)
     VALUES (${sqlLiteral(deviceId)}, ${sqlLiteral(`REWARDS-LIVE-${deviceId}`)}, 'e2e', 'ACTIVE',
             ${sqlLiteral(identity.householdId)}, 'assigned', 'active', ${sqlLiteral(identity.childId)}, 'TeeBot Sao');
     INSERT INTO parent_controls (device_id, timezone)
     VALUES (${sqlLiteral(deviceId)}, 'UTC')
     ON CONFLICT (device_id) DO UPDATE SET timezone = EXCLUDED.timezone;
     INSERT INTO lesson_assignments
       (id, device_id, child_id, household_id, lesson_id, lesson_version, profile, state)
     VALUES (${sqlLiteral(assignmentId)}, ${sqlLiteral(deviceId)}, ${sqlLiteral(identity.childId)},
             ${sqlLiteral(identity.householdId)}, ${sqlLiteral(lessonId)}, ${lessonVersion}, 'espTft', 'ASSIGNED');
     COMMIT;`,
  );

  return {
    ...identity,
    deviceId,
    assignmentId,
    sessionId,
    lessonId,
    lessonVersion,
  };
}

describe('mobile rewards against the real backend and PostgreSQL', () => {
  let fixture: Fixture;

  beforeAll(async () => {
    const health = await raw.get('/health');
    expect(health.status).toBe(200);
    fixture = await seedFixture();
    client.defaults.baseURL = apiUrl;
    await setTokens(fixture.token, 'unused-live-refresh-token');
  }, 30_000);

  it('collapses concurrent completion replays into one immutable reward on every mobile surface', async () => {
    const headers = { Authorization: `Bearer ${fixture.token}` };
    const body = {
      assignmentId: fixture.assignmentId,
      sessionId: fixture.sessionId,
      lessonId: fixture.lessonId,
      lessonVersion: fixture.lessonVersion,
      events: [
        { type: 'lesson_started', startedAt: Date.now() - 1_000 },
        { type: 'lesson_completed', completedAt: Date.now() },
      ],
    };
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => raw.post(`/devices/${fixture.deviceId}/lesson-events`, body, { headers })),
    );
    expect(responses.every((response) => response.status === 200)).toBe(true);

    const inbox = await getRewardInbox({
      childId: fixture.childId,
      deviceId: fixture.deviceId,
      assignmentId: fixture.assignmentId,
    });
    const history = await getRewardHistory({ childId: fixture.childId, limit: 20 });
    const totals = await getRewardTotals(fixture.childId);
    expect(inbox).toHaveLength(1);
    expect(history.items.filter((reward) => reward.assignmentId === fixture.assignmentId)).toHaveLength(1);
    expect(history.items[0]).toEqual(inbox[0]);
    expect(totals.lessonCompletions).toBe(1);
    expect(totals.totalXp).toBe(inbox[0]?.xp);
    expect(totals.totalCoins).toBe(inbox[0]?.coins);

    const rewardId = requiredText(value(inbox[0]), 'id');
    await acknowledgeRewardSeen(rewardId);
    await acknowledgeRewardSeen(rewardId);
    await expect(getRewardInbox({
      childId: fixture.childId,
      deviceId: fixture.deviceId,
      assignmentId: fixture.assignmentId,
    })).resolves.toEqual([]);
    const seenHistory = await getRewardHistory({ childId: fixture.childId, limit: 20 });
    expect(seenHistory.items[0]?.id).toBe(rewardId);
    expect(seenHistory.items[0]?.seenAt).not.toBeNull();
  });

  it('uses child name, robot name, masked owner email and preserves private rewards after opt-out', async () => {
    await expect(getLeaderboardPreference(fixture.deviceId)).resolves.toMatchObject({ optedIn: false });
    await expect(updateLeaderboardPreference(fixture.deviceId, true)).resolves.toMatchObject({ optedIn: true });

    const weekly = await getLeaderboard({ period: 'weekly', deviceId: fixture.deviceId, limit: 20 });
    const allTime = await getLeaderboard({ period: 'allTime', deviceId: fixture.deviceId, limit: 20 });
    const owned = [...weekly.items, weekly.ownedRow, ...allTime.items, allTime.ownedRow]
      .find((row) => row?.deviceId === fixture.deviceId);
    expect(owned).toMatchObject({ childName: 'Mai', robotName: 'TeeBot Sao', owned: true });
    expect(owned?.maskedParentEmail).toBe(fixture.email.replace(/^(.{2})[^@]*/, '$1***'));
    expect(JSON.stringify({ weekly, allTime })).not.toContain(fixture.email);

    const rename = await raw.patch(`/mobile/children/${fixture.childId}`, { display_name: 'An' }, {
      headers: { Authorization: `Bearer ${fixture.token}` },
    });
    expect(rename.status).toBe(200);
    const renamed = await getLeaderboard({ period: 'allTime', deviceId: fixture.deviceId, limit: 20 });
    const renamedOwned = [...renamed.items, renamed.ownedRow].find((row) => row?.deviceId === fixture.deviceId);
    expect(renamedOwned?.childName).toBe('An');

    const totalsBefore = await getRewardTotals(fixture.childId);
    const historyBefore = await getRewardHistory({ childId: fixture.childId, limit: 20 });
    await expect(updateLeaderboardPreference(fixture.deviceId, false)).resolves.toMatchObject({ optedIn: false });
    const hidden = await getLeaderboard({ period: 'allTime', deviceId: fixture.deviceId, limit: 20 });
    expect(hidden.items.some((row) => row.deviceId === fixture.deviceId)).toBe(false);
    expect(hidden.ownedRow).toBeNull();
    await expect(getRewardTotals(fixture.childId)).resolves.toEqual(totalsBefore);
    await expect(getRewardHistory({ childId: fixture.childId, limit: 20 })).resolves.toEqual(historyBefore);
  });
});
