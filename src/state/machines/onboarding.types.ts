// Onboarding state machine types — plan §2.1 §3.1 §4.1

export type OnboardingState =
  | 'SPLASH'
  | 'WELCOME'
  | 'INTRO_DEMO'
  | 'TRUST'
  | 'COPPA_CONSENT'
  | 'MIC_PERMISSION'
  | 'LOGIN'
  | 'LOGIN_ERROR'
  | 'CHILD_PROFILE'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'MIC_FALLBACK_BLOCKED';

export type MicPermissionStatus = 'unknown' | 'granted' | 'denied' | 'permanently_denied';

export interface OnboardingContext {
  userId: string | null;
  consentRecordId: string | null;
  childProfileId: string | null;
  micPermission: MicPermissionStatus;
  loginError: string | null;
  introDemoBeat: number; // 0-3; each beat auto-advances 2500–3000ms
}

// Events — plan §4.1 transition triggers
export type OnboardingEvent =
  | { type: 'NO_SESSION' }
  | { type: 'SESSION_VALID' }
  | { type: 'DEMO_BEAT_DONE' } // internal beat timer
  | { type: 'TAP_NEXT' }
  | { type: 'CONSENT_GRANTED'; consentRecordId: string }
  | { type: 'CONSENT_DECLINED' }
  | { type: 'MIC_GRANTED' }
  | { type: 'MIC_DENIED' }
  | { type: 'MIC_PERMANENTLY_DENIED' }
  | { type: 'AUTH_OK'; userId: string; hasChildProfile: boolean; childProfileId?: string }
  | { type: 'AUTH_FAIL'; error: string }
  | { type: 'NETWORK_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'PROFILE_CREATED'; childProfileId: string }
  | { type: 'RETURNING_USER' };

// Stubbed backend services interface — never makes real fetch calls in tests
export interface OnboardingServices {
  /** POST /v1/coppa/consent — idempotent on (userId, consent_version) */
  recordCoppaConsent(params: { userId: string; version: string }): Promise<{ id: string }>;
  /** POST /v1/auth/login */
  login(params: { email: string; password: string }): Promise<{
    userId: string;
    hasChildProfile: boolean;
    childProfileId?: string;
  }>;
  /** POST /v1/profiles/child */
  createChildProfile(params: { userId: string; name: string; age: number }): Promise<{
    id: string;
  }>;
  /** GET /v1/me — checks session validity on SPLASH */
  checkSession(): Promise<{ valid: boolean; userId?: string; hasChildProfile?: boolean }>;
}
