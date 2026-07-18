import React from 'react';
import axios from 'axios';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { dirname, join, parse, resolve } from 'path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import client from '@/services/http/client';
import { setTokens } from '@/services/http/tokens';
import CelebrationScreen from '@/features/progress/screens/CelebrationScreen';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import ParentRewardsScreen from '@/features/rewards/screens/ParentRewardsView';
import LeaderboardScreen from '@/features/rewards/screens/LeaderboardView';
import { setRewardQueueScope } from '@/features/rewards/offline/rewardSeenQueue';
import {
  acknowledgeRewardSeen,
  getRewardHistory,
  getRewardInbox,
} from '@/services/api/rewards.api';
import { getLeaderboard, updateLeaderboardPreference } from '@/services/api/leaderboard.api';
import { updateChildDisplayName } from '@/services/api/households';
import {
  assertRawLeaderboardPrivacy,
  OWNED_LEADERBOARD_KEYS,
  PUBLIC_LEADERBOARD_KEYS,
} from './rewards-live-privacy';

let mockHouseholdContext = {
  activeHousehold: undefined as { id: string } | undefined,
  activeChild: undefined as { id: string; name: string } | undefined,
  children: [] as { id: string; name: string }[],
};

jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: () => mockHouseholdContext,
}));

jest.mock('@/design-system/animations/useReduceMotion', () => ({
  useReduceMotion: () => true,
}));

const apiUrl = process.env.TBOT_API_URL ?? 'http://127.0.0.1:3100/v1';
const raw = axios.create({ baseURL: apiUrl, validateStatus: () => true });
const postgresContainer = process.env.TBOT_REWARDS_POSTGRES_CONTAINER ?? 'tbot-rewards-e2e-pg';

function findBackendRoot(start: string): string {
  let current = start;
  while (true) {
    const candidate = join(current, 'tbot-backend');
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    const parent = dirname(current);
    if (parent === current || current === parse(current).root) break;
    current = parent;
  }
  throw new Error(`Unable to locate sibling tbot-backend from ${start}`);
}

const backendRoot = process.env.TBOT_BACKEND_WORKTREE
  ?? findBackendRoot(resolve(__dirname, '../../..'));
const backendPrivateKey = process.env.TBOT_BACKEND_PRIVATE_KEY
  ?? `${backendRoot}/keys/dev-private.pem`;
const backendPrivateKeyPem = process.env.TBOT_BACKEND_PRIVATE_KEY_PEM;
const canonicalCourseId = 'w01-place-words';
const canonicalLessonId = 'w01-d01-barn-say-it';
const canonicalLessonVersion = 1;
const expectedBadges = ['first-lesson', 'lessons-1'];
const expectedPolicyVersion = 'lesson-rewards.v1';
const forbiddenLeaderboardKeys = new Set([
  'assignmentId',
  'coins',
  'email',
  'householdId',
  'parentEmail',
  'parentId',
  'rewardId',
  'sessionId',
]);

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

function renderLive(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const rendered = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  const unmount = rendered.unmount;
  return {
    ...rendered,
    queryClient,
    unmount: () => {
      unmount();
      queryClient.clear();
    },
  };
}

const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

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

function expectExactKeys(value: object, keys: readonly string[]): void {
  expect(Object.keys(value).sort()).toEqual([...keys].sort());
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      collectKeys(item, keys);
    }
  }
  return keys;
}

function expectLeaderboardPrivacy(
  page: Awaited<ReturnType<typeof getLeaderboard>>,
  rawEmails: string[],
): void {
  expectExactKeys(page, ['period', 'rows', 'ownedRows', 'pagination']);
  expectExactKeys(page.pagination, ['page', 'pageSize', 'totalRows', 'totalPages']);
  for (const row of page.rows) expectExactKeys(row, PUBLIC_LEADERBOARD_KEYS);
  for (const row of page.ownedRows) expectExactKeys(row, OWNED_LEADERBOARD_KEYS);
  const keys = collectKeys(page);
  for (const forbidden of forbiddenLeaderboardKeys) expect(keys).not.toContain(forbidden);
  const serialized = JSON.stringify(page);
  for (const email of rawEmails) expect(serialized).not.toContain(email);
}

async function getRawLeaderboard(
  token: string,
  period: 'weekly' | 'allTime',
  rawEmails: readonly string[],
): Promise<unknown> {
  const response = await raw.get('/mobile/leaderboard', {
    headers: { Authorization: `Bearer ${token}` },
    params: { period, page: 1, pageSize: 20 },
  });
  expect(response.status).toBe(200);
  assertRawLeaderboardPrivacy(response.data, rawEmails);
  return response.data;
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
    "const key=process.env.E2E_PRIVATE_KEY_PEM||fs.readFileSync(process.env.E2E_PRIVATE_KEY,'utf8')",
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
      E2E_PRIVATE_KEY_PEM: backendPrivateKeyPem,
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
    setRewardQueueScope(fixture.parentId, fixture.householdId);
    mockHouseholdContext = {
      activeHousehold: { id: fixture.householdId },
      activeChild: { id: fixture.childId, name: 'Mai' },
      children: [{ id: fixture.childId, name: 'Mai' }],
    };
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
    const completionData = responses.map((response) => response.data.data);
    const rewardIds = completionData.map((data) => data.rewardId);
    expect(rewardIds.every((rewardId) => typeof rewardId === 'string' && rewardId.length > 0)).toBe(true);
    expect(new Set(rewardIds).size).toBe(1);
    const rewardId = rewardIds[0] as string;
    for (const data of completionData) {
      expect(data).toEqual({
        accepted: expect.any(Number),
        duplicates: expect.any(Number),
        lastSequence: null,
        rewardId,
        reward: {
          xpAwarded: 109,
          coinsAwarded: 10,
          badges: expectedBadges,
          policyVersion: expectedPolicyVersion,
        },
      });
    }
    expect(completionData
      .map((data) => [data.accepted, data.duplicates])
      .sort(([acceptedA], [acceptedB]) => acceptedB - acceptedA))
      .toEqual([[1, 0], [0, 1], [0, 1], [0, 1], [0, 1]]);

    const inbox = await getRewardInbox();
    const history = await getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId });
    const receipt = inbox.rewards[0];
    expect(receipt).toEqual({
      rewardId,
      assignmentId: fixture.assignmentId,
      sessionId: fixture.sessionId,
      child: { id: fixture.childId, displayName: 'Mai' },
      robot: { id: fixture.deviceId, displayName: 'TeeBot Sao' },
      xp: 109,
      coins: 10,
      badges: expectedBadges,
      reason: {
        policyVersion: expectedPolicyVersion,
        completionBaseXp: 100,
        coins: 10,
        outcomeXp: { success: 5, miss: 2, timeout: 2 },
        outcomeClasses: { success: 1, miss: 1, timeout: 1 },
      },
      policyVersion: expectedPolicyVersion,
      streak: { currentDays: 1, bestDays: 1 },
      awardedAt: expect.any(String),
    });
    expect(Number.isFinite(Date.parse(receipt.awardedAt))).toBe(true);
    expect(inbox).toEqual({ count: 1, rewards: [receipt] });
    expect(history).toEqual({
      totals: { rewardCount: 1, xp: 109, coins: 10, refreshing: false },
      history: [receipt],
    });

    const summary = renderLive(
      <LessonSummaryScreen
        navigation={navigation as never}
        route={{
          key: 'live-summary',
          name: 'LessonSummaryScreen',
          params: {
            childId: fixture.childId,
            deviceId: fixture.deviceId,
            assignmentId: fixture.assignmentId,
            sessionId: fixture.sessionId,
          },
        } as never}
      />,
    );
    expect(await summary.findByText('Mai · TeeBot Sao')).toBeTruthy();
    expect(summary.getByTestId(`reward-${rewardId}`)).toBeTruthy();
    expect(summary.getByText('109 XP · 10 coins')).toBeTruthy();
    summary.unmount();

    const celebration = renderLive(
      <CelebrationScreen
        navigation={navigation as never}
        route={{
          key: 'live-celebration',
          name: 'CelebrationScreen',
          params: {
            rewardId,
            childId: fixture.childId,
            deviceId: fixture.deviceId,
            assignmentId: fixture.assignmentId,
            sessionId: fixture.sessionId,
          },
        } as never}
      />,
    );
    expect(await celebration.findByText('You did it!')).toBeTruthy();
    expect(celebration.getByText('Mai · TeeBot Sao')).toBeTruthy();
    expect(celebration.getByText('XP: 109 · Coins: 10')).toBeTruthy();
    for (const badge of expectedBadges) expect(celebration.getByText(badge)).toBeTruthy();
    await waitFor(async () => expect(await getRewardInbox()).toEqual({ count: 0, rewards: [] }));
    await waitFor(() => {
      expect(celebration.queryClient.isMutating()).toBe(0);
      expect(celebration.queryClient.isFetching()).toBe(0);
    });
    celebration.unmount();

    const seenAt = psql(
      `SELECT seen_at FROM parent_reward_receipts
        WHERE reward_id = ${sqlLiteral(rewardId)}
          AND parent_id = ${sqlLiteral(fixture.parentId)};`,
    );
    expect(Number.isFinite(Date.parse(seenAt))).toBe(true);

    const celebrationReplay = renderLive(
      <CelebrationScreen
        navigation={navigation as never}
        route={{ key: 'live-celebration-replay', name: 'CelebrationScreen', params: { rewardId } } as never}
      />,
    );
    expect(await celebrationReplay.findByText('Reward is waiting to sync')).toBeTruthy();
    await waitFor(() => expect(celebrationReplay.queryClient.isFetching()).toBe(0));
    celebrationReplay.unmount();
    expect(psql(
      `SELECT seen_at FROM parent_reward_receipts
        WHERE reward_id = ${sqlLiteral(rewardId)}
          AND parent_id = ${sqlLiteral(fixture.parentId)};`,
    )).toBe(seenAt);

    const parent = renderLive(
      <ParentRewardsScreen
        navigation={navigation as never}
        route={{ key: 'live-parent-rewards', name: 'ParentRewardsScreen' } as never}
      />,
    );
    expect(await parent.findByText('Mai · TeeBot Sao')).toBeTruthy();
    expect(parent.getByTestId(`reward-${rewardId}`)).toBeTruthy();
    expect(parent.getByText('109 XP')).toBeTruthy();
    expect(parent.getByText('XP: 109 · Coins: 10')).toBeTruthy();
    parent.unmount();
    expect(JSON.parse(psql(
      `SELECT json_build_object(
        'ledger', (SELECT COUNT(*)::int FROM lesson_reward_ledger
          WHERE id = ${sqlLiteral(rewardId)}
            AND assignment_id = ${sqlLiteral(fixture.assignmentId)}
            AND session_id = ${sqlLiteral(fixture.sessionId)}),
        'lifecycle', (SELECT COUNT(*)::int FROM progress_events
          WHERE assignment_id = ${sqlLiteral(fixture.assignmentId)}
            AND session_id = ${sqlLiteral(fixture.sessionId)}
            AND event_type = 'lesson_completed'),
        'allTime', (SELECT COUNT(*)::int FROM robot_reward_totals
          WHERE device_id = ${sqlLiteral(fixture.deviceId)}
            AND household_id = ${sqlLiteral(fixture.householdId)}
            AND child_id = ${sqlLiteral(fixture.childId)}),
        'weekly', (SELECT COUNT(*)::int FROM robot_reward_weekly_totals
          WHERE device_id = ${sqlLiteral(fixture.deviceId)}
            AND household_id = ${sqlLiteral(fixture.householdId)}
            AND child_id = ${sqlLiteral(fixture.childId)}),
        'streak', (SELECT COUNT(*)::int FROM child_reward_streaks
          WHERE child_id = ${sqlLiteral(fixture.childId)}
            AND household_id = ${sqlLiteral(fixture.householdId)}),
        'recipientReceipt', (SELECT COUNT(*)::int FROM parent_reward_receipts
          WHERE reward_id = ${sqlLiteral(rewardId)}
            AND parent_id = ${sqlLiteral(fixture.parentId)})
      );`,
    ))).toEqual({ ledger: 1, lifecycle: 1, allTime: 1, weekly: 1, streak: 1, recipientReceipt: 1 });

    const replayedSeen = await acknowledgeRewardSeen(rewardId);
    expect(replayedSeen).toEqual({ rewardId, seen: true, seenAt: new Date(seenAt).toISOString() });
    await expect(getRewardInbox()).resolves.toMatchObject({ count: 0, rewards: [] });
    const seenHistory = await getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId });
    expect(seenHistory).toEqual(history);

    const foreignHeaders = { Authorization: `Bearer ${fixture.foreign.token}` };
    const mismatchedHeaders = { Authorization: `Bearer ${fixture.foreignHouseholdToken}` };
    const foreignResults = await Promise.all([
      raw.get('/mobile/rewards', { headers: foreignHeaders, params: { childId: fixture.childId } }),
      raw.get('/mobile/rewards/inbox', { headers: mismatchedHeaders }),
      raw.post(`/mobile/rewards/${rewardId}/seen`, undefined, { headers: foreignHeaders }),
      raw.put(`/mobile/devices/${fixture.deviceId}/leaderboard-preference`, { optedIn: true }, { headers: foreignHeaders }),
      raw.patch(`/mobile/children/${fixture.childId}`, { displayName: 'Khong Duoc Doi' }, { headers: foreignHeaders }),
    ]);
    expect(foreignResults.map((response) => response.status)).toEqual([403, 200, 403, 403, 403]);
    expect(foreignResults[1]?.data).toEqual({ data: [], meta: { count: 0 } });
  });

  it('uses private names, masked owner email, rename and opt-out without mutating the lesson', async () => {
    await expect(updateLeaderboardPreference(fixture.deviceId, true)).resolves.toMatchObject({ optedIn: true });

    const weekly = await getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 });
    const allTime = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    await Promise.all([
      getRawLeaderboard(fixture.token, 'weekly', [fixture.email, fixture.foreign.email]),
      getRawLeaderboard(fixture.token, 'allTime', [fixture.email, fixture.foreign.email]),
    ]);
    const maskedEmail = fixture.email.replace(/^(.{2})[^@]*/, '$1***');
    const primaryPublicRow = {
      rank: 1,
      rankStatus: 'current' as const,
      robotId: fixture.deviceId,
      childName: 'Mai',
      robotName: 'TeeBot Sao',
      parentEmailMasked: maskedEmail,
      xp: 109,
      completedLessonCount: 1,
      currentStreakDays: 1,
      badges: expectedBadges,
    };
    for (const [period, page] of [['weekly', weekly], ['allTime', allTime]] as const) {
      expect(page).toEqual({
        period,
        rows: [primaryPublicRow],
        ownedRows: [{ ...primaryPublicRow, optedIn: true, visibility: 'public' }],
        pagination: { page: 1, pageSize: 20, totalRows: 1, totalPages: 1 },
      });
      expectLeaderboardPrivacy(page, [fixture.email, fixture.foreign.email]);
    }

    const leaderboard = renderLive(
      <LeaderboardScreen
        navigation={navigation as never}
        route={{ key: 'live-leaderboard', name: 'LeaderboardScreen' } as never}
      />,
    );
    expect(await leaderboard.findByText('Mai · TeeBot Sao')).toBeTruthy();
    expect(leaderboard.getByText(maskedEmail)).toBeTruthy();
    await waitFor(() => expect(JSON.stringify(leaderboard.toJSON())).not.toContain(fixture.email));
    leaderboard.unmount();

    await setTokens(fixture.foreign.token, 'unused-live-refresh-token');
    const foreignWeekly = await getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 });
    const foreignAllTime = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    await Promise.all([
      getRawLeaderboard(fixture.foreign.token, 'weekly', [fixture.email, fixture.foreign.email]),
      getRawLeaderboard(fixture.foreign.token, 'allTime', [fixture.email, fixture.foreign.email]),
    ]);
    const foreignPrivateRow = {
      rank: null,
      rankStatus: 'private' as const,
      robotId: fixture.foreign.deviceId,
      childName: 'Kai',
      robotName: 'TeeBot Trang',
      parentEmailMasked: '[hidden]',
      xp: 0,
      completedLessonCount: 0,
      currentStreakDays: null,
      badges: [],
      optedIn: false,
      visibility: 'private' as const,
    };
    for (const [period, page] of [['weekly', foreignWeekly], ['allTime', foreignAllTime]] as const) {
      expect(page).toEqual({
        period,
        rows: [primaryPublicRow],
        ownedRows: [foreignPrivateRow],
        pagination: { page: 1, pageSize: 20, totalRows: 1, totalPages: 1 },
      });
      expectLeaderboardPrivacy(page, [fixture.email, fixture.foreign.email]);
    }

    await setTokens(fixture.token, 'unused-live-refresh-token');
    await expect(updateChildDisplayName(fixture.childId, 'An')).resolves.toMatchObject({ displayName: 'An' });
    const renamed = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    expect(renamed.rows).toEqual([{ ...primaryPublicRow, childName: 'An' }]);
    expect(renamed.ownedRows).toEqual([{
      ...primaryPublicRow,
      childName: 'An',
      optedIn: true,
      visibility: 'public',
    }]);
    expectLeaderboardPrivacy(renamed, [fixture.email, fixture.foreign.email]);

    const historyBefore = await getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId });
    await expect(updateLeaderboardPreference(fixture.deviceId, false)).resolves.toMatchObject({ optedIn: false });
    const hiddenWeekly = await getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 });
    const hiddenAllTime = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    await Promise.all([
      getRawLeaderboard(fixture.token, 'weekly', [fixture.email, fixture.foreign.email]),
      getRawLeaderboard(fixture.token, 'allTime', [fixture.email, fixture.foreign.email]),
    ]);
    const primaryPrivateRow = {
      ...primaryPublicRow,
      rank: null,
      rankStatus: 'private' as const,
      childName: 'An',
      parentEmailMasked: '[hidden]',
      optedIn: false,
      visibility: 'private' as const,
    };
    for (const [period, page] of [['weekly', hiddenWeekly], ['allTime', hiddenAllTime]] as const) {
      expect(page).toEqual({
        period,
        rows: [],
        ownedRows: [primaryPrivateRow],
        pagination: { page: 1, pageSize: 20, totalRows: 0, totalPages: 0 },
      });
      expectLeaderboardPrivacy(page, [fixture.email, fixture.foreign.email]);
    }
    await expect(getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId })).resolves.toEqual(historyBefore);
    expect(psql(
      `SELECT manifest_checksum FROM lessons
        WHERE lesson_key = ${sqlLiteral(canonicalLessonId)}
          AND lesson_version = ${canonicalLessonVersion};`,
    )).toBe(fixture.manifestChecksum);
  });
});
