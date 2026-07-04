import { isCoppaVerified } from '@/services/api/account';

export type ConsentGateResult =
  | { allowed: true }
  | { allowed: false; code: 'missing_coppa_consent' | 'stale_coppa_policy_version'; route: string };

/**
 * COPPA consent gate — blocks child-data flows until parent consent is recorded.
 * AI voice consent is enforced separately at MicAskScreen before microphone use.
 */
export async function requireParentCoppaConsent(): Promise<ConsentGateResult> {
  const verified = await isCoppaVerified();
  if (!verified) {
    return {
      allowed: false,
      code: 'missing_coppa_consent',
      route: 'ParentConsentScreen',
    };
  }
  return { allowed: true };
}