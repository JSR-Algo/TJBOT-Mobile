import { beforeAll, afterAll, afterEach, describe, it } from '@jest/globals';
import { by, device, element, expect as detoxExpect } from 'detox';
import {
  assertLocalAiSimulationReady,
  assertLocalBackendReady,
  seedAccountWithoutHousehold,
  stopLocalMockAi,
  stopLocalMockBackend,
  type SeededAccount,
} from './helpers/localServices';
import {
  blockLocalBackend,
  completeOnboarding,
  disableDetoxSync,
  expectHealthyVisibleText,
  expectHomeHub,
  expectNativeAppAlive,
  expectNoBlankScreen,
  expectNoStuckLoading,
  launchCleanApp,
  loginFromColdStart,
  openRoute,
  openRouteToAnyText,
  openRouteToId,
  resetUrlBlacklist,
  tapIdAfterScroll,
  tapId,
  tapLabel,
  waitForId,
} from './helpers/ui';

let account: SeededAccount;
let homeSessionReady = false;

describe('module matrix: local native E2E', () => {
  beforeAll(async () => {
    await assertLocalBackendReady();
    await assertLocalAiSimulationReady();
    account = await seedAccountWithoutHousehold();
    await launchCleanApp();
  });

  afterAll(async () => {
    await resetUrlBlacklist();
    await stopLocalMockAi();
    await stopLocalMockBackend();
  });

  afterEach(async () => {
    if (!homeSessionReady) return;
    await resetUrlBlacklist();
    await device.launchApp({ newInstance: true });
    await waitForId('homeTab', 30000);
  });

  it('cold-starts, logs in, completes onboarding, and reaches HomeHub', async () => {
    await expectNativeAppAlive();
    await expectNoBlankScreen();
    await loginFromColdStart(account.email, account.password);
    await completeOnboarding();
    await expectHomeHub();
    homeSessionReady = true;
  }, 300000);

  it('navigates every protected tab without blank screens or route errors', async () => {
    await tapId('homeTab');
    await detoxExpect(element(by.id('homeTab'))).toBeVisible();
    await expectNoBlankScreen();

    await tapId('devicesTab');
    await detoxExpect(element(by.id('devicesTab'))).toBeVisible();
    await expectNoBlankScreen();

    await tapId('libraryTab');
    await detoxExpect(element(by.id('libraryTab'))).toBeVisible();
    await expectNoBlankScreen();

    await tapId('progressTab');
    await detoxExpect(element(by.id('progressTab'))).toBeVisible();
    await expectNoBlankScreen();

    await tapId('profileTab');
    await detoxExpect(element(by.id('profileTab'))).toBeVisible();
    await expectNoBlankScreen();

    await waitForId('homeTab');
  });

  it('opens module entry screens without blank screens', async () => {
    await openRoute('home/home-hub', 'Home');

    await openRouteToId('course/daily-mission', 'dailyMissionScreen');

    await openRoute('course-library/course-library', 'Course Library');
    await expectNoStuckLoading(['No library courses yet', 'Library unavailable', 'On your Robot now', 'Available to add']);

    await openRouteToId('course-library/send-to-robot', 'sendToRobotScreen');

    await openRouteToAnyText('progress/today-progress', [
      'You practiced speaking!',
      'No practice yet',
      'No lessons yet',
      'Progress unavailable',
    ]);

    await openRoute('parent/parent-summary', 'Parent Space');

    await openRoute('device/device-home', 'No Robot connected');

    await openRoute('robot-mgmt/my-robot', 'My Robot');

    await openRoute('purchase/purchase-intro', 'Built for spoken English');

    await openRoute('fallback/network-error', 'No internet connection');
  }, 420000);

  it('triggers representative primary CTAs from module entries', async () => {
    await openRoute('home/home-hub', 'Home');
    await waitForId('homePrimaryCta');

    await openRouteToId('course/daily-mission', 'dailyMissionScreen');
    await tapIdAfterScroll('dailyMissionContinueCta', 'dailyMissionScreen');
    await waitForId('sendToRobotScreen', 30000);

    await device.launchApp({ newInstance: true });
    await waitForId('homeTab', 30000);
    await openRouteToId('purchase/purchase-intro', 'purchaseIntroScreen');
    await tapIdAfterScroll('purchaseIntroHowItWorksCta', 'purchaseIntroDeviceShellScroll');
    await waitForId('howItWorksScreen');
    await device.launchApp({ newInstance: true });
    await waitForId('homeTab', 30000);
  }, 180000);

  it('supports back navigation from a stack screen', async () => {
    await openRoute('home/home-hub', 'Home');
    await openRouteToId('course/daily-mission', 'dailyMissionScreen');
    await tapLabel('Back');
    await expectHealthyVisibleText('Home');
  });

  it('dismisses modal fallback with a real tap', async () => {
    await openRouteToId('fallback/network-error', 'networkErrorRetryCta');
    try {
      await disableDetoxSync();
      await tapId('networkErrorRetryCta');
      await waitForId('reconnectingOverlay');
      await tapId('reconnectingStopHomeCta');
    } finally {
      await disableDetoxSync();
    }
    await expectHomeHub();
  });

  it('renders offline/error fallback instead of hanging beyond 10 seconds', async () => {
    await blockLocalBackend();
    await openRoute('course/course', 'English with Robot');
    await expectNoStuckLoading(['Course catalog offline', 'Courses unavailable', 'Course refresh timed out'], 30000);
    await resetUrlBlacklist();
  });

  it('keeps the native app alive after module coverage', async () => {
    await resetUrlBlacklist();
    await openRoute('home/home-hub', 'Home');
    await device.reloadReactNative();
    await expectNativeAppAlive();
    await waitForId('homeTab', 30000);
    await detoxExpect(element(by.id('homeTab'))).toBeVisible();
  });
});
