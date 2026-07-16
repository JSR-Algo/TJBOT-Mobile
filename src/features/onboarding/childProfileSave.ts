import type { Child, Household } from '@/types';

export type OnboardingChildProfilePayload = {
  name: string;
  date_of_birth: string;
  vocabulary_level?: Child['vocabulary_level'];
  learning_style?: Child['learning_style'];
};

type SaveOnboardingChildProfileDeps = {
  activeHousehold: Household | null;
  createHousehold: (name: string) => Promise<Household>;
  addChild: (dto: OnboardingChildProfilePayload, householdId?: string) => Promise<Child>;
  recordDevelopmentCoppaConsent: () => Promise<void>;
  allowDevelopmentCoppaConsentBypass: boolean;
};

function errorCode(error: unknown): string | null {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  )
    ? error.code
    : null;
}

function isNoActiveHouseholdError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    error.message === 'No active household'
  );
}

function isCoppaConsentMissingError(error: unknown): boolean {
  const code = errorCode(error);
  return code === 'COPPA_REQUIRED' || code === 'COPPA_NOT_VERIFIED' || code === 'missing_coppa_consent';
}

export function childProfileSaveErrorMessage(saveError: unknown): string {
  if (isNoActiveHouseholdError(saveError)) return 'Create a household before saving a child profile.';
  if (isCoppaConsentMissingError(saveError)) return 'Verify parental consent before creating a child profile.';
  const code = errorCode(saveError);
  if (code === 'MAX_CHILD_LIMIT_REACHED') return 'Your plan has reached its child profile limit.';
  return 'Could not save child profile. Check your connection and try again.';
}

// Used when the child profile saved but finishing the (already-claimed) robot's
// pairing failed. The profile exists, so the parent only needs to retry the
// finalize step — which a second save does without re-creating the child.
export function pairingFinalizeErrorMessage(finalizeError: unknown): string {
  const code = errorCode(finalizeError);
  if (code === 'PROVISIONING_ATTEMPT_EXPIRED' || code === 'PROVISIONING_ATTEMPT_NOT_FOUND') {
    return 'Setup timed out. Start pairing again from the robot screen.';
  }
  return 'Saved your child, but could not finish setting up the robot. Check your connection and try again.';
}

export function allowsDevelopmentCoppaConsentBypass(_isDev: boolean, apiBaseUrl: string): boolean {
  try {
    const url = new URL(apiBaseUrl);
    return url.protocol === 'https:' && url.hostname === 'tbot-backend-8wmh.onrender.com';
  } catch {
    return false;
  }
}

export async function saveOnboardingChildProfile(
  payload: OnboardingChildProfilePayload,
  deps: SaveOnboardingChildProfileDeps,
): Promise<Child> {
  const householdId = deps.activeHousehold?.id ?? (await deps.createHousehold('My TJBot household')).id;
  try {
    return await deps.addChild(payload, householdId);
  } catch (saveError: unknown) {
    if (!deps.allowDevelopmentCoppaConsentBypass || !isCoppaConsentMissingError(saveError)) {
      throw saveError;
    }
    try {
      await deps.recordDevelopmentCoppaConsent();
    } catch {
      throw saveError;
    }
    return deps.addChild(payload, householdId);
  }
}
