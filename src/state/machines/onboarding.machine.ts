// Onboarding XState v5 machine — plan §2.1 §3.1 §4.1 §5
// All 12 states: SPLASH WELCOME INTRO_DEMO TRUST COPPA_CONSENT MIC_PERMISSION
//                LOGIN LOGIN_ERROR CHILD_PROFILE COMPLETED ABANDONED MIC_FALLBACK_BLOCKED

import { setup, assign, fromPromise } from 'xstate';
import type {
  OnboardingContext,
  OnboardingEvent,
  OnboardingServices,
} from './onboarding.types';

// INTRO_DEMO: 4 beats auto-advancing at 2500ms each (plan §3.1 §10).
// One state with internal beat counter + delayed self-transition.
// Preserves beat count for analytics without 4 chained states.
const BEAT_COUNT = 4;
const BEAT_MS = 2500;

// Internal context that includes services reference (not exported as public type)
interface InternalContext extends OnboardingContext {
  _services: OnboardingServices;
}

export const onboardingMachine = setup({
  types: {
    context: {} as InternalContext,
    events: {} as OnboardingEvent,
    input: {} as { services: OnboardingServices },
  },
  actors: {
    checkSession: fromPromise(
      async ({ input }: { input: { services: OnboardingServices } }) =>
        input.services.checkSession(),
    ),
  },
  delays: {
    BEAT_DELAY: BEAT_MS,
  },
}).createMachine({
  id: 'onboarding',
  initial: 'SPLASH',
  context: ({ input }) => ({
    _services: input.services,
    userId: null,
    consentRecordId: null,
    childProfileId: null,
    micPermission: 'unknown' as const,
    loginError: null,
    introDemoBeat: 0,
  }),
  states: {
    // ── SPLASH ───────────────────────────────────────────────────────────────
    // Reads session token and routes. Analytics: app_open (§3.1).
    SPLASH: {
      invoke: {
        src: 'checkSession',
        input: ({ context }) => ({ services: context._services }),
        onDone: [
          {
            guard: ({ event }) =>
              Boolean(event.output?.valid && event.output?.hasChildProfile),
            target: 'COMPLETED',
          },
          { target: 'WELCOME' },
        ],
        onError: { target: 'WELCOME' },
      },
      on: {
        SESSION_VALID: 'COMPLETED',
        NO_SESSION: 'WELCOME',
      },
    },

    // ── WELCOME ──────────────────────────────────────────────────────────────
    WELCOME: {
      on: {
        TAP_NEXT: {
          target: 'INTRO_DEMO',
          // Reset beat counter on fresh entry from WELCOME so reenter
          // transitions don't see a stale value from a prior demo run.
          actions: assign({ introDemoBeat: 0 }),
        },
        RETURNING_USER: 'LOGIN',
      },
    },

    // ── INTRO_DEMO ───────────────────────────────────────────────────────────
    // 4 beats × BEAT_MS. Delayed self-transition increments beat until complete.
    // No entry action — beat is reset by WELCOME.TAP_NEXT so reentries don't clobber it.
    INTRO_DEMO: {
      after: {
        BEAT_DELAY: [
          {
            guard: ({ context }) => context.introDemoBeat < BEAT_COUNT - 1,
            actions: assign({ introDemoBeat: ({ context }) => context.introDemoBeat + 1 }),
            target: 'INTRO_DEMO',
            reenter: true,
          },
          { target: 'TRUST' },
        ],
      },
    },

    // ── TRUST ────────────────────────────────────────────────────────────────
    TRUST: {
      on: { TAP_NEXT: 'COPPA_CONSENT' },
    },

    // ── COPPA_CONSENT ────────────────────────────────────────────────────────
    // Legal requirement (sys-16). POST /v1/coppa/consent on grant.
    // Decline → ABANDONED (plan §3.1 §5).
    COPPA_CONSENT: {
      on: {
        CONSENT_GRANTED: {
          target: 'MIC_PERMISSION',
          actions: assign({
            consentRecordId: ({ event }) => event.consentRecordId,
          }),
        },
        CONSENT_DECLINED: 'ABANDONED',
      },
    },

    // ── MIC_PERMISSION ───────────────────────────────────────────────────────
    // granted/denied both → LOGIN (denied shows warning).
    // permanently_denied → MIC_FALLBACK_BLOCKED (plan §3.1 §4.1).
    MIC_PERMISSION: {
      on: {
        MIC_GRANTED: {
          target: 'LOGIN',
          actions: assign({ micPermission: 'granted' as const }),
        },
        MIC_DENIED: {
          target: 'LOGIN',
          actions: assign({ micPermission: 'denied' as const }),
        },
        MIC_PERMANENTLY_DENIED: {
          target: 'MIC_FALLBACK_BLOCKED',
          actions: assign({ micPermission: 'permanently_denied' as const }),
        },
      },
    },

    // ── LOGIN ────────────────────────────────────────────────────────────────
    // POST /v1/auth/login. Routes by child profile existence.
    LOGIN: {
      entry: assign({ loginError: null }),
      on: {
        AUTH_OK: [
          {
            guard: ({ event }) => !event.hasChildProfile,
            target: 'CHILD_PROFILE',
            actions: assign({ userId: ({ event }) => event.userId }),
          },
          {
            target: 'COMPLETED',
            actions: assign({
              userId: ({ event }) => event.userId,
              childProfileId: ({ event }) => event.childProfileId ?? null,
            }),
          },
        ],
        AUTH_FAIL: {
          target: 'LOGIN_ERROR',
          actions: assign({ loginError: ({ event }) => event.error }),
        },
        NETWORK_ERROR: {
          target: 'LOGIN_ERROR',
          actions: assign({ loginError: ({ event }) => event.error }),
        },
      },
    },

    // ── LOGIN_ERROR ──────────────────────────────────────────────────────────
    // Retry → LOGIN; Cancel → WELCOME (§3.1).
    LOGIN_ERROR: {
      on: {
        RETRY: 'LOGIN',
        CANCEL: 'WELCOME',
      },
    },

    // ── CHILD_PROFILE ────────────────────────────────────────────────────────
    // POST /v1/profiles/child.
    CHILD_PROFILE: {
      on: {
        PROFILE_CREATED: {
          target: 'COMPLETED',
          actions: assign({ childProfileId: ({ event }) => event.childProfileId }),
        },
      },
    },

    // ── COMPLETED ────────────────────────────────────────────────────────────
    // Terminal happy. Emits ONBOARDING_COMPLETED → DevicePairing.IDLE (plan §3.1).
    COMPLETED: { type: 'final' },

    // ── ABANDONED ────────────────────────────────────────────────────────────
    // Terminal — consent declined or pre-completion app kill (plan §3.1).
    ABANDONED: { type: 'final' },

    // ── MIC_FALLBACK_BLOCKED ─────────────────────────────────────────────────
    // Terminal — permanently denied. Deep-link to OS settings (§3.1).
    MIC_FALLBACK_BLOCKED: { type: 'final' },
  },
});
