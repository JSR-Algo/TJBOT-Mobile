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

/**
 * F-T54-09b: the child cap is the one onboarding error a parent cannot clear
 * from inside onboarding. RootStackNavigator renders ONLY OnboardingNavigator
 * while `onboardingComplete` is false, and the sole screen that can archive or
 * delete a child (ParentSettingsScreen) lives outside it — so hitting the cap
 * used to be an unrecoverable dead end with the robot already claimed. Callers
 * use this to offer the existing children instead of a new profile.
 */
export function isChildProfileLimitError(error: unknown): boolean {
  const code = errorCode(error);
  return code !== null && CHILD_LIMIT_CODES.has(code);
}

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

// F-T54-10/11: codes the add-child request path can answer with that have a
// specific parent action behind them. Anything not listed still falls through to
// the code-carrying generic message below — never to a connection claim.
const CHILD_SAVE_MESSAGES: Record<string, string> = {
  CHILD_NOT_FOUND: 'We could not find that child profile. Go back and re-enter it.',
  NOT_HOUSEHOLD_MEMBER:
    'This account cannot add a child to this household. Sign in with the parent account that created it.',
  CALLER_HAS_NO_HOUSEHOLD:
    'This account has no household yet. Create your household, then add a child.',
  // The three COPPA invariants below are 500s that used to be bare `throw new
  // Error()` backend-side, so they arrived with no code at all and were reported
  // to the parent as a network problem. They are server faults with nothing the
  // parent can fix, so say exactly that and hand them something to quote.
  COPPA_BIRTH_YEAR_UNRESOLVED:
    'We could not process that date of birth. Please re-enter it, or send code COPPA_BIRTH_YEAR_UNRESOLVED to support.',
  COPPA_LOCK_KEY_UNRESOLVED:
    'Something went wrong on our end saving consent. Please try again, or send code COPPA_LOCK_KEY_UNRESOLVED to support.',
  COPPA_CONSENT_WRITE_FAILED:
    'Something went wrong on our end saving consent. Please try again, or send code COPPA_CONSENT_WRITE_FAILED to support.',
};

export function childProfileSaveErrorMessage(saveError: unknown): string {
  if (isNoActiveHouseholdError(saveError)) return 'Create a household before saving a child profile.';
  if (isCoppaConsentMissingError(saveError)) return 'Verify parental consent before creating a child profile.';
  const code = errorCode(saveError);
  if (code !== null && CHILD_LIMIT_CODES.has(code)) return 'Your plan has reached its child profile limit.';
  if (code !== null && code in CHILD_SAVE_MESSAGES) return CHILD_SAVE_MESSAGES[code];

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

  // F-T54-10: the codes below all come from the endpoint this screen actually
  // calls — POST /v1/devices/provision/complete (consumer-provisioning.service.ts)
  // — which the original audit scope missed entirely. Every one of them used to
  // fall through to the generic message.
  // The robot has not authenticated yet; finalize polls for this, so seeing it
  // here means the poll ran out rather than that anything is broken.
  DEVICE_AUTH_NOT_VERIFIED:
    'The robot has not finished connecting. Wait until it is online, then try again.',
  DEVICE_AUTH_TIMEOUT:
    'The robot did not finish connecting in time. Check it is powered on and connected, then try again.',
  // The attempt was mutated underneath us (another phone, or a restarted setup).
  PROVISIONING_ATTEMPT_CHANGED:
    'This setup was changed somewhere else. Start pairing again from the robot.',
  NO_PROVISIONING_ATTEMPT:
    'This robot is not in setup mode. Press and hold its button until it is ready, then try again.',
  // Household/permission problems — retrying cannot fix these.
  NOT_HOUSEHOLD_MEMBER:
    'This account cannot set up this robot. Sign in with the parent account that started setup.',
  CALLER_HAS_NO_HOUSEHOLD:
    'This account has no household yet. Finish creating your household, then set up the robot.',
  // Child-profile problems on the assign step. The child exists (we just made
  // it), so these mean the profile is not usable for assignment.
  CHILD_PROFILE_NOT_FOUND:
    'We could not find that child profile. Go back and re-enter it, then try again.',
  CHILD_PROFILE_INACTIVE:
    'That child profile is archived. Restore it or use a different child, then try again.',
  CHILD_PROFILE_HOUSEHOLD_MISMATCH:
    'That child belongs to a different household. Pick a child from this household and try again.',
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
