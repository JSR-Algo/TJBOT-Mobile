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

// The backend emits `MAX_CHILDREN_REACHED` (household.service.ts — the only
// occurrence). The client used to test for `MAX_CHILD_LIMIT_REACHED`, which the
// backend never sends, so hitting the 6-profile limit fell through to the generic
// "check your connection" message and sent parents to debug their Wi-Fi. Both
// spellings are accepted so the fix holds whichever side is corrected later.
const CHILD_LIMIT_CODES = new Set(['MAX_CHILDREN_REACHED', 'MAX_CHILD_LIMIT_REACHED']);

function errorStatus(error: unknown): number | null {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  )
    ? error.status
    : null;
}

export function childProfileSaveErrorMessage(saveError: unknown): string {
  if (isNoActiveHouseholdError(saveError)) return 'Create a household before saving a child profile.';
  if (isCoppaConsentMissingError(saveError)) return 'Verify parental consent before creating a child profile.';
  const code = errorCode(saveError);
  if (code !== null && CHILD_LIMIT_CODES.has(code)) return 'Your plan has reached its child profile limit.';

  // Never blame the connection for an error the server actually answered. The
  // old text asserted a network fault for EVERY unrecognised failure — a 403 from
  // the membership check, a 409, a 500 — which is both wrong and undebuggable:
  // it is the only thing the parent sees, and nothing else surfaces the cause.
  // Carry the code/status through so a failure can be identified from a screenshot.
  const status = errorStatus(saveError);
  const detail = code ?? (status !== null ? `HTTP ${status}` : null);
  if (detail !== null) {
    return `Could not save child profile (${detail}). Please try again, or send this code to support.`;
  }
  if (code === null && status === null && isTransportLikeError(saveError)) {
    return 'Could not save child profile. Check your connection and try again.';
  }
  return 'Could not save child profile. Please try again, or contact support if it keeps failing.';
}

// Only a genuine transport failure earns the "check your connection" wording.
function isTransportLikeError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    /network|timeout|fetch|connection|offline/i.test(error.message)
  );
}

// Used when the child profile saved but finishing the (already-claimed) robot's
// pairing failed. The profile exists, so the parent only needs to retry the
// finalize step — which a second save does without re-creating the child.
// The backend has EIGHT provisioning failure codes; this mapping used to cover two
// of them, and one of those two (`PROVISIONING_ATTEMPT_EXPIRED`) is not even an
// ErrorCode member — it is thrown as a bare string from device-claim.service.ts:82.
// Everything else fell through to "check your connection", which is actively
// misleading for e.g. DEVICE_MISMATCH (wrong robot) or ALREADY_COMPLETED (nothing
// wrong at all). Each code now gets the action that actually resolves it.
const PAIRING_FINALIZE_MESSAGES: Record<string, string> = {
  // Attempt is gone or timed out — the parent must start pairing over.
  PROVISIONING_ATTEMPT_EXPIRED: 'Setup timed out. Start pairing again from the robot screen.',
  PROVISIONING_ATTEMPT_NOT_FOUND: 'Setup timed out. Start pairing again from the robot screen.',
  PROVISIONING_TIMEOUT: 'Setup timed out. Start pairing again from the robot screen.',
  // Already done — retrying is pointless and the parent should just continue.
  PROVISIONING_ATTEMPT_ALREADY_COMPLETED:
    'This robot is already set up. You can close setup and start using it.',
  // The robot has not reported itself ready yet — waiting is the fix, not retrying.
  PROVISIONING_ATTEMPT_NOT_READY:
    'The robot has not finished starting up. Wait until it is connected, then try again.',
  // Wrong account / wrong robot — retrying can never succeed.
  PROVISIONING_ATTEMPT_NOT_OWNED:
    'This setup belongs to a different account. Start pairing again from this robot.',
  PROVISIONING_DEVICE_MISMATCH:
    'This setup is for a different robot. Start pairing again from the robot you want to set up.',
  PROVISIONING_SERIAL_MISMATCH:
    'This setup is for a different robot. Start pairing again from the robot you want to set up.',
};

export function pairingFinalizeErrorMessage(finalizeError: unknown): string {
  const code = errorCode(finalizeError);
  if (code !== null && code in PAIRING_FINALIZE_MESSAGES) {
    return PAIRING_FINALIZE_MESSAGES[code];
  }

  // Same rule as childProfileSaveErrorMessage: never assert a network fault for a
  // failure the server answered. The child IS saved at this point, so say so —
  // otherwise the parent re-enters the profile expecting it was lost.
  const status = errorStatus(finalizeError);
  const detail = code ?? (status !== null ? `HTTP ${status}` : null);
  if (detail !== null) {
    return `Saved your child, but could not finish setting up the robot (${detail}). Try again, or send this code to support.`;
  }
  if (isTransportLikeError(finalizeError)) {
    return 'Saved your child, but could not finish setting up the robot. Check your connection and try again.';
  }
  return 'Saved your child, but could not finish setting up the robot. Try again, or contact support if it keeps failing.';
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
