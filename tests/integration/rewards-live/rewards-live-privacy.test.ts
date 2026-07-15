import { assertRawLeaderboardPrivacy } from './rewards-live-privacy';

const publicRow = {
  rank: 1,
  rankStatus: 'current',
  robotId: 'robot-1',
  childName: 'Mai',
  robotName: 'TeeBot Sao',
  parentEmailMasked: 're***@example.test',
  xp: 109,
  completedLessonCount: 1,
  currentStreakDays: 1,
  badges: ['first-lesson', 'lessons-1'],
};

function envelope() {
  return {
    data: {
      period: 'allTime',
      rows: [publicRow],
      ownedRows: [{ ...publicRow, optedIn: true, visibility: 'public' }],
      pagination: { page: 1, pageSize: 20, totalRows: 1, totalPages: 1 },
      items: [{
        rank: 1,
        deviceId: 'robot-1',
        robotName: 'TeeBot Sao',
        childName: 'Mai',
        maskedParentEmail: 're***@example.test',
        xp: 109,
        completions: 1,
        owned: true,
        reachedAt: '2026-07-16T00:00:00.000Z',
      }],
      ownedRow: {
        rank: 1,
        deviceId: 'robot-1',
        robotName: 'TeeBot Sao',
        childName: 'Mai',
        maskedParentEmail: 're***@example.test',
        xp: 109,
        completions: 1,
        owned: true,
        reachedAt: '2026-07-16T00:00:00.000Z',
      },
      nextCursor: null,
    },
  };
}

describe('raw leaderboard privacy inspection', () => {
  it('accepts documented masked mobile and legacy fields', () => {
    expect(() => assertRawLeaderboardPrivacy(envelope(), ['rewards-live@example.test'])).not.toThrow();
  });

  it('rejects synthetic top-level and legacy secret leaks', () => {
    expect(() => assertRawLeaderboardPrivacy({
      ...envelope(),
      email: 'rewards-live@example.test',
    }, ['rewards-live@example.test'])).toThrow(/response/);

    const legacyLeak = envelope();
    legacyLeak.data.items[0] = { ...legacyLeak.data.items[0], parentId: 'parent-secret' } as never;
    expect(() => assertRawLeaderboardPrivacy(legacyLeak, ['rewards-live@example.test']))
      .toThrow(/response\.data\.items\[0\]/);

    expect(() => assertRawLeaderboardPrivacy({
      ...envelope(),
      birthDate: '2018-01-01',
    }, [])).toThrow(/response/);

    expect(() => assertRawLeaderboardPrivacy({
      ...envelope(),
      data: { ...envelope().data, accessToken: 'secret' },
    }, [])).toThrow(/response\.data/);

    expect(() => assertRawLeaderboardPrivacy({
      ...envelope(),
      data: {
        ...envelope().data,
        pagination: { ...envelope().data.pagination, serialNumber: 'robot-secret' },
      },
    }, [])).toThrow(/response\.data\.pagination/);

    expect(() => assertRawLeaderboardPrivacy({
      ...envelope(),
      data: {
        ...envelope().data,
        items: [{ ...envelope().data.items[0], birthDate: '2018-01-01' }],
      },
    }, [])).toThrow(/response\.data\.items\[0\]/);

    expect(() => assertRawLeaderboardPrivacy({
      ...envelope(),
      data: {
        ...envelope().data,
        ownedRow: { ...envelope().data.ownedRow, serialNumber: 'robot-secret' },
      },
    }, [])).toThrow(/response\.data\.ownedRow/);
  });
});
