import type { Child, Household } from '@/types';
import {
  allowsDevelopmentCoppaConsentBypass,
  childProfileSaveErrorMessage,
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
