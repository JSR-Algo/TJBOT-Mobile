import { ROUTES } from '@/navigation/routes';
import { captureError } from '@/services/observability/sentry';
import * as secureStore from '@/services/storage/secureStore';
import {
  clearRecoveryCheckpoint,
  readRecoveryCheckpoint,
  writeRecoveryCheckpoint,
} from '@/features/fallback/recoveryCheckpointStore';
import type { LessonCheckpoint } from '@/features/fallback/recoveryTypes';

jest.mock('@/services/storage/secureStore');
jest.mock('@/services/observability/sentry', () => ({
  captureError: jest.fn(),
}));

const mockedSecureStore = jest.mocked(secureStore);
const mockedCaptureError = jest.mocked(captureError);
const STORAGE_KEY = 'tbot.lesson-recovery.v1';

const checkpoint: LessonCheckpoint = {
  version: 1,
  lessonTitle: 'Greetings',
  progressLabel: '2 of 5',
  resumeTarget: ROUTES.RunningScreen,
  reason: 'network',
  phase: 'listening',
  sessionState: 'active',
  authState: 'authenticated',
  deviceId: 'device-1',
  assignmentId: 'assignment-1',
  sessionId: 'session-1',
  childId: 'child-1',
};

describe('recovery checkpoint persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSecureStore.getItem.mockResolvedValue(null);
    mockedSecureStore.setItem.mockResolvedValue(undefined);
    mockedSecureStore.removeItem.mockResolvedValue(undefined);
  });

  it('round-trips a complete production checkpoint through secure storage', async () => {
    let storedValue: string | null = null;
    mockedSecureStore.setItem.mockImplementation(async (_key, value) => {
      storedValue = value;
    });
    mockedSecureStore.getItem.mockImplementation(async () => storedValue);

    await writeRecoveryCheckpoint(checkpoint);
    await expect(readRecoveryCheckpoint()).resolves.toEqual(checkpoint);

    expect(mockedSecureStore.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(checkpoint));
    expect(mockedSecureStore.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('returns null without reporting an error when no checkpoint is stored', async () => {
    await expect(readRecoveryCheckpoint()).resolves.toBeNull();

    expect(mockedCaptureError).not.toHaveBeenCalled();
  });

  it('fails closed and reports invalid stored JSON', async () => {
    mockedSecureStore.getItem.mockResolvedValue('{not-json');

    await expect(readRecoveryCheckpoint()).resolves.toBeNull();

    expect(mockedCaptureError).toHaveBeenCalledTimes(1);
    expect(mockedCaptureError.mock.calls[0]?.[0]).toBeInstanceOf(SyntaxError);
  });

  it('fails closed for a partial stored checkpoint', async () => {
    mockedSecureStore.getItem.mockResolvedValue(JSON.stringify({
      version: 1,
      lessonTitle: 'Greetings',
      deviceId: 'device-1',
    }));

    await expect(readRecoveryCheckpoint()).resolves.toBeNull();
  });

  it('fails closed for unsupported checkpoint versions', async () => {
    mockedSecureStore.getItem.mockResolvedValue(JSON.stringify({ ...checkpoint, version: 2 }));

    await expect(readRecoveryCheckpoint()).resolves.toBeNull();
  });

  it.each(['deviceId', 'assignmentId'] as const)('fails closed when %s is missing', async (field) => {
    const storedCheckpoint: Record<string, unknown> = { ...checkpoint };
    delete storedCheckpoint[field];
    mockedSecureStore.getItem.mockResolvedValue(JSON.stringify(storedCheckpoint));

    await expect(readRecoveryCheckpoint()).resolves.toBeNull();
  });

  it('fails closed and reports secure storage read failures', async () => {
    const storageError = new Error('secure storage unavailable');
    mockedSecureStore.getItem.mockRejectedValue(storageError);

    await expect(readRecoveryCheckpoint()).resolves.toBeNull();

    expect(mockedCaptureError).toHaveBeenCalledWith(storageError);
  });

  it('rejects invalid checkpoints without persisting them', async () => {
    const invalidCheckpoint: LessonCheckpoint = { ...checkpoint, assignmentId: '' };

    await expect(writeRecoveryCheckpoint(invalidCheckpoint)).rejects.toThrow('Invalid lesson checkpoint');

    expect(mockedSecureStore.setItem).not.toHaveBeenCalled();
  });

  it('clears the versioned recovery checkpoint', async () => {
    await clearRecoveryCheckpoint();

    expect(mockedSecureStore.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});
