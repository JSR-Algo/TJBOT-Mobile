/**
 * Central feature flags.
 *
 * `FEATURE_SUBSCRIPTION` gates the Stripe-web subscription path and the
 * in-app physical-goods purchase CTA. v1.0 ships with the flag OFF for
 * App Store / Play Store first review (Apple §3.1.1, Google Play Billing).
 *
 * Resolution order:
 *   1. `EXPO_PUBLIC_FEATURE_SUBSCRIPTION` env var when set to "true" / "1".
 *   2. Otherwise `false` (release default).
 */

function readEnvFlag(name: string): boolean {
  const raw = process.env[name];
  if (typeof raw !== 'string') return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

export const FEATURE_SUBSCRIPTION: boolean = readEnvFlag('EXPO_PUBLIC_FEATURE_SUBSCRIPTION');

export function isSubscriptionFeatureEnabled(): boolean {
  return FEATURE_SUBSCRIPTION;
}

export const FEATURE_SUBSCRIPTION_DISABLED_CODE = 'FEATURE_SUBSCRIPTION_DISABLED' as const;

export class FeatureSubscriptionDisabledError extends Error {
  readonly code = FEATURE_SUBSCRIPTION_DISABLED_CODE;

  constructor(operation: string) {
    super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
    this.name = 'FeatureSubscriptionDisabledError';
  }
}
