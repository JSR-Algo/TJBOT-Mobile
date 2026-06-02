import {
  AGE_ANSWER_KEY,
  readAgeAnswer,
  writeAgeAnswer,
  clearAgeAnswer,
  roleForAgeBand,
  type AgeBandId,
} from '../../src/features/onboarding/ageGate';
import * as SecureStore from 'expo-secure-store';

describe('ageGate band → role mapping', () => {
  it('maps U13 and PREFER_NOT_TO_SAY to child (COPPA-safe default)', () => {
    expect(roleForAgeBand('U13')).toBe('child');
    expect(roleForAgeBand('PREFER_NOT_TO_SAY')).toBe('child');
  });

  it('maps 13_17 to teen', () => {
    expect(roleForAgeBand('13_17')).toBe('teen');
  });

  it('maps 18_PLUS to adult', () => {
    expect(roleForAgeBand('18_PLUS')).toBe('adult');
  });
});

describe('ageGate SecureStore persistence', () => {
  beforeEach(async () => {
    await clearAgeAnswer();
    (SecureStore.getItemAsync as jest.Mock).mockClear();
    (SecureStore.setItemAsync as jest.Mock).mockClear();
  });

  it('returns null when no answer is stored', async () => {
    const answer = await readAgeAnswer();
    expect(answer).toBeNull();
  });

  it('persists under AGE_ANSWER_KEY with WHEN_UNLOCKED keychain accessibility', async () => {
    await writeAgeAnswer('18_PLUS');
    const call = (SecureStore.setItemAsync as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(AGE_ANSWER_KEY);
    expect(JSON.parse(call[1] as string)).toMatchObject({
      band: '18_PLUS',
      role: 'adult',
    });
    expect(call[2]).toEqual(
      expect.objectContaining({ keychainAccessible: SecureStore.WHEN_UNLOCKED }),
    );
  });

  it('round-trips a written answer', async () => {
    await writeAgeAnswer('U13');
    const answer = await readAgeAnswer();
    expect(answer?.band).toBe('U13');
    expect(answer?.role).toBe('child');
    expect(typeof answer?.answeredAt).toBe('string');
  });

  it.each<AgeBandId>(['U13', '13_17', '18_PLUS', 'PREFER_NOT_TO_SAY'])(
    'persists each band id (%s) with its mapped role',
    async (band) => {
      await writeAgeAnswer(band);
      const answer = await readAgeAnswer();
      expect(answer?.band).toBe(band);
      expect(answer?.role).toBe(roleForAgeBand(band));
    },
  );

  it('returns null for malformed stored payload', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('not-json');
    const answer = await readAgeAnswer();
    expect(answer).toBeNull();
  });

  it('returns null for payload missing required fields', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ band: 'U13' }),
    );
    const answer = await readAgeAnswer();
    expect(answer).toBeNull();
  });

  it('returns null for unknown band id', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ band: 'BOGUS', role: 'adult', answeredAt: 'x' }),
    );
    const answer = await readAgeAnswer();
    expect(answer).toBeNull();
  });

  it('readAgeAnswer swallows underlying SecureStore errors', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('keychain locked'),
    );
    const answer = await readAgeAnswer();
    expect(answer).toBeNull();
  });
});
