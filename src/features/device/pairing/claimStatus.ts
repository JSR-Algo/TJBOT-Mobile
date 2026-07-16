// Claim error-code → parent-facing recovery mapping.
//
// Translates the normalized AppError codes (utils/errors.ts) and HTTP statuses
// from the claim endpoints into a small, typed recovery descriptor the UI can
// render directly: title, body, the retry affordance, and whether retrying is
// even sensible. This keeps screens free of ad-hoc status switches.

import { normalizeError } from '@/utils/errors';

/**
 * How the user can recover from a given claim failure.
 *  - 'connect'  : retry the claim (re-tap Connect) — transient/server issues.
 *  - 'rescan'   : the code is stale/wrong; rediscover the robot and re-claim.
 *  - 'support'  : terminal for this account (already claimed elsewhere); needs
 *                 a different action (transfer / contact support).
 *  - 'wait'     : offline/timeout; recover when connectivity returns.
 *  - 'none'     : nothing actionable in-flow.
 */
export type ClaimRecoveryAction = 'connect' | 'rescan' | 'support' | 'wait' | 'none';

export interface ClaimStatusDescriptor {
  /** Stable code used by tests/telemetry; not user-facing. */
  code: string;
  title: string;
  body: string;
  retryable: boolean;
  recovery: ClaimRecoveryAction;
}

export const CLAIM_POLL_INTERVAL_MS = 3000;
export const CLAIM_CONFIRM_TIMEOUT_MS = 5 * 60 * 1000;

export function isRetryablePairingStatusPollError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  const response = typeof record.response === 'object' && record.response !== null
    ? record.response as Record<string, unknown>
    : undefined;
  const status = typeof record.status === 'number'
    ? record.status
    : typeof response?.status === 'number'
      ? response.status
      : undefined;
  if (status === 408 || status === 429 || (typeof status === 'number' && status >= 500)) {
    return true;
  }
  if (record.retryable === true) return true;
  const code = typeof record.code === 'string' ? record.code : undefined;
  return code === 'NETWORK_ERROR'
    || code === 'RATE_LIMIT_EXCEEDED'
    || code === 'SERVICE_UNAVAILABLE'
    || code === 'GATEWAY_TIMEOUT'
    || code === 'INTERNAL_ERROR'
    || code === 'SERVER_ERROR';
}

const DEVICE_ALREADY_CLAIMED: ClaimStatusDescriptor = {
  code: 'DEVICE_ALREADY_CLAIMED',
  title: 'Already connected elsewhere',
  body: 'This Robot is paired to another account. Reset it or ask the current owner to remove it first.',
  retryable: false,
  recovery: 'support',
};

const CLAIM_INVALID_CODE: ClaimStatusDescriptor = {
  code: 'CLAIM_INVALID_CODE',
  title: 'Pairing code expired',
  body: 'The Robot’s pairing code is no longer valid. Search for your Robot again to get a fresh code.',
  retryable: true,
  recovery: 'rescan',
};

const CLAIM_OFFLINE: ClaimStatusDescriptor = {
  code: 'CLAIM_OFFLINE',
  title: 'You are offline',
  body: 'Check your internet connection, then try connecting again.',
  retryable: true,
  recovery: 'wait',
};

const CLAIM_TIMEOUT: ClaimStatusDescriptor = {
  code: 'CLAIM_TIMEOUT',
  title: 'Connection timed out',
  body: 'We could not reach the Robot in time. Try again with a stronger signal.',
  retryable: true,
  recovery: 'connect',
};

const CLAIM_CONFIRM_TIMEOUT: ClaimStatusDescriptor = {
  code: 'CLAIM_CONFIRM_TIMEOUT',
  title: 'Waiting on your Robot',
  body: 'Your Robot has not confirmed yet. Make sure it is powered on and try again.',
  retryable: true,
  recovery: 'connect',
};

const NO_DEVICE_AVAILABLE: ClaimStatusDescriptor = {
  code: 'NO_DEVICE_AVAILABLE',
  title: 'No Robot found',
  body: 'Make sure your Robot is in setup mode and nearby, then search again.',
  retryable: true,
  recovery: 'rescan',
};

const CLAIM_RATE_LIMITED: ClaimStatusDescriptor = {
  code: 'CLAIM_RATE_LIMITED',
  title: 'Too many attempts',
  body: 'Please wait a moment before trying to connect again.',
  retryable: true,
  recovery: 'wait',
};

const CLAIM_SERVER_ERROR: ClaimStatusDescriptor = {
  code: 'CLAIM_SERVER_ERROR',
  title: 'Service is having trouble',
  body: 'Something went wrong on our end. Please try connecting again in a moment.',
  retryable: true,
  recovery: 'connect',
};

const CLAIM_AUTH_REQUIRED: ClaimStatusDescriptor = {
  code: 'CLAIM_AUTH_REQUIRED',
  title: 'Sign in again',
  body: 'Your session expired. Sign in and try connecting your Robot again.',
  retryable: false,
  recovery: 'none',
};

const CLAIM_ALREADY_CONFIRMED: ClaimStatusDescriptor = {
  code: 'CLAIM_ALREADY_CONFIRMED',
  title: 'Already connected',
  body: 'This Robot has already finished connecting to your account.',
  retryable: false,
  recovery: 'none',
};

const CLAIM_QUARANTINED: ClaimStatusDescriptor = {
  code: 'DEVICE_QUARANTINED',
  title: "We can't set up this Robot",
  body: 'This Robot is locked for safety. Contact support to continue.',
  retryable: false,
  recovery: 'support',
};

const CLAIM_UNKNOWN: ClaimStatusDescriptor = {
  code: 'CLAIM_UNKNOWN',
  title: 'Could not connect',
  body: 'We could not connect to your Robot. Please try again.',
  retryable: true,
  recovery: 'connect',
};

// Backend error-code strings (utils/errors.ts vocabulary) → descriptor.
//
// Backend codes here are limited to codes the backend ACTUALLY emits (plan
// §3.3, verified against tbot-backend/src/errors/error-code.ts +
// claim.service.ts on 2026-06-04). Reserved-but-never-emitted members
// (FALLBACK_CODE_INVALID/EXPIRED, CLAIM_WINDOW_EXPIRED, DEVICE_NOT_ONLINE,
// WIFI_PROVISION_TIMEOUT) are intentionally absent — window-elapsed surfaces as
// CLAIM_CONFIRM_TIMEOUT, the 6-digit fallback redeems via PAIRING_CODE_*, and
// the offline case is the robot_unreachable model rather than a thrown code.
// Local BLE delivery codes are included separately because they are part of the
// same user-visible claim flow.
//
// DEVICE_QUARANTINED (409) and DEVICE_NOT_FOUND (404) are ALSO emitted by
// POST /claim/request (claim.service.ts) — they were missing from the
// 2026-06-04 audit. Without explicit entries they fell through to the status
// switch: a 409 mapped to DEVICE_ALREADY_CLAIMED ("reset it") which is wrong
// for an UNOWNED quarantined device, and a 404 mapped to CLAIM_UNKNOWN
// ("try again") instead of prompting a rescan.
const CODE_MAP: Record<string, ClaimStatusDescriptor> = {
  DEVICE_ALREADY_CLAIMED,
  DEVICE_ALREADY_OWNED: DEVICE_ALREADY_CLAIMED,
  CONFLICT: DEVICE_ALREADY_CLAIMED,
  CLAIM_ALREADY_CONFIRMED,
  NO_DEVICE_AVAILABLE,
  // A stale/mismatched serial — rescan for a fresh device rather than retry the
  // same failing claim (the 404 status fallback would say "try again").
  DEVICE_NOT_FOUND: NO_DEVICE_AVAILABLE,
  // The device is locked for safety (and may be UNOWNED), so the bare-409
  // "already paired elsewhere, reset it" copy is wrong/unactionable here.
  DEVICE_QUARANTINED: CLAIM_QUARANTINED,
  // Invalid/expired pairing or fallback-token input. The 6-digit fallback
  // emits PAIRING_CODE_* (NOT FALLBACK_CODE_*); the QR fallback token emits
  // FALLBACK_TOKEN_*. A bare 403/401 with no code is disambiguated below.
  CLAIM_INVALID_CODE,
  PAIRING_CODE_INVALID: CLAIM_INVALID_CODE,
  PAIRING_CODE_EXPIRED: CLAIM_INVALID_CODE,
  FALLBACK_TOKEN_INVALID: CLAIM_INVALID_CODE,
  FALLBACK_TOKEN_EXPIRED: CLAIM_INVALID_CODE,
  INVALID_BLE_CODE: CLAIM_INVALID_CODE,
  BLE_CODE_EXPIRED: CLAIM_INVALID_CODE,
  NETWORK_ERROR: CLAIM_OFFLINE,
  GATEWAY_TIMEOUT: CLAIM_TIMEOUT,
  CLAIM_CONFIRM_TIMEOUT,
  BLE_CLAIM_TOKEN_SEND_FAILED: CLAIM_SERVER_ERROR,
  // Robot reported Wi-Fi provisioning from an unexpected state — server-side
  // recoverable, so route to a retry-the-claim server-error descriptor.
  WIFI_PROVISIONED_INVALID_STATE: CLAIM_SERVER_ERROR,
  RATE_LIMIT_EXCEEDED: CLAIM_RATE_LIMITED,
  SERVICE_UNAVAILABLE: CLAIM_SERVER_ERROR,
  INTERNAL_ERROR: CLAIM_SERVER_ERROR,
  SERVER_ERROR: CLAIM_SERVER_ERROR,
  INVALID_CREDENTIALS: CLAIM_AUTH_REQUIRED,
  invalid_access_token: CLAIM_AUTH_REQUIRED,
  invalid_refresh_token: CLAIM_AUTH_REQUIRED,
};

/**
 * Map an arbitrary thrown error from a claim call to a recovery descriptor.
 *
 * Resolution order:
 *   1. Exact code match (DEVICE_ALREADY_CLAIMED, RATE_LIMIT_EXCEEDED, …).
 *   2. HTTP-status fallback for the claim-specific 403 (invalid code) vs 409
 *      (already claimed) that the generic normalizer flattens to FORBIDDEN /
 *      CONFLICT.
 *   3. Unknown.
 */
export function describeClaimFailure(error: unknown): ClaimStatusDescriptor {
  const normalized = normalizeError(error);

  const byCode = CODE_MAP[normalized.code];
  if (byCode) return byCode;

  // Status-based disambiguation for the claim contract specifically.
  switch (normalized.status) {
    case 403:
      // Code/QR fallback documents 403 as invalid or expired fallback input.
      return CLAIM_INVALID_CODE;
    case 409:
      return DEVICE_ALREADY_CLAIMED;
    case 401:
      return CLAIM_AUTH_REQUIRED;
    case 408:
    case 504:
      return CLAIM_TIMEOUT;
    case 429:
      return CLAIM_RATE_LIMITED;
    default:
      break;
  }
  if (typeof normalized.status === 'number' && normalized.status >= 500) {
    return CLAIM_SERVER_ERROR;
  }

  return CLAIM_UNKNOWN;
}

export function describeKnownClaimFailureCode(errorCode: string | undefined): ClaimStatusDescriptor | null {
  if (!errorCode) return null;
  return CODE_MAP[errorCode] ?? null;
}

// Exported for tests/telemetry that need to assert on specific descriptors.
export const CLAIM_STATUS = {
  DEVICE_ALREADY_CLAIMED,
  CLAIM_ALREADY_CONFIRMED,
  CLAIM_INVALID_CODE,
  CLAIM_OFFLINE,
  CLAIM_TIMEOUT,
  CLAIM_CONFIRM_TIMEOUT,
  NO_DEVICE_AVAILABLE,
  CLAIM_RATE_LIMITED,
  CLAIM_SERVER_ERROR,
  CLAIM_AUTH_REQUIRED,
  CLAIM_QUARANTINED,
  CLAIM_UNKNOWN,
} as const;
