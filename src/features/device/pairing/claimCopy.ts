// Typed EN literals for the zero-code claim flow.
//
// Kept as a typed module (not the i18n JSON catalogs) to mirror the existing
// pairing-copy convention and avoid i18n EN/VI key-parity churn for a
// flag-gated, additive flow. When the zero-code flow graduates from behind
// FEATURE_ZERO_CODE_CLAIM, migrate these into locales/en.json + vi.json and run
// `npm run i18n:check`.

export const CLAIM_COPY = {
  // Scan / discovery
  scanTitle: 'Looking for your Robot',
  scanBody: 'Make sure your Robot is turned on and nearby.',
  scanCta: 'Search again',

  // Found / connect
  foundTitle: 'Robot found',
  connectCta: 'Connect',
  connectingCta: 'Connecting…',

  // Waiting for physical confirmation on the robot
  waitingTitle: 'Almost there',
  waitingBody: 'Confirm on your Robot to finish connecting. This usually takes a few seconds.',
  waitingHint: 'Watch your Robot — it will show a light when it is ready.',

  // Success
  successTitle: 'Robot connected',
  successBody: 'Your Robot is paired and ready.',

  // Generic retry affordances
  retryCta: 'Try again',
  cancelCta: 'Cancel',
} as const;

export type ClaimCopyKey = keyof typeof CLAIM_COPY;
