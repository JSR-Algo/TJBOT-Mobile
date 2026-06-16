function loadRobotMgmtApiWithMicMock(VoiceMic: unknown) {
  jest.doMock('@/config/feature-flags', () => ({
    FEATURE_DEVICE_MANAGEMENT: true,
    FeatureDeviceManagementDisabledError: jest.requireActual('@/config/feature-flags')
      .FeatureDeviceManagementDisabledError,
  }));
  jest.doMock('@/native/VoiceMic', () => ({ VoiceMic }));
  return require('@/services/api/robot-mgmt.api') as typeof import('@/services/api/robot-mgmt.api');
}

describe('robot management API', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('reports mic test failure when native mic is unavailable', async () => {
    const { runMicTest } = loadRobotMgmtApiWithMicMock({
      isAvailable: false,
      start: jest.fn(),
      stop: jest.fn(),
      onEngineReady: jest.fn(() => jest.fn()),
      onVadStart: jest.fn(() => jest.fn()),
    });

    await expect(runMicTest()).resolves.toEqual({ passed: false });
  });

  it('keeps mic test failed when native mic only emits engine-ready signal', async () => {
    jest.useFakeTimers();
    let engineReady: (() => void) | null = null;
    const stop = jest.fn().mockResolvedValue(undefined);

    const { runMicTest } = loadRobotMgmtApiWithMicMock({
      isAvailable: true,
      start: jest.fn(async () => {
        engineReady?.();
      }),
      stop,
      onEngineReady: jest.fn((cb: () => void) => {
        engineReady = cb;
        return jest.fn();
      }),
      onVadStart: jest.fn(() => jest.fn()),
    });

    const result = runMicTest();
    jest.advanceTimersByTime(1800);
    await expect(result).resolves.toEqual({ passed: false });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('passes mic test when native mic emits speech-start signal', async () => {
    let vadStart: (() => void) | null = null;
    const stop = jest.fn().mockResolvedValue(undefined);

    const { runMicTest } = loadRobotMgmtApiWithMicMock({
      isAvailable: true,
      start: jest.fn(async () => {
        vadStart?.();
      }),
      stop,
      onEngineReady: jest.fn(() => jest.fn()),
      onVadStart: jest.fn((cb: () => void) => {
        vadStart = cb;
        return jest.fn();
      }),
    });

    await expect(runMicTest()).resolves.toEqual({ passed: true });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('resolves mic result when native stop rejects during cleanup', async () => {
    let vadStart: (() => void) | null = null;
    const stop = jest.fn().mockRejectedValue(new Error('native stop failed'));

    const { runMicTest } = loadRobotMgmtApiWithMicMock({
      isAvailable: true,
      start: jest.fn(async () => {
        vadStart?.();
      }),
      stop,
      onEngineReady: jest.fn(() => jest.fn()),
      onVadStart: jest.fn((cb: () => void) => {
        vadStart = cb;
        return jest.fn();
      }),
    });

    await expect(runMicTest()).resolves.toEqual({ passed: true });
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
