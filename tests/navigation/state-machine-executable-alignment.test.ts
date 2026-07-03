import { createActor, SimulatedClock } from 'xstate';
import { ROUTE_MAP } from '@/navigation/routeMap';
import { ROUTES } from '@/navigation/routes';
import { createLessonSessionMachine, noopLessonSessionServices } from '@/state/machines/lessonSession.machine';
import { onboardingMachine } from '@/state/machines/onboarding.machine';
import type { OnboardingServices } from '@/state/machines/onboarding.types';
import { parentApprovalMachine } from '@/state/machines/parentApproval.machine';
import * as stateMachineExports from '@/state/machines';

function routeStateId(route: keyof typeof ROUTE_MAP): string {
  const stateMachineId = Reflect.get(ROUTE_MAP[route], 'stateMachineId');
  if (typeof stateMachineId !== 'string') {
    throw new Error(`${route} is missing a stateMachineId`);
  }
  return stateMachineId;
}

function lessonPath(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const [parent] = Object.keys(value);
    const child = (value as Record<string, string>)[parent];
    return `${parent}.${child}`;
  }
  return String(value);
}

const pendingOnboardingServices: OnboardingServices = {
  checkSession: () => new Promise(() => undefined),
  recordCoppaConsent: async () => ({ id: 'consent-1' }),
  login: async () => ({ userId: 'user-1', hasChildProfile: false }),
  createChildProfile: async () => ({ id: 'child-1' }),
};

describe('executable state-machine route alignment', () => {
  it('does not expose device pairing as a separate executable XState machine', () => {
    expect(Object.keys(stateMachineExports).filter((key) => key.includes('DevicePairing') || key.includes('devicePairing'))).toEqual([]);
  });

  it('projects onboarding machine states to feature route state IDs only', () => {
    const clock = new SimulatedClock();
    const actor = createActor(onboardingMachine, {
      input: { services: pendingOnboardingServices },
      clock,
    });
    actor.start();

    const statesByStep = [
      [actor.getSnapshot().value, routeStateId(ROUTES.SplashScreen)],
    ];
    actor.send({ type: 'NO_SESSION' });
    statesByStep.push([actor.getSnapshot().value, routeStateId(ROUTES.WelcomeScreen)]);
    actor.send({ type: 'TAP_NEXT' });
    statesByStep.push([actor.getSnapshot().value, routeStateId(ROUTES.IntroListenScreen)]);
    clock.increment(2500);
    clock.increment(2500);
    clock.increment(2500);
    clock.increment(2500);
    statesByStep.push([actor.getSnapshot().value, routeStateId(ROUTES.TrustScreen)]);
    actor.send({ type: 'TAP_NEXT' });
    expect(actor.getSnapshot().value).toBe('COPPA_CONSENT');
    actor.send({ type: 'CONSENT_GRANTED', consentRecordId: 'consent-1' });
    statesByStep.push([actor.getSnapshot().value, routeStateId(ROUTES.MicAskScreen)]);
    actor.send({ type: 'MIC_GRANTED' });
    statesByStep.push([actor.getSnapshot().value, routeStateId(ROUTES.LoginScreen)]);
    actor.send({ type: 'AUTH_OK', userId: 'user-1', hasChildProfile: false });
    statesByStep.push([actor.getSnapshot().value, routeStateId(ROUTES.ChildProfileScreen)]);

    expect(statesByStep).toEqual([
      ['SPLASH', 'onb_splash'],
      ['WELCOME', 'onb_welcome'],
      ['INTRO_DEMO', 'onb_intro_listen'],
      ['TRUST', 'onb_trust'],
      ['MIC_PERMISSION', 'onb_mic'],
      ['LOGIN', 'onb_login'],
      ['CHILD_PROFILE', 'onb_child'],
    ]);
    actor.stop();
  });

  it('maps runtime device pairing screens to route state IDs without a parallel machine', () => {
    expect([
      [ROUTES.PairAddScreen, routeStateId(ROUTES.PairAddScreen)],
      [ROUTES.PairIntroScreen, routeStateId(ROUTES.PairIntroScreen)],
      [ROUTES.PairSearchScreen, routeStateId(ROUTES.PairSearchScreen)],
      [ROUTES.PairFoundScreen, routeStateId(ROUTES.PairFoundScreen)],
      [ROUTES.PairQrScanScreen, routeStateId(ROUTES.PairQrScanScreen)],
      [ROUTES.PairCodeScreen, routeStateId(ROUTES.PairCodeScreen)],
      [ROUTES.PairWifiScreen, routeStateId(ROUTES.PairWifiScreen)],
      [ROUTES.PairWifiPasswordScreen, routeStateId(ROUTES.PairWifiPasswordScreen)],
      [ROUTES.PairConnectingScreen, routeStateId(ROUTES.PairConnectingScreen)],
      [ROUTES.PairSuccessScreen, routeStateId(ROUTES.PairSuccessScreen)],
      [ROUTES.PairRenameScreen, routeStateId(ROUTES.PairRenameScreen)],
      [ROUTES.PairFailedScreen, routeStateId(ROUTES.PairFailedScreen)],
    ]).toEqual([
      [ROUTES.PairAddScreen, 'dv_pair_add'],
      [ROUTES.PairIntroScreen, 'dv_pair_intro'],
      [ROUTES.PairSearchScreen, 'dv_pair_search'],
      [ROUTES.PairFoundScreen, 'dv_pair_found'],
      [ROUTES.PairQrScanScreen, 'dv_pair_qr_scan'],
      [ROUTES.PairCodeScreen, 'dv_pair_code'],
      [ROUTES.PairWifiScreen, 'dv_pair_wifi'],
      [ROUTES.PairWifiPasswordScreen, 'dv_pair_wifi_pw'],
      [ROUTES.PairConnectingScreen, 'dv_pair_connecting'],
      [ROUTES.PairSuccessScreen, 'dv_pair_success'],
      [ROUTES.PairRenameScreen, 'dv_pair_rename'],
      [ROUTES.PairFailedScreen, 'dv_pair_failed'],
    ]);
  });

  it('projects lesson-session machine states and interrupt reasons to feature route state IDs only', () => {
    const actor = createActor(createLessonSessionMachine(noopLessonSessionServices));
    actor.start();
    actor.send({ type: 'START_SESSION', idempotencyKey: 'key-1' });
    const projections: Array<readonly [unknown, string]> = [[lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.ConnectingScreen)]];

    actor.send({ type: 'SESSION_STARTED', sessionId: 'session-1', deviceSessionId: 'device-session-1' });
    projections.push([lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.GreetingScreen)]);
    actor.send({ type: 'GREETING_DONE' });
    projections.push([lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.ActivityIntroScreen)]);
    actor.send({ type: 'INTRO_DONE' });
    projections.push([lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.RobotSpeakingScreen)]);
    actor.send({ type: 'REPLY_READY' });
    projections.push([lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.RobotListeningScreen)]);
    actor.send({ type: 'VAD_SPEECH' });
    projections.push([lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.UserSpeakingScreen)]);
    actor.send({ type: 'VAD_END' });
    projections.push([lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.ThinkingScreen)]);
    actor.send({ type: 'INTERRUPT', reason: 'bargein' });
    projections.push([lessonPath(actor.getSnapshot().value), routeStateId(ROUTES.BargeinScreen)]);

    expect(projections).toEqual([
      ['CONNECTING', 'connecting'],
      ['ACTIVE.GREETING', 'greeting'],
      ['ACTIVE.ACTIVITY_INTRO', 'activity_intro'],
      ['ACTIVE.ROBOT_SPEAKING', 'robot_speaking'],
      ['ACTIVE.ROBOT_LISTENING', 'robot_listening'],
      ['ACTIVE.USER_SPEAKING', 'user_speaking'],
      ['ACTIVE.THINKING', 'thinking'],
      ['INTERRUPTED', 'bargein'],
    ]);
    actor.stop();
  });

  it('projects parent approval machine states to feature route state IDs only', () => {
    const actor = createActor(parentApprovalMachine);
    actor.start();
    const projections: Array<readonly [unknown, string]> = [[actor.getSnapshot().value, routeStateId(ROUTES.ParentGateScreen)]];

    actor.send({ type: 'TAP_PARENT_ICON' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.ParentGateScreen)]);
    actor.send({ type: 'LOCKOUT_TRIGGERED', lockedUntil: '2026-05-14T00:00:00Z' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.ParentLockedOutScreen)]);
    actor.send({ type: 'LOCKOUT_CLEARED' });
    actor.send({ type: 'TAP_PARENT_ICON' });
    actor.send({
      type: 'PIN_OK',
      jti: 'jti-1',
      expiresAt: '2026-05-14T01:00:00Z',
      idleUntil: '2026-05-14T00:30:00Z',
    });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.ParentSummaryScreen)]);

    expect(projections).toEqual([
      ['LOCKED', 'parent_gate'],
      ['GATE_PROMPT', 'parent_gate'],
      ['GATE_LOCKED_OUT', 'parent_locked_out'],
      [{ VIEWING_DASHBOARD: 'SUMMARY' }, 'parent_summary'],
    ]);
    actor.stop();
  });
});
