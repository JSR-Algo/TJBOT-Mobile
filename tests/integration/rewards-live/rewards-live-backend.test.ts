import axios from 'axios';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import client from '@/services/http/client';
import { setTokens } from '@/services/http/tokens';
import {
  acknowledgeRewardSeen,
  getRewardHistory,
  getRewardInbox,
} from '@/services/api/rewards.api';
import { getLeaderboard, updateLeaderboardPreference } from '@/services/api/leaderboard.api';
import { updateChildDisplayName } from '@/services/api/households';

const apiUrl = process.env.TBOT_API_URL ?? 'http://127.0.0.1:3100/v1';
const raw = axios.create({ baseURL: apiUrl, validateStatus: () => true });
const postgresContainer = process.env.TBOT_REWARDS_POSTGRES_CONTAINER ?? 'tbot-rewards-e2e-pg';
const backendRoot = process.env.TBOT_BACKEND_WORKTREE
  ?? resolve(__dirname, '../../../../../tbot-backend/mobile-robot-rewards');
const backendPrivateKey = process.env.TBOT_BACKEND_PRIVATE_KEY
  ?? `${backendRoot}/keys/dev-private.pem`;
const canonicalCourseId = 'w01-place-words';
const canonicalLessonId = 'w01-d01-barn-say-it';
const canonicalLessonVersion = 1;

interface Identity {
  token: string;
  email: string;
  parentId: string;
  householdId: string;
  childId: string;
  deviceId: string;
}

interface Fixture extends Identity {
  deviceToken: string;
  foreign: Identity;
  foreignHouseholdToken: string;
  assignmentId: string;
  sessionId: string;
  manifestChecksum: string;
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

function signToken(claims: {
  subject: string;
  householdId: string;
  email?: string;
  deviceId?: string;
  roles: string[];
}): string {
  const script = [
    "const fs=require('fs')",
    "const jwt=require('jsonwebtoken')",
    "const key=fs.readFileSync(process.env.E2E_PRIVATE_KEY,'utf8')",
    "const payload=JSON.parse(process.env.E2E_CLAIMS)",
    "process.stdout.write(jwt.sign(payload,key,{algorithm:'RS256',expiresIn:'15m'}))",
  ].join(';');
  return execFileSync('node', ['-e', script], {
    cwd: backendRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      E2E_CLAIMS: JSON.stringify({
        sub: claims.subject,
        household_id: claims.householdId,
        roles: claims.roles,
        session_id: randomUUID(),
        ...(claims.email ? { email: claims.email } : {}),
        ...(claims.deviceId ? { device_id: claims.deviceId } : {}),
      }),
      E2E_PRIVATE_KEY: backendPrivateKey,
    },
  }).trim();
}

function createIdentity(childName: string, robotName: string): Identity {
  const suffix = `${Date.now()}-${randomUUID()}`;
  const email = `rewards-live-${suffix}@example.test`;
  const parentId = randomUUID();
  const householdId = randomUUID();
  const childId = randomUUID();
  const consentId = randomUUID();
  const deviceId = randomUUID();
  psql(
    `BEGIN;
     INSERT INTO parent_accounts (id, email, password_hash, coppa_verified, active_child_id)
     VALUES (${sqlLiteral(parentId)}, ${sqlLiteral(email)}, 'live-e2e-not-login-capable', TRUE, NULL);
     INSERT INTO households (id, owner_id, name)
     VALUES (${sqlLiteral(householdId)}, ${sqlLiteral(parentId)}, 'Rewards Live Household');
     INSERT INTO household_memberships (parent_id, household_id, role)
     VALUES (${sqlLiteral(parentId)}, ${sqlLiteral(householdId)}, 'owner');
     INSERT INTO child_profiles (id, household_id, display_name, birth_year, age_gate_passed, status)
     VALUES (${sqlLiteral(childId)}, ${sqlLiteral(householdId)}, ${sqlLiteral(childName)}, 2018, TRUE, 'active');
     UPDATE parent_accounts SET active_child_id = ${sqlLiteral(childId)} WHERE id = ${sqlLiteral(parentId)};
     INSERT INTO coppa_consents
       (id, parent_user_id, child_name, birth_date, consent_version, status)
     VALUES (${sqlLiteral(consentId)}, ${sqlLiteral(parentId)}, ${sqlLiteral(childName)},
             '2018-01-01', 'rewards-live-v1', 'active');
     INSERT INTO child_profile_coppa_consents (child_id, consent_id, bound_by_parent_id)
     VALUES (${sqlLiteral(childId)}, ${sqlLiteral(consentId)}, ${sqlLiteral(parentId)});
     INSERT INTO devices
       (id, serial_number, hardware_revision, state, current_household_id, claimed_by,
        lifecycle_state, status, assigned_child_profile_id, display_name)
     VALUES (${sqlLiteral(deviceId)}, ${sqlLiteral(`REWARDS-LIVE-${deviceId}`)}, 'e2e', 'ACTIVE',
             ${sqlLiteral(householdId)}, ${sqlLiteral(parentId)}, 'assigned', 'active',
             ${sqlLiteral(childId)}, ${sqlLiteral(robotName)});
     INSERT INTO parent_controls (device_id, timezone) VALUES (${sqlLiteral(deviceId)}, 'UTC');
     COMMIT;`,
  );
  const token = signToken({ subject: parentId, householdId, email, roles: ['parent'] });
  return { token, email, parentId, householdId, childId, deviceId };
}

async function seedFixture(): Promise<Fixture> {
  const identity = createIdentity('Mai', 'TeeBot Sao');
  const foreign = createIdentity('Kai', 'TeeBot Trang');
  const headers = { Authorization: `Bearer ${identity.token}` };

  const courses = await raw.get('/courses', { headers });
  expect(courses.status).toBe(200);
  expect(courses.data.data).toEqual(expect.arrayContaining([
    expect.objectContaining({ courseId: canonicalCourseId }),
  ]));
  const lessons = await raw.get(`/courses/${canonicalCourseId}/lessons`, {
    headers,
    params: { childId: identity.childId },
  });
  expect(lessons.status).toBe(200);
  expect(lessons.data.data).toEqual(expect.arrayContaining([
    expect.objectContaining({
      lessonId: canonicalLessonId,
      lessonVersion: canonicalLessonVersion,
      manifestReady: true,
      profile: 'espTft',
    }),
  ]));

  const enrollment = await raw.post(`/courses/${canonicalCourseId}/enroll`, {
    childId: identity.childId,
    deviceId: identity.deviceId,
  }, { headers });
  expect(enrollment.status).toBe(201);
  expect(enrollment.data.data.enrollment).toMatchObject({
    childId: identity.childId,
    deviceId: identity.deviceId,
    status: 'active',
    currentLessonKey: canonicalLessonId,
  });
  expect(enrollment.data.data.assignment).toMatchObject({
    deviceId: identity.deviceId,
    childId: identity.childId,
    lessonId: canonicalLessonId,
    lessonVersion: canonicalLessonVersion,
  });

  const manifestChecksum = psql(
    `SELECT manifest_checksum FROM lessons
      WHERE lesson_key = ${sqlLiteral(canonicalLessonId)}
        AND lesson_version = ${canonicalLessonVersion};`,
  );
  return {
    ...identity,
    foreign,
    foreignHouseholdToken: signToken({
      subject: foreign.parentId,
      householdId: identity.householdId,
      email: foreign.email,
      roles: ['parent'],
    }),
    deviceToken: signToken({
      subject: `device:${identity.deviceId}`,
      householdId: identity.householdId,
      deviceId: identity.deviceId,
      roles: ['device'],
    }),
    assignmentId: enrollment.data.data.assignment.assignmentId,
    sessionId: randomUUID(),
    manifestChecksum,
  };
}

const describeLive = process.env.TBOT_REWARDS_LIVE === '1' ? describe : describe.skip;

describeLive('mobile rewards against the real backend and PostgreSQL', () => {
  let fixture: Fixture;

  beforeAll(async () => {
    const health = await raw.get('/health');
    expect(health.status).toBe(200);
    fixture = await seedFixture();
    client.defaults.baseURL = apiUrl;
    await setTokens(fixture.token, 'unused-live-refresh-token');
  }, 30_000);

  it('collapses device completion replays into one immutable reward on every mobile surface', async () => {
    const headers = { Authorization: `Bearer ${fixture.deviceToken}` };
    const started = await raw.post(`/devices/${fixture.deviceId}/lesson-events`, {
      assignmentId: fixture.assignmentId,
      sessionId: fixture.sessionId,
      events: [
        { type: 'lesson_started', startedAt: Date.now() - 60_000 },
        { type: 'step_completed', sequence: 1, stepId: 's1', outcome: 'success', occurredAt: Date.now() - 30_000 },
        { type: 'step_completed', sequence: 2, stepId: 's2', outcome: 'miss', occurredAt: Date.now() - 20_000 },
        { type: 'step_completed', sequence: 3, stepId: 's3', outcome: 'timeout', occurredAt: Date.now() - 10_000 },
      ],
    }, { headers });
    expect(started.status).toBe(200);
    expect(started.data.data).toMatchObject({ accepted: 4, duplicates: 0, lastSequence: 3 });

    const completion = {
      assignmentId: fixture.assignmentId,
      sessionId: fixture.sessionId,
      events: [{ type: 'lesson_completed', completedAt: Date.now() }],
    };
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => raw.post(`/devices/${fixture.deviceId}/lesson-events`, completion, { headers })),
    );
    expect(responses.every((response) => response.status === 200)).toBe(true);

    const inbox = await getRewardInbox();
    const history = await getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId });
    expect(inbox.count).toBe(1);
    expect(history.history).toHaveLength(1);
    expect(history.history[0]).toEqual(inbox.rewards[0]);
    expect(history.totals).toMatchObject({ rewardCount: 1, xp: 109, coins: 10, refreshing: false });
    expect(psql(
      `SELECT COUNT(*) FROM lesson_reward_ledger
        WHERE assignment_id = ${sqlLiteral(fixture.assignmentId)}
          AND session_id = ${sqlLiteral(fixture.sessionId)};`,
    )).toBe('1');

    const rewardId = inbox.rewards[0]?.rewardId ?? '';
    await acknowledgeRewardSeen(rewardId);
    await acknowledgeRewardSeen(rewardId);
    await expect(getRewardInbox()).resolves.toMatchObject({ count: 0, rewards: [] });
    const seenHistory = await getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId });
    expect(seenHistory.history[0]?.rewardId).toBe(rewardId);

    const foreignHeaders = { Authorization: `Bearer ${fixture.foreign.token}` };
    const mismatchedHeaders = { Authorization: `Bearer ${fixture.foreignHouseholdToken}` };
    const foreignResults = await Promise.all([
      raw.get('/mobile/rewards', { headers: foreignHeaders, params: { childId: fixture.childId } }),
      raw.get('/mobile/rewards/inbox', { headers: mismatchedHeaders }),
      raw.post(`/mobile/rewards/${rewardId}/seen`, undefined, { headers: foreignHeaders }),
      raw.put(`/mobile/devices/${fixture.deviceId}/leaderboard-preference`, { optedIn: true }, { headers: foreignHeaders }),
      raw.patch(`/mobile/children/${fixture.childId}`, { displayName: 'Khong Duoc Doi' }, { headers: foreignHeaders }),
    ]);
    expect(foreignResults.map((response) => response.status)).toEqual([403, 403, 403, 403, 403]);
  });

  it('uses private names, masked owner email, rename and opt-out without mutating the lesson', async () => {
    await expect(updateLeaderboardPreference(fixture.deviceId, true)).resolves.toMatchObject({ optedIn: true });

    const weekly = await getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 });
    const allTime = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    const owned = [...weekly.ownedRows, ...allTime.ownedRows].find((row) => row.robotId === fixture.deviceId);
    expect(owned).toMatchObject({ childName: 'Mai', robotName: 'TeeBot Sao', optedIn: true });
    expect(owned?.parentEmailMasked).toBe(fixture.email.replace(/^(.{2})[^@]*/, '$1***'));
    expect(JSON.stringify({ weekly, allTime })).not.toContain(fixture.email);

    await setTokens(fixture.foreign.token, 'unused-live-refresh-token');
    const publicView = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    expect(publicView.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        robotId: fixture.deviceId,
        childName: 'Mai',
        robotName: 'TeeBot Sao',
        parentEmailMasked: fixture.email.replace(/^(.{2})[^@]*/, '$1***'),
      }),
    ]));
    expect(JSON.stringify(publicView)).not.toContain(fixture.email);

    await setTokens(fixture.token, 'unused-live-refresh-token');
    await expect(updateChildDisplayName(fixture.childId, 'An')).resolves.toMatchObject({ displayName: 'An' });
    const renamed = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    expect(renamed.ownedRows.find((row) => row.robotId === fixture.deviceId)?.childName).toBe('An');

    const historyBefore = await getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId });
    await expect(updateLeaderboardPreference(fixture.deviceId, false)).resolves.toMatchObject({ optedIn: false });
    const hidden = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    expect(hidden.rows.some((row) => row.robotId === fixture.deviceId)).toBe(false);
    expect(hidden.ownedRows.find((row) => row.robotId === fixture.deviceId)).toMatchObject({
      optedIn: false,
      visibility: 'private',
    });
    await expect(getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId })).resolves.toEqual(historyBefore);
    expect(psql(
      `SELECT manifest_checksum FROM lessons
        WHERE lesson_key = ${sqlLiteral(canonicalLessonId)}
          AND lesson_version = ${canonicalLessonVersion};`,
    )).toBe(fixture.manifestChecksum);
  });
});
