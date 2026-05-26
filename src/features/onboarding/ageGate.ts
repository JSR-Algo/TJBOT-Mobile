import * as SecureStore from 'expo-secure-store';
import type { UserRole } from '@/services/observability/analytics';

export const AGE_ANSWER_KEY = 'age_answer_completed';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

export type AgeBandId = 'U13' | '13_17' | '18_PLUS' | 'PREFER_NOT_TO_SAY';

export type AgeAnswer = {
  band: AgeBandId;
  role: UserRole;
  answeredAt: string;
};

const BAND_TO_ROLE: Record<AgeBandId, UserRole> = {
  U13: 'child',
  '13_17': 'teen',
  '18_PLUS': 'adult',
  PREFER_NOT_TO_SAY: 'child',
};

export function roleForAgeBand(band: AgeBandId): UserRole {
  return BAND_TO_ROLE[band];
}

export async function readAgeAnswer(): Promise<AgeAnswer | null> {
  try {
    const raw = await SecureStore.getItemAsync(AGE_ANSWER_KEY, SECURE_OPTIONS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<AgeAnswer>;
    if (
      candidate.band === undefined ||
      candidate.role === undefined ||
      typeof candidate.answeredAt !== 'string'
    ) {
      return null;
    }
    if (!(candidate.band in BAND_TO_ROLE)) return null;
    return {
      band: candidate.band,
      role: candidate.role,
      answeredAt: candidate.answeredAt,
    };
  } catch {
    return null;
  }
}

export async function writeAgeAnswer(band: AgeBandId): Promise<AgeAnswer> {
  const answer: AgeAnswer = {
    band,
    role: roleForAgeBand(band),
    answeredAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(AGE_ANSWER_KEY, JSON.stringify(answer), SECURE_OPTIONS);
  return answer;
}

export async function clearAgeAnswer(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AGE_ANSWER_KEY, SECURE_OPTIONS);
  } catch {
    // best-effort; tests + factory reset only
  }
}
