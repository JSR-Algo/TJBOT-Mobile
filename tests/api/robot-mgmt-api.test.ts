describe('robot management API', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('reports mic test failure when native mic is unavailable', async () => {
    jest.doMock('@/native/VoiceMic', () => ({
      VoiceMic: {
        isAvailable: false,
        start: jest.fn(),
        stop: jest.fn(),
        onEngineReady: jest.fn(() => jest.fn()),
        onVadStart: jest.fn(() => jest.fn()),
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runMicTest } = require('@/services/api/robot-mgmt.api') as typeof import('@/services/api/robot-mgmt.api');

    await expect(runMicTest()).resolves.toEqual({ passed: false });
  });

  it('keeps mic test failed when native mic only emits engine-ready signal', async () => {
    jest.useFakeTimers();
    let engineReady: (() => void) | null = null;
    const stop = jest.fn().mockResolvedValue(undefined);
    jest.doMock('@/native/VoiceMic', () => ({
      VoiceMic: {
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
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runMicTest } = require('@/services/api/robot-mgmt.api') as typeof import('@/services/api/robot-mgmt.api');

    const result = runMicTest();
    jest.advanceTimersByTime(1800);
    await expect(result).resolves.toEqual({ passed: false });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('passes mic test when native mic emits speech-start signal', async () => {
    let vadStart: (() => void) | null = null;
    const stop = jest.fn().mockResolvedValue(undefined);
    jest.doMock('@/native/VoiceMic', () => ({
      VoiceMic: {
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
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runMicTest } = require('@/services/api/robot-mgmt.api') as typeof import('@/services/api/robot-mgmt.api');

    await expect(runMicTest()).resolves.toEqual({ passed: true });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('resolves mic result when native stop rejects during cleanup', async () => {
    let vadStart: (() => void) | null = null;
    const stop = jest.fn().mockRejectedValue(new Error('native stop failed'));
    jest.doMock('@/native/VoiceMic', () => ({
      VoiceMic: {
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
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runMicTest } = require('@/services/api/robot-mgmt.api') as typeof import('@/services/api/robot-mgmt.api');

    await expect(runMicTest()).resolves.toEqual({ passed: true });
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
