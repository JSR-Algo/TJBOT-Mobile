/**
 * App boot reads the saved age role without starting any third-party
 * observability runtime. A missing, malformed, or unavailable value is safe.
 */

type BootHandles = {
  getItemAsync: jest.Mock;
  loadApp: () => typeof import('../../src/App');
};

function bootWithAnswer(stored: string | null, options?: { fail?: boolean }): BootHandles {
  jest.resetModules();

  const getItemAsync = jest.fn(async () => {
    if (options?.fail) throw new Error('keychain locked');
    return stored;
  });

  jest.doMock('expo-secure-store', () => ({
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    getItemAsync,
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  }));

  return {
    getItemAsync,
    loadApp: () => jest.requireActual('../../src/App') as typeof import('../../src/App'),
  };
}

describe('App age-role boot', () => {
  it('starts the SecureStore read when the app module loads', () => {
    const h = bootWithAnswer(null);
    expect(h.getItemAsync).not.toHaveBeenCalled();
    h.loadApp();
    expect(h.getItemAsync).toHaveBeenCalledTimes(1);
    expect(h.getItemAsync).toHaveBeenCalledWith('age_answer_completed');
  });

  it.each([
    ['child', 'U13'],
    ['teen', '13_17'],
    ['adult', '18_PLUS'],
  ] as const)('resolves the stored %s role', async (role, band) => {
    const h = bootWithAnswer(JSON.stringify({ band, role, answeredAt: 't' }));
    await expect(h.loadApp().__ageGateBootPromise).resolves.toBe(role);
  });

  it.each([
    ['missing answer', null],
    ['malformed answer', '{bad json'],
    ['unsupported role', JSON.stringify({ role: 'reviewer' })],
  ])('falls back to unknown for %s', async (_label, stored) => {
    const h = bootWithAnswer(stored);
    await expect(h.loadApp().__ageGateBootPromise).resolves.toBe('unknown');
  });

  it('falls back to unknown when SecureStore rejects', async () => {
    const h = bootWithAnswer(null, { fail: true });
    await expect(h.loadApp().__ageGateBootPromise).resolves.toBe('unknown');
  });
});
