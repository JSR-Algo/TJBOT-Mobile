import { createActor, SimulatedClock } from 'xstate';
import { onboardingMachine } from '../../../src/state/machines/onboarding.machine';
import type { OnboardingServices } from '../../../src/state/machines/onboarding.types';

// ── Stub services ─────────────────────────────────────────────────────────────
const makeServices = (overrides: Partial<OnboardingServices> = {}): OnboardingServices => ({
  checkSession: async () => ({ valid: false }),
  recordCoppaConsent: async () => ({ id: 'consent-1' }),
  login: async () => ({ userId: 'user-1', hasChildProfile: false }),
  createChildProfile: async () => ({ id: 'child-1' }),
  ...overrides,
});

// Never-resolving checkSession — lets tests drive via NO_SESSION/SESSION_VALID events
const pendingServices = makeServices({ checkSession: () => new Promise(() => {}) });

function makeActor(services: OnboardingServices = pendingServices, clock?: SimulatedClock) {
  return createActor(onboardingMachine, {
    input: { services },
    ...(clock ? { clock } : {}),
  });
}

// Drive from SPLASH to WELCOME via event (no async needed)
function driveToWelcome(actor: ReturnType<typeof makeActor>) {
  actor.start();
  expect(actor.getSnapshot().value).toBe('SPLASH');
  actor.send({ type: 'NO_SESSION' });
  expect(actor.getSnapshot().value).toBe('WELCOME');
}

// Drive to COPPA_CONSENT using SimulatedClock for INTRO_DEMO beats.
// Each clock.increment(2500) fires exactly one beat's timer and re-arms the next.
// Four sequential increments are required because each new timer registers at
// the current _now so a single large increment only fires the first one.
function driveToCoppaConsent(actor: ReturnType<typeof makeActor>, clock: SimulatedClock) {
  driveToWelcome(actor);
  actor.send({ type: 'TAP_NEXT' }); // → INTRO_DEMO
  expect(actor.getSnapshot().value).toBe('INTRO_DEMO');
  clock.increment(2500); // beat 0 → 1
  clock.increment(2500); // beat 1 → 2
  clock.increment(2500); // beat 2 → 3
  clock.increment(2500); // beat 3 → TRUST
  expect(actor.getSnapshot().value).toBe('TRUST');
  actor.send({ type: 'TAP_NEXT' }); // → COPPA_CONSENT
  expect(actor.getSnapshot().value).toBe('COPPA_CONSENT');
}

// Drive to LOGIN
function driveToLogin(actor: ReturnType<typeof makeActor>, clock: SimulatedClock) {
  driveToCoppaConsent(actor, clock);
  actor.send({ type: 'CONSENT_GRANTED', consentRecordId: 'c1' });
  expect(actor.getSnapshot().value).toBe('MIC_PERMISSION');
  actor.send({ type: 'MIC_GRANTED' });
  expect(actor.getSnapshot().value).toBe('LOGIN');
}

// ── Happy path ────────────────────────────────────────────────────────────────
describe('Onboarding — happy path', () => {
  it('full path: SPLASH → WELCOME → INTRO_DEMO → TRUST → COPPA_CONSENT → MIC_PERMISSION → LOGIN → CHILD_PROFILE → COMPLETED', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToLogin(actor, clock);

    actor.send({ type: 'AUTH_OK', userId: 'user-1', hasChildProfile: false });
    expect(actor.getSnapshot().value).toBe('CHILD_PROFILE');
    expect(actor.getSnapshot().context.userId).toBe('user-1');

    actor.send({ type: 'PROFILE_CREATED', childProfileId: 'child-1' });
    expect(actor.getSnapshot().value).toBe('COMPLETED');
    expect(actor.getSnapshot().context.childProfileId).toBe('child-1');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('AUTH_OK with existing child skips CHILD_PROFILE → COMPLETED', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToLogin(actor, clock);
    actor.send({ type: 'AUTH_OK', userId: 'u1', hasChildProfile: true, childProfileId: 'ch1' });
    expect(actor.getSnapshot().value).toBe('COMPLETED');
    expect(actor.getSnapshot().context.childProfileId).toBe('ch1');
    expect(actor.getSnapshot().status).toBe('done');
  });
});

// ── SPLASH async invoke paths ─────────────────────────────────────────────────
describe('SPLASH invoke (async checkSession)', () => {
  it('resolves valid+hasChild → COMPLETED', async () => {
    const actor = makeActor(
      makeServices({ checkSession: async () => ({ valid: true, hasChildProfile: true }) }),
    );
    actor.start();
    await new Promise<void>((r) => setTimeout(r, 10));
    expect(actor.getSnapshot().value).toBe('COMPLETED');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('resolves valid+noChild → WELCOME', async () => {
    const actor = makeActor(
      makeServices({ checkSession: async () => ({ valid: true, hasChildProfile: false }) }),
    );
    actor.start();
    await new Promise<void>((r) => setTimeout(r, 10));
    expect(actor.getSnapshot().value).toBe('WELCOME');
  });

  it('resolves invalid session → WELCOME', async () => {
    const actor = makeActor(
      makeServices({ checkSession: async () => ({ valid: false }) }),
    );
    actor.start();
    await new Promise<void>((r) => setTimeout(r, 10));
    expect(actor.getSnapshot().value).toBe('WELCOME');
  });
});

// ── SPLASH event-driven bypass ────────────────────────────────────────────────
describe('SPLASH bypass via events', () => {
  it('SESSION_VALID event → COMPLETED', () => {
    const actor = makeActor();
    actor.start();
    actor.send({ type: 'SESSION_VALID' });
    expect(actor.getSnapshot().value).toBe('COMPLETED');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('NO_SESSION event → WELCOME', () => {
    const actor = makeActor();
    actor.start();
    actor.send({ type: 'NO_SESSION' });
    expect(actor.getSnapshot().value).toBe('WELCOME');
  });
});

// ── RETURNING_USER ────────────────────────────────────────────────────────────
describe('RETURNING_USER', () => {
  it('WELCOME → LOGIN via RETURNING_USER', () => {
    const actor = makeActor();
    actor.start();
    actor.send({ type: 'NO_SESSION' }); // → WELCOME
    actor.send({ type: 'RETURNING_USER' });
    expect(actor.getSnapshot().value).toBe('LOGIN');
  });
});

// ── INTRO_DEMO timer (SimulatedClock) ─────────────────────────────────────────
describe('INTRO_DEMO auto-advance', () => {
  it('starts at beat 0 on entry', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToWelcome(actor);
    actor.send({ type: 'TAP_NEXT' });
    expect(actor.getSnapshot().value).toBe('INTRO_DEMO');
    expect(actor.getSnapshot().context.introDemoBeat).toBe(0);
  });

  it('advances beat counter one step per 2500ms increment', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToWelcome(actor);
    actor.send({ type: 'TAP_NEXT' }); // → INTRO_DEMO
    expect(actor.getSnapshot().context.introDemoBeat).toBe(0);

    clock.increment(2500); // fires beat 0 timer → beat 1
    expect(actor.getSnapshot().context.introDemoBeat).toBe(1);

    clock.increment(2500); // fires beat 1 timer → beat 2
    expect(actor.getSnapshot().context.introDemoBeat).toBe(2);

    clock.increment(2500); // fires beat 2 timer → beat 3
    expect(actor.getSnapshot().context.introDemoBeat).toBe(3);

    // beat 3 is last (BEAT_COUNT-1=3), guard false → TRUST
    clock.increment(2500);
    expect(actor.getSnapshot().value).toBe('TRUST');
  });

  it('advances all 4 beats via four sequential 2500ms increments', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToWelcome(actor);
    actor.send({ type: 'TAP_NEXT' }); // → INTRO_DEMO
    clock.increment(2500);
    clock.increment(2500);
    clock.increment(2500);
    clock.increment(2500);
    expect(actor.getSnapshot().value).toBe('TRUST');
  });
});

// ── COPPA decline → ABANDONED ─────────────────────────────────────────────────
describe('COPPA consent decline', () => {
  it('CONSENT_DECLINED → ABANDONED (terminal)', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToCoppaConsent(actor, clock);
    actor.send({ type: 'CONSENT_DECLINED' });
    expect(actor.getSnapshot().value).toBe('ABANDONED');
    expect(actor.getSnapshot().status).toBe('done');
  });
});

// ── MIC_PERMISSION ────────────────────────────────────────────────────────────
describe('MIC_PERMISSION', () => {
  it('MIC_PERMANENTLY_DENIED → MIC_FALLBACK_BLOCKED (terminal)', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToCoppaConsent(actor, clock);
    actor.send({ type: 'CONSENT_GRANTED', consentRecordId: 'c1' });
    expect(actor.getSnapshot().value).toBe('MIC_PERMISSION');
    actor.send({ type: 'MIC_PERMANENTLY_DENIED' });
    expect(actor.getSnapshot().value).toBe('MIC_FALLBACK_BLOCKED');
    expect(actor.getSnapshot().context.micPermission).toBe('permanently_denied');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('MIC_DENIED (not permanent) → LOGIN with micPermission=denied', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToCoppaConsent(actor, clock);
    actor.send({ type: 'CONSENT_GRANTED', consentRecordId: 'c1' });
    actor.send({ type: 'MIC_DENIED' });
    expect(actor.getSnapshot().value).toBe('LOGIN');
    expect(actor.getSnapshot().context.micPermission).toBe('denied');
  });
});

// ── LOGIN error flow ──────────────────────────────────────────────────────────
describe('LOGIN error flow', () => {
  it('AUTH_FAIL → LOGIN_ERROR with error message', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToLogin(actor, clock);
    actor.send({ type: 'AUTH_FAIL', error: 'Invalid credentials' });
    expect(actor.getSnapshot().value).toBe('LOGIN_ERROR');
    expect(actor.getSnapshot().context.loginError).toBe('Invalid credentials');
  });

  it('NETWORK_ERROR → LOGIN_ERROR', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToLogin(actor, clock);
    actor.send({ type: 'NETWORK_ERROR', error: 'Network timeout' });
    expect(actor.getSnapshot().value).toBe('LOGIN_ERROR');
    expect(actor.getSnapshot().context.loginError).toBe('Network timeout');
  });

  it('LOGIN_ERROR → RETRY → LOGIN (loginError cleared)', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToLogin(actor, clock);
    actor.send({ type: 'AUTH_FAIL', error: 'Bad creds' });
    actor.send({ type: 'RETRY' });
    expect(actor.getSnapshot().value).toBe('LOGIN');
    expect(actor.getSnapshot().context.loginError).toBeNull();
  });

  it('LOGIN_ERROR → CANCEL → WELCOME', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToLogin(actor, clock);
    actor.send({ type: 'AUTH_FAIL', error: 'Bad creds' });
    actor.send({ type: 'CANCEL' });
    expect(actor.getSnapshot().value).toBe('WELCOME');
  });
});

// ── Invalid transitions (plan §5) ─────────────────────────────────────────────
describe('Invalid transitions blocked (plan §5)', () => {
  it('SPLASH cannot jump to COMPLETED via unrelated event', () => {
    const actor = makeActor();
    actor.start();
    expect(actor.getSnapshot().value).toBe('SPLASH');
    actor.send({ type: 'PROFILE_CREATED', childProfileId: 'skip' });
    expect(actor.getSnapshot().value).toBe('SPLASH');
  });

  it('COPPA_CONSENT ignores PROFILE_CREATED (no bypass to CHILD_PROFILE)', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToCoppaConsent(actor, clock);
    actor.send({ type: 'PROFILE_CREATED', childProfileId: 'bypass' });
    expect(actor.getSnapshot().value).toBe('COPPA_CONSENT');
    expect(actor.getSnapshot().context.childProfileId).toBeNull();
  });

  it('terminal COMPLETED ignores further events', () => {
    const actor = makeActor();
    actor.start();
    actor.send({ type: 'SESSION_VALID' }); // → COMPLETED
    expect(actor.getSnapshot().value).toBe('COMPLETED');
    actor.send({ type: 'TAP_NEXT' });
    expect(actor.getSnapshot().value).toBe('COMPLETED');
  });

  it('terminal ABANDONED ignores further events', () => {
    const clock = new SimulatedClock();
    const actor = makeActor(pendingServices, clock);
    driveToWelcome(actor);
    actor.send({ type: 'TAP_NEXT' }); // → INTRO_DEMO
    clock.increment(2500);
    clock.increment(2500);
    clock.increment(2500);
    clock.increment(2500); // → TRUST
    actor.send({ type: 'TAP_NEXT' }); // → COPPA_CONSENT
    actor.send({ type: 'CONSENT_DECLINED' }); // → ABANDONED
    expect(actor.getSnapshot().value).toBe('ABANDONED');
    actor.send({ type: 'TAP_NEXT' });
    expect(actor.getSnapshot().value).toBe('ABANDONED');
  });

  it('consentRecordId not set when COPPA not granted', () => {
    const actor = makeActor();
    actor.start();
    expect(actor.getSnapshot().context.consentRecordId).toBeNull();
    actor.send({ type: 'SESSION_VALID' });
    expect(actor.getSnapshot().context.consentRecordId).toBeNull();
  });
});
