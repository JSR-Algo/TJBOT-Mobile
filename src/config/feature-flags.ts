/**
 * Central feature flags.
 *
 * `FEATURE_SUBSCRIPTION` gates the Stripe-web subscription path and the
 * in-app physical-goods purchase CTA. v1.0 ships with the flag OFF for
 * App Store / Play Store first review (Apple §3.1.1, Google Play Billing).
 *
 * Resolution order:
 *   1. Env var when set to "true" / "1" or "false" / "0".
 *   2. Otherwise each flag's explicit release default.
 */

function readEnvFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (typeof raw !== 'string') return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return defaultValue;
}

export const FEATURE_SUBSCRIPTION: boolean = readEnvFlag('EXPO_PUBLIC_FEATURE_SUBSCRIPTION');

export function isSubscriptionFeatureEnabled(): boolean {
  return FEATURE_SUBSCRIPTION;
}

/**
 * `FEATURE_ZERO_CODE_CLAIM` gates the zero-code claim connection flow: claim a
 * BLE-discovered Robot without the parent typing a verification code. ON by
 * default because the product pairing path is scan robot -> connect; QR/code is
 * retained as a fallback when claim fails or the flag is explicitly disabled.
 *
 * Disable with EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM=false.
 */
export const FEATURE_ZERO_CODE_CLAIM: boolean = readEnvFlag('EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM', true);

export function isZeroCodeClaimEnabled(): boolean {
  return FEATURE_ZERO_CODE_CLAIM;
}

export const FEATURE_SUBSCRIPTION_DISABLED_CODE = 'FEATURE_SUBSCRIPTION_DISABLED' as const;

export class FeatureSubscriptionDisabledError extends Error {
  readonly code = FEATURE_SUBSCRIPTION_DISABLED_CODE;

  constructor(operation: string) {
    super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
    this.name = 'FeatureSubscriptionDisabledError';
  }
}
