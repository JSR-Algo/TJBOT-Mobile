describe('FEATURE_ZERO_CODE_CLAIM defaults', () => {
  const previous = process.env.EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM;

  afterEach(() => {
    jest.resetModules();
    if (previous === undefined) delete process.env.EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM;
    else process.env.EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM = previous;
  });

  it('enables zero-code claim by default so BLE scan connects directly', () => {
    delete process.env.EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM;
    jest.resetModules();

    const flags = require('@/config/feature-flags') as typeof import('@/config/feature-flags');

    expect(flags.FEATURE_ZERO_CODE_CLAIM).toBe(true);
    expect(flags.isZeroCodeClaimEnabled()).toBe(true);
  });

  it.each(['false', '0'])('allows env override %s to disable zero-code claim', (value) => {
    process.env.EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM = value;
    jest.resetModules();

    const flags = require('@/config/feature-flags') as typeof import('@/config/feature-flags');

    expect(flags.FEATURE_ZERO_CODE_CLAIM).toBe(false);
    expect(flags.isZeroCodeClaimEnabled()).toBe(false);
  });
});
