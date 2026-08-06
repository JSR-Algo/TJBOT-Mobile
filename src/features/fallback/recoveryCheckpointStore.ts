import { captureError } from '@/services/observability/sentry';
import { getItem, removeItem, setItem } from '@/services/storage/secureStore';
import { parseLessonCheckpoint, type LessonCheckpoint } from './recoveryTypes';

const RECOVERY_CHECKPOINT_KEY = 'tbot.lesson-recovery.v1';

export async function readRecoveryCheckpoint(): Promise<LessonCheckpoint | null> {
  try {
    const storedCheckpoint = await getItem(RECOVERY_CHECKPOINT_KEY);
    if (storedCheckpoint === null) {
      return null;
    }

    const parsedCheckpoint: unknown = JSON.parse(storedCheckpoint);
    return parseLessonCheckpoint(parsedCheckpoint);
  } catch (error) {
    captureError(error);
    return null;
  }
}

export async function writeRecoveryCheckpoint(checkpoint: LessonCheckpoint): Promise<void> {
  const parsedCheckpoint = parseLessonCheckpoint(checkpoint);
  if (!parsedCheckpoint) {
    throw new Error('Invalid lesson checkpoint');
  }

  await setItem(RECOVERY_CHECKPOINT_KEY, JSON.stringify(parsedCheckpoint));
}

export async function clearRecoveryCheckpoint(): Promise<void> {
  await removeItem(RECOVERY_CHECKPOINT_KEY);
}
