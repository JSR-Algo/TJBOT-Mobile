import { createActor, SimulatedClock } from 'xstate';
import { ROUTE_MAP } from '@/navigation/routeMap';
import { ROUTES } from '@/navigation/routes';
import { devicePairingMachine } from '@/state/machines/devicePairing.machine';
import { createLessonSessionMachine, noopLessonSessionServices } from '@/state/machines/lessonSession.machine';
import { onboardingMachine } from '@/state/machines/onboarding.machine';
import type { OnboardingServices } from '@/state/machines/onboarding.types';
import { parentApprovalMachine } from '@/state/machines/parentApproval.machine';

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

  it('projects device pairing machine states to feature route state IDs only', () => {
    const actor = createActor(devicePairingMachine, { input: { userId: 'user-1' } });
    actor.start();
    const projections: Array<readonly [unknown, string]> = [[actor.getSnapshot().value, routeStateId(ROUTES.PairAddScreen)]];

    actor.send({ type: 'TAP_ADD' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairIntroScreen)]);
    actor.send({ type: 'TAP_START_SCAN' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairSearchScreen)]);
    actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-001', displayCode: '123456' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairFoundScreen)]);
    actor.send({ type: 'USER_MATCHES_CODE' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairWifiScreen)]);
    actor.send({ type: 'SSID_PICKED', ssid: 'Home' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairWifiPasswordScreen)]);
    actor.send({ type: 'PW_SUBMITTED', password: 'secret123' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairConnectingScreen)]);
    actor.send({ type: 'ROBOT_ACKS_CREDS' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairConnectingScreen)]);
    actor.send({ type: 'SERVER_CLAIM_OK', deviceId: 'device-1' });
    projections.push([actor.getSnapshot().value, routeStateId(ROUTES.PairSuccessScreen)]);

    expect(projections).toEqual([
      ['IDLE', 'dv_pair_add'],
      ['AWAITING_ROBOT', 'dv_pair_intro'],
      ['SCANNING', 'dv_pair_search'],
      ['DEVICE_FOUND', 'dv_pair_found'],
      ['AWAITING_WIFI', 'dv_pair_wifi'],
      ['AWAITING_WIFI_PW', 'dv_pair_wifi_pw'],
      ['PROVISIONING', 'dv_pair_connecting'],
      ['CLAIM_PENDING', 'dv_pair_connecting'],
      ['CLAIMED', 'dv_pair_success'],
    ]);
    actor.stop();
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
