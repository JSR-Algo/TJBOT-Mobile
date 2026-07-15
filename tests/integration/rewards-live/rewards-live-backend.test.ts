import React from 'react';
import axios from 'axios';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import CelebrationScreen from '@/features/progress/screens/CelebrationScreen';
import LeaderboardScreen from '@/features/rewards/screens/LeaderboardView';
import ParentRewardsScreen from '@/features/rewards/screens/ParentRewardsView';
import { rewardKeys } from '@/features/rewards/hooks/useRewards';
import {
  clearRewardSeenQueue,
  setRewardQueueScope,
} from '@/features/rewards/offline/rewardSeenQueue';
import client from '@/services/http/client';
import { setTokens } from '@/services/http/tokens';
import {
  acknowledgeRewardSeen,
  getRewardHistory,
  getRewardInbox,
} from '@/services/api/rewards.api';
import { getLeaderboard, updateLeaderboardPreference } from '@/services/api/leaderboard.api';
import { setActiveChild, updateChildDisplayName } from '@/services/api/households';

let mockUiIdentity: {
  parentId: string;
  householdId: string;
  childId: string;
} | null = null;

jest.mock('@/contexts/AuthContext', () => ({
  useOptionalAuth: () => ({
    user: mockUiIdentity ? { id: mockUiIdentity.parentId } : null,
  }),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useHousehold: () => ({
    activeHousehold: mockUiIdentity ? { id: mockUiIdentity.householdId } : null,
    activeChild: mockUiIdentity ? { id: mockUiIdentity.childId, name: 'Mai' } : null,
    children: mockUiIdentity ? [{ id: mockUiIdentity.childId, name: 'Mai' }] : [],
  }),
}));

jest.mock('@/design-system/animations/useReduceMotion', () => ({
  useReduceMotion: () => true,
}));

const apiUrl = process.env.TBOT_API_URL ?? 'http://127.0.0.1:3100/v1';
const raw = axios.create({ baseURL: apiUrl, validateStatus: () => true });
const postgresContainer = process.env.TBOT_REWARDS_POSTGRES_CONTAINER ?? 'tbot-rewards-e2e-pg';
const backendRoot = process.env.TBOT_BACKEND_WORKTREE
  ?? resolve(__dirname, '../../../../../tbot-backend/mobile-robot-rewards');
const backendPrivateKey = process.env.TBOT_BACKEND_PRIVATE_KEY_PEM;
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
  initialActiveChildId: string;
  deviceToken: string;
  foreign: Identity;
  foreignHouseholdToken: string;
  assignmentId: string;
  sessionId: string;
  manifestChecksum: string;
}

function renderLiveScreen(
  component: React.ReactElement,
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

  const screen = render(
    React.createElement(QueryClientProvider, { client: queryClient }, component),
  );
  return Object.assign(screen, { queryClient });
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
  if (!backendPrivateKey) {
    throw new Error('TBOT_BACKEND_PRIVATE_KEY_PEM is required for the rewards live proof');
  }
  const script = [
    "const jwt=require('jsonwebtoken')",
    "const payload=JSON.parse(process.env.E2E_CLAIMS)",
    "process.stdout.write(jwt.sign(payload,process.env.E2E_PRIVATE_KEY,{algorithm:'RS256',expiresIn:'15m'}))",
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
  const initialActiveChildId = randomUUID();
  const initialActiveChildConsentId = randomUUID();
  psql(
    `BEGIN;
     INSERT INTO child_profiles (id, household_id, display_name, birth_year, age_gate_passed, status)
     VALUES (${sqlLiteral(initialActiveChildId)}, ${sqlLiteral(identity.householdId)}, 'Lan', 2017, TRUE, 'active');
     INSERT INTO coppa_consents
       (id, parent_user_id, child_name, birth_date, consent_version, status)
     VALUES (${sqlLiteral(initialActiveChildConsentId)}, ${sqlLiteral(identity.parentId)}, 'Lan',
             '2017-01-01', 'rewards-live-v1', 'active');
     INSERT INTO child_profile_coppa_consents (child_id, consent_id, bound_by_parent_id)
     VALUES (${sqlLiteral(initialActiveChildId)}, ${sqlLiteral(initialActiveChildConsentId)},
             ${sqlLiteral(identity.parentId)});
     UPDATE parent_accounts
        SET active_child_id = ${sqlLiteral(initialActiveChildId)}
      WHERE id = ${sqlLiteral(identity.parentId)};
     COMMIT;`,
  );
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
    initialActiveChildId,
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

  it('proves active-child, persisted rewards, leaderboard privacy, rename and opt-out as one live scenario', async () => {
    expect(psql(
      `SELECT COUNT(*)
         FROM child_profiles child
         JOIN child_profile_coppa_consents binding ON binding.child_id = child.id
         JOIN coppa_consents consent ON consent.id = binding.consent_id
        WHERE child.id IN (${sqlLiteral(fixture.initialActiveChildId)}, ${sqlLiteral(fixture.childId)})
          AND child.household_id = ${sqlLiteral(fixture.householdId)}
          AND child.status = 'active'
          AND consent.status = 'active'
          AND consent.revoked_at IS NULL;`,
    )).toBe('2');
    expect(psql(
      `SELECT active_child_id FROM parent_accounts WHERE id = ${sqlLiteral(fixture.parentId)};`,
    )).toBe(fixture.initialActiveChildId);
    await expect(setActiveChild(fixture.childId)).resolves.toEqual({ active_child_id: fixture.childId });
    expect(psql(
      `SELECT active_child_id FROM parent_accounts WHERE id = ${sqlLiteral(fixture.parentId)};`,
    )).toBe(fixture.childId);
    const foreignActiveChild = await raw.post('/profile/active-child', {
      child_id: fixture.childId,
    }, {
      headers: { Authorization: `Bearer ${fixture.foreignHouseholdToken}` },
    });
    expect(foreignActiveChild.status).toBe(403);
    expect(psql(
      `SELECT active_child_id FROM parent_accounts WHERE id = ${sqlLiteral(fixture.foreign.parentId)};`,
    )).toBe(fixture.foreign.childId);
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
    expect(inbox.rewards[0]).toMatchObject({ xp: 109, coins: 10 });
    expect(history.totals).toMatchObject({ rewardCount: 1, xp: 109, coins: 10, refreshing: false });
    expect(psql(
      `SELECT COUNT(*) FROM lesson_reward_ledger
        WHERE assignment_id = ${sqlLiteral(fixture.assignmentId)}
          AND session_id = ${sqlLiteral(fixture.sessionId)};`,
    )).toBe('1');

    const persistedReward = inbox.rewards[0];
    expect(persistedReward).toBeDefined();
    if (!persistedReward) throw new Error('Expected the persisted reward receipt');
    const rewardId = persistedReward.rewardId;
    mockUiIdentity = {
      parentId: fixture.parentId,
      householdId: fixture.householdId,
      childId: fixture.childId,
    };
    setRewardQueueScope(fixture.parentId, fixture.householdId);
    await clearRewardSeenQueue(fixture.parentId, fixture.householdId);

    let celebrationSeenRequestCount = 0;
    const seenRequestInterceptor = client.interceptors.request.use(config => {
      if (
        config.method?.toUpperCase() === 'POST'
        && config.url === `/mobile/rewards/${rewardId}/seen`
      ) {
        celebrationSeenRequestCount += 1;
      }
      return config;
    });
    let celebration: ReturnType<typeof renderLiveScreen> | undefined;
    try {
      const renderedCelebration = renderLiveScreen(React.createElement(CelebrationScreen, {
        navigation: { replace: jest.fn() } as never,
        route: {
          key: 'rewards-live-celebration',
          name: 'CelebrationScreen',
          params: { rewardId },
        } as never,
      }));
      celebration = renderedCelebration;
      expect(await renderedCelebration.findByText('Mai · TeeBot Sao')).toBeTruthy();
      expect(renderedCelebration.getByText('XP: 109 · Coins: 10')).toBeTruthy();
      expect(renderedCelebration.getByText('Lesson completed')).toBeTruthy();
      await waitFor(async () => {
        expect(await getRewardInbox()).toMatchObject({ count: 0, rewards: [] });
      }, { timeout: 10_000 });
      await waitFor(() => {
        expect(renderedCelebration.queryClient.getQueryData(
          rewardKeys.inbox(fixture.parentId, fixture.householdId),
        )).toMatchObject({ count: 0, rewards: [] });
      }, { timeout: 10_000 });
      expect(renderedCelebration.getByText('XP: 109 · Coins: 10')).toBeTruthy();
      expect(celebrationSeenRequestCount).toBe(1);
    } finally {
      client.interceptors.request.eject(seenRequestInterceptor);
      celebration?.unmount();
    }

    await acknowledgeRewardSeen(rewardId);
    await acknowledgeRewardSeen(rewardId);
    await expect(getRewardInbox()).resolves.toMatchObject({ count: 0, rewards: [] });
    const seenHistory = await getRewardHistory({ childId: fixture.childId, deviceId: fixture.deviceId });
    expect(seenHistory.history[0]?.rewardId).toBe(rewardId);
    expect(seenHistory.history[0]?.rewardId).toBe(persistedReward.rewardId);

    const parentRewards = renderLiveScreen(React.createElement(ParentRewardsScreen, {
      navigation: { navigate: jest.fn() } as never,
      route: { key: 'rewards-live-parent-rewards', name: 'ParentRewardsScreen' } as never,
    }));
    expect(await parentRewards.findByLabelText('XP: 109. Coins: 10. Rewards: 1.')).toBeTruthy();
    expect(parentRewards.getByText('Mai · TeeBot Sao')).toBeTruthy();
    expect(parentRewards.getByText('Lesson completed')).toBeTruthy();
    expect(parentRewards.getByLabelText(/Lesson completed\. XP: 109\. Coins: 10\./)).toBeTruthy();
    parentRewards.unmount();

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
    await expect(updateLeaderboardPreference(fixture.deviceId, true)).resolves.toMatchObject({ optedIn: true });

    const maskedEmail = fixture.email.replace(/^(.{2})[^@]*/, '$1***');
    const leaderboardScreen = renderLiveScreen(React.createElement(LeaderboardScreen, {
      navigation: { goBack: jest.fn() } as never,
      route: { key: 'rewards-live-leaderboard', name: 'LeaderboardScreen' } as never,
    }));
    expect(await leaderboardScreen.findByLabelText(/^Your robot\./)).toBeTruthy();
    expect(leaderboardScreen.getByText('Mai · TeeBot Sao')).toBeTruthy();
    expect(leaderboardScreen.getByText('109 XP')).toBeTruthy();
    expect(leaderboardScreen.getByText('Lessons: 1')).toBeTruthy();
    expect(leaderboardScreen.getByText(maskedEmail)).toBeTruthy();
    expect(leaderboardScreen.queryByText(/Coins: 10|10 coins/i)).toBeNull();
    leaderboardScreen.unmount();

    const weekly = await getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 });
    const allTime = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    const weeklyOwned = weekly.ownedRows.find((row) => row.robotId === fixture.deviceId);
    const allTimeOwned = allTime.ownedRows.find((row) => row.robotId === fixture.deviceId);
    for (const owned of [weeklyOwned, allTimeOwned]) {
      expect(owned).toMatchObject({
        childName: 'Mai',
        robotName: 'TeeBot Sao',
        optedIn: true,
        xp: 109,
        completedLessonCount: 1,
        rank: 1,
        rankStatus: 'current',
      });
      expect(owned?.parentEmailMasked).toBe(fixture.email.replace(/^(.{2})[^@]*/, '$1***'));
    }
    expect(JSON.stringify({ weekly, allTime })).not.toContain(fixture.email);

    await setTokens(fixture.foreign.token, 'unused-live-refresh-token');
    const publicWeekly = await getLeaderboard({ period: 'weekly', page: 1, pageSize: 20 });
    const publicAllTime = await getLeaderboard({ period: 'allTime', page: 1, pageSize: 20 });
    expect(publicWeekly.rows.find((row) => row.robotId === fixture.deviceId)).toMatchObject({
      robotId: fixture.deviceId,
      childName: 'Mai',
      robotName: 'TeeBot Sao',
      parentEmailMasked: maskedEmail,
      xp: 109,
      completedLessonCount: 1,
      rank: 1,
      rankStatus: 'current',
    });
    expect(JSON.stringify(publicWeekly)).not.toContain(fixture.email);
    expect(publicAllTime.rows.find((row) => row.robotId === fixture.deviceId)).toMatchObject({
      robotId: fixture.deviceId,
      childName: 'Mai',
      robotName: 'TeeBot Sao',
      parentEmailMasked: maskedEmail,
      xp: 109,
      completedLessonCount: 1,
      rank: 1,
      rankStatus: 'current',
    });
    expect(JSON.stringify(publicAllTime)).not.toContain(fixture.email);

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
  }, 60_000);
});
