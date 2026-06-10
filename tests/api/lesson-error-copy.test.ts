import { ERROR_MESSAGES, formatLessonCopy, getErrorMessage, normalizeError } from '@/utils/errors';

// §10.4 — Error → copy: the 7 slice-minimum lesson codes map to the §9 M4
// parent copy, incl. STEP_TIMEOUT. normalizeError is unchanged (it already
// parses {code,message,retryable}); these assert the copy map + the renderer
// token resolver.
describe('US-006 S11 — lesson error → parent copy (M4)', () => {
  const M4_COPY: Record<string, string> = {
    ASSET_CHECKSUM_MISMATCH: "Couldn't get this lesson ready. Tap to try again.",
    ASSET_PROFILE_UNAVAILABLE: "This lesson isn't available for <robot> yet.",
    PRELOAD_TIMEOUT: "Couldn't get this lesson ready. Tap to try again.",
    STEP_TIMEOUT: 'Something interrupted the lesson. Tap to restart.',
    ROBOT_OFFLINE: "Couldn't reach <robot>. Check it's on and connected.",
    ROBOT_BUSY: '<robot> is finishing another lesson. Try again in a moment.',
    LOW_BATTERY: '<robot> needs more charge before this lesson can start.',
  };

  it('maps all 7 slice codes to their M4 copy', () => {
    for (const [code, copy] of Object.entries(M4_COPY)) {
      expect(ERROR_MESSAGES[code]).toBe(copy);
      expect(getErrorMessage(code)).toBe(copy);
    }
  });

  it('maps STEP_TIMEOUT to the restart copy (reviewer P1 — was missing)', () => {
    expect(getErrorMessage('STEP_TIMEOUT')).toBe('Something interrupted the lesson. Tap to restart.');
  });

  it('none of the 7 codes fall through to UNKNOWN_ERROR', () => {
    for (const code of Object.keys(M4_COPY)) {
      expect(getErrorMessage(code)).not.toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  });

  it('normalizeError surfaces a lesson code from the {error:{...}} shape unchanged', () => {
    const result = normalizeError({ response: { status: 422, data: { error: { code: 'STEP_TIMEOUT', retryable: false } } } });
    expect(result.code).toBe('STEP_TIMEOUT');
    expect(result.message).toBe('Something interrupted the lesson. Tap to restart.');
  });

  describe('formatLessonCopy — resolves <robot>/<lesson> tokens for display', () => {
    it('substitutes a provided robot name', () => {
      expect(formatLessonCopy(getErrorMessage('ROBOT_OFFLINE'), { robot: 'Casa Robot' })).toBe(
        "Couldn't reach Casa Robot. Check it's on and connected.",
      );
    });

    it('falls back to neutral nouns so a raw token never reaches a parent', () => {
      expect(formatLessonCopy(ERROR_MESSAGES.ASSET_PROFILE_UNAVAILABLE)).toBe(
        "This lesson isn't available for your robot yet.",
      );
      expect(formatLessonCopy('Getting <lesson> ready…')).toBe('Getting this lesson ready…');
    });

    it('leaves token-free copy (e.g. STEP_TIMEOUT) untouched', () => {
      expect(formatLessonCopy(getErrorMessage('STEP_TIMEOUT'))).toBe('Something interrupted the lesson. Tap to restart.');
    });
  });
});
