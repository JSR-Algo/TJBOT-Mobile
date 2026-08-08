import type { Child, Household } from '@/types';
import {
  allowsDevelopmentCoppaConsentBypass,
  childProfileSaveErrorMessage,
  pairingFinalizeErrorMessage,
  saveOnboardingChildProfile,
  type OnboardingChildProfilePayload,
} from '@/features/onboarding/childProfileSave';

const household: Household = {
  id: 'household-1',
  name: 'Test household',
  owner_id: 'parent-1',
  created_at: '2026-05-25T00:00:00.000Z',
};

const child: Child = {
  id: 'child-1',
  household_id: 'household-1',
  name: 'Panda friend',
  birth_year: 2018,
  age_gate_passed: true,
  created_at: '2026-05-25T00:00:00.000Z',
};

const payload: OnboardingChildProfilePayload = {
  name: 'Panda friend',
  date_of_birth: '2018-07-01',
  vocabulary_level: 'beginner',
  learning_style: 'visual',
};

describe('child profile onboarding save', () => {
  it('shows the consent blocker for the current backend COPPA code', () => {
    expect(childProfileSaveErrorMessage({
      code: 'COPPA_NOT_VERIFIED',
      message: 'COPPA parental consent is required before creating a child profile',
      status: 403,
    })).toBe('Verify parental consent before creating a child profile.');
  });

  it('allows the test consent bypass on hosted staging release builds but never production', () => {
    expect(allowsDevelopmentCoppaConsentBypass(true, 'https://tbot-backend-8wmh.onrender.com/v1')).toBe(true);
    expect(allowsDevelopmentCoppaConsentBypass(false, 'https://tbot-backend-8wmh.onrender.com/v1')).toBe(true);
    expect(allowsDevelopmentCoppaConsentBypass(true, 'https://api.TJBot.io/v1')).toBe(false);
    expect(allowsDevelopmentCoppaConsentBypass(false, 'https://api.TJBot.io/v1')).toBe(false);
  });

  it('records development COPPA consent and retries once on staging dev builds', async () => {
    const coppaError = {
      code: 'COPPA_NOT_VERIFIED',
      message: 'COPPA parental consent is required before creating a child profile',
      status: 403,
    };
    const createHousehold = jest.fn(async (): Promise<Household> => household);
    const addChild = jest.fn<Promise<Child>, [OnboardingChildProfilePayload, string | undefined]>()
      .mockRejectedValueOnce(coppaError)
      .mockResolvedValueOnce(child);
    const recordDevelopmentCoppaConsent = jest.fn(async (): Promise<void> => undefined);

    await expect(saveOnboardingChildProfile(payload, {
      activeHousehold: null,
      createHousehold,
      addChild,
      recordDevelopmentCoppaConsent,
      allowDevelopmentCoppaConsentBypass: true,
    })).resolves.toBe(child);

    expect(createHousehold).toHaveBeenCalledWith('My TJBot household');
    expect(recordDevelopmentCoppaConsent).toHaveBeenCalledTimes(1);
    expect(addChild).toHaveBeenNthCalledWith(1, payload, 'household-1');
    expect(addChild).toHaveBeenNthCalledWith(2, payload, 'household-1');
  });

  it('does not auto-consent outside the development staging bypass', async () => {
    const coppaError = {
      code: 'COPPA_NOT_VERIFIED',
      message: 'COPPA parental consent is required before creating a child profile',
      status: 403,
    };
    const createHousehold = jest.fn(async (): Promise<Household> => household);
    const addChild = jest.fn<Promise<Child>, [OnboardingChildProfilePayload, string | undefined]>()
      .mockRejectedValueOnce(coppaError);
    const recordDevelopmentCoppaConsent = jest.fn(async (): Promise<void> => undefined);

    await expect(saveOnboardingChildProfile(payload, {
      activeHousehold: null,
      createHousehold,
      addChild,
      recordDevelopmentCoppaConsent,
      allowDevelopmentCoppaConsentBypass: false,
    })).rejects.toBe(coppaError);

    expect(recordDevelopmentCoppaConsent).not.toHaveBeenCalled();
    expect(addChild).toHaveBeenCalledTimes(1);
  });
});

describe('childProfileSaveErrorMessage — real cause must survive to the screen', () => {
  it('maps the backend child-limit code the server actually sends', () => {
    // Regression: the client tested for MAX_CHILD_LIMIT_REACHED, which the backend
    // never emits — it sends MAX_CHILDREN_REACHED (household.service.ts).
    expect(childProfileSaveErrorMessage({ code: 'MAX_CHILDREN_REACHED', message: 'x' })).toBe(
      'Your plan has reached its child profile limit.',
    );
  });

  it('still accepts the legacy spelling', () => {
    expect(childProfileSaveErrorMessage({ code: 'MAX_CHILD_LIMIT_REACHED', message: 'x' })).toBe(
      'Your plan has reached its child profile limit.',
    );
  });

  it('does not blame the connection for a server-answered error, and shows the code', () => {
    const msg = childProfileSaveErrorMessage({ code: 'FORBIDDEN', message: 'nope', status: 403 });
    expect(msg).toContain('FORBIDDEN');
    expect(msg).not.toContain('Check your connection');
  });

  it('falls back to the HTTP status when no code is present', () => {
    const msg = childProfileSaveErrorMessage({ message: 'Internal', status: 500 });
    expect(msg).toContain('HTTP 500');
    expect(msg).not.toContain('Check your connection');
  });

  it('keeps the connection wording only for a genuine transport failure', () => {
    expect(childProfileSaveErrorMessage({ message: 'Network request failed' })).toBe(
      'Could not save child profile. Check your connection and try again.',
    );
  });
});

describe('pairingFinalizeErrorMessage — all eight backend codes, not two', () => {
  it('tells the parent to wait when the robot is not ready yet', () => {
    const msg = pairingFinalizeErrorMessage({ code: 'PROVISIONING_ATTEMPT_NOT_READY', message: 'x' });
    expect(msg).toContain('has not finished starting up');
    expect(msg).not.toContain('Check your connection');
  });

  it('does not ask the parent to retry something already completed', () => {
    const msg = pairingFinalizeErrorMessage({ code: 'PROVISIONING_ATTEMPT_ALREADY_COMPLETED', message: 'x' });
    expect(msg).toContain('already set up');
  });

  it('names a wrong-robot mismatch instead of blaming the network', () => {
    for (const code of ['PROVISIONING_DEVICE_MISMATCH', 'PROVISIONING_SERIAL_MISMATCH']) {
      const msg = pairingFinalizeErrorMessage({ code, message: 'x' });
      expect(msg).toContain('different robot');
      expect(msg).not.toContain('Check your connection');
    }
  });

  it('names a wrong-account attempt', () => {
    expect(pairingFinalizeErrorMessage({ code: 'PROVISIONING_ATTEMPT_NOT_OWNED', message: 'x' }))
      .toContain('different account');
  });

  it('keeps the timeout wording for expired / not-found / timeout', () => {
    for (const code of ['PROVISIONING_ATTEMPT_EXPIRED', 'PROVISIONING_ATTEMPT_NOT_FOUND', 'PROVISIONING_TIMEOUT']) {
      expect(pairingFinalizeErrorMessage({ code, message: 'x' }))
        .toBe('Setup timed out. Start pairing again from the robot screen.');
    }
  });

  it('surfaces an unmapped code and still says the child was saved', () => {
    const msg = pairingFinalizeErrorMessage({ code: 'SOMETHING_NEW', message: 'x', status: 409 });
    expect(msg).toContain('SOMETHING_NEW');
    expect(msg).toContain('Saved your child');
    expect(msg).not.toContain('Check your connection');
  });

  it('keeps the connection wording only for a real transport failure', () => {
    expect(pairingFinalizeErrorMessage({ message: 'Network request failed' }))
      .toContain('Check your connection');
  });
  // ── F-T54-10: codes from POST /v1/devices/provision/complete ──────────────
  // consumer-provisioning.service.ts is the service the finalize step actually
  // calls, and it was missing from the original audit scope entirely, so all of
  // these fell through to the generic message.

  it('tells the parent to wait when the robot has not authenticated yet', () => {
    for (const code of ['DEVICE_AUTH_NOT_VERIFIED', 'DEVICE_AUTH_TIMEOUT']) {
      const msg = pairingFinalizeErrorMessage({ code, message: 'x' });
      expect(msg).toMatch(/connect/i);
      expect(msg).not.toContain('Check your connection');
    }
  });

  it('names a permission failure on finalize instead of blaming the network', () => {
    for (const code of ['NOT_HOUSEHOLD_MEMBER', 'CALLER_HAS_NO_HOUSEHOLD']) {
      const msg = pairingFinalizeErrorMessage({ code, message: 'x' });
      expect(msg).not.toContain('Check your connection');
      expect(msg).toMatch(/account|household/i);
    }
  });

  it('names a child-profile problem on the assign step', () => {
    for (const code of ['CHILD_PROFILE_NOT_FOUND', 'CHILD_PROFILE_INACTIVE', 'CHILD_PROFILE_HOUSEHOLD_MISMATCH']) {
      const msg = pairingFinalizeErrorMessage({ code, message: 'x' });
      expect(msg).toMatch(/child/i);
      expect(msg).not.toContain('Check your connection');
    }
  });

  it('tells the parent to restart setup when the attempt changed underneath them', () => {
    expect(pairingFinalizeErrorMessage({ code: 'PROVISIONING_ATTEMPT_CHANGED', message: 'x' }))
      .toMatch(/start pairing again/i);
  });

  it('tells the parent the robot is not in setup mode', () => {
    expect(pairingFinalizeErrorMessage({ code: 'NO_PROVISIONING_ATTEMPT', message: 'x' }))
      .toMatch(/setup mode/i);
  });

  it('never blames the network for any mapped finalize code', () => {
    // The whole defect class in one assertion: every code the finalize endpoint
    // can answer with must produce copy that does not assert a transport fault.
    const codes = [
      'PROVISIONING_ATTEMPT_EXPIRED', 'PROVISIONING_ATTEMPT_NOT_FOUND', 'PROVISIONING_TIMEOUT',
      'PROVISIONING_ATTEMPT_ALREADY_COMPLETED', 'PROVISIONING_ATTEMPT_NOT_READY',
      'PROVISIONING_ATTEMPT_NOT_OWNED', 'PROVISIONING_DEVICE_MISMATCH', 'PROVISIONING_SERIAL_MISMATCH',
      'DEVICE_AUTH_NOT_VERIFIED', 'DEVICE_AUTH_TIMEOUT', 'PROVISIONING_ATTEMPT_CHANGED',
      'NO_PROVISIONING_ATTEMPT', 'NOT_HOUSEHOLD_MEMBER', 'CALLER_HAS_NO_HOUSEHOLD',
      'CHILD_PROFILE_NOT_FOUND', 'CHILD_PROFILE_INACTIVE', 'CHILD_PROFILE_HOUSEHOLD_MISMATCH',
    ];
    for (const code of codes) {
      expect(pairingFinalizeErrorMessage({ code, message: 'x' })).not.toContain('Check your connection');
    }
  });
});

describe('childProfileSaveErrorMessage — codes the add-child path can answer with (F-T54-11)', () => {
  it('names a COPPA server fault instead of a connection problem', () => {
    // These three were bare `throw new Error()` backend-side, so they arrived
    // with NO code at all and hit the "check your connection" branch — telling a
    // parent on a working network to debug their Wi-Fi for a server fault.
    for (const code of [
      'COPPA_BIRTH_YEAR_UNRESOLVED',
      'COPPA_LOCK_KEY_UNRESOLVED',
      'COPPA_CONSENT_WRITE_FAILED',
    ]) {
      const msg = childProfileSaveErrorMessage({ code, message: 'x', status: 500 });
      expect(msg).not.toContain('Check your connection');
      expect(msg).toContain(code);
    }
  });

  it('names a household permission failure on add-child', () => {
    for (const code of ['NOT_HOUSEHOLD_MEMBER', 'CALLER_HAS_NO_HOUSEHOLD']) {
      const msg = childProfileSaveErrorMessage({ code, message: 'x', status: 403 });
      expect(msg).not.toContain('Check your connection');
      expect(msg).toMatch(/account|household/i);
    }
  });

  it('names a missing child profile', () => {
    expect(childProfileSaveErrorMessage({ code: 'CHILD_NOT_FOUND', message: 'x', status: 404 }))
      .toMatch(/could not find/i);
  });
});
