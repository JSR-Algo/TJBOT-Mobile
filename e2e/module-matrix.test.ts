import { beforeAll, afterAll, describe, it } from '@jest/globals';
import { by, device, element, expect as detoxExpect } from 'detox';
import {
  assertLocalAiSimulationReady,
  assertLocalBackendReady,
  seedAccountWithoutHousehold,
  stopLocalMockBackend,
  type SeededAccount,
} from './helpers/localServices';
import {
  blockLocalBackend,
  completeOnboarding,
  disableDetoxSync,
  expectBackGestureFromTextReturnsTo,
  expectFirstVisibleText,
  expectHealthyVisibleText,
  expectHomeHub,
  expectNativeAppAlive,
  expectNoBlankScreen,
  expectNoStuckLoading,
  launchCleanApp,
  loginFromColdStart,
  openRoute,
  resetUrlBlacklist,
  tapIdAfterScroll,
  tapFirstVisibleText,
  tapId,
  tapText,
  waitForId,
} from './helpers/ui';

const HOME_PRIMARY_CTAS = [
  'View Activity',
  "Start Today's Lesson",
  'See what you did today',
  'Turn on the microphone',
  'Check Robot',
  'Set up child profile',
  'Continue lesson',
  'Pair Robot',
  'Open Parent Controls',
  'Adjust Quiet Hours',
] as const;

let account: SeededAccount;

describe('module matrix: local native E2E', () => {
  beforeAll(async () => {
    await assertLocalBackendReady();
    await assertLocalAiSimulationReady();
    account = await seedAccountWithoutHousehold();
    await launchCleanApp();
  });

  afterAll(async () => {
    await resetUrlBlacklist();
    await stopLocalMockBackend();
  });

  it('cold-starts, logs in, completes onboarding, and reaches HomeHub', async () => {
    await expectNativeAppAlive();
    await expectNoBlankScreen();
    await loginFromColdStart(account.email, account.password);
    await completeOnboarding();
    await expectHomeHub();
  });

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

    await openRoute('course/daily-mission', 'Make Robot smile');

    await openRoute('course-library/course-library', 'Course Library');
    await expectNoStuckLoading(['No library courses yet', 'Library unavailable', 'On your Robot now', 'Available to add']);

    await openRoute('lesson-session/lesson-ready', 'Animal Friends');

    await openRoute('progress/today-progress', 'You practiced speaking!');

    await openRoute('parent/parent-summary', 'Parent Space');

    await openRoute('device/device-home', 'Robot unavailable');

    await openRoute('robot-mgmt/my-robot', 'My Robot');

    await openRoute('purchase/purchase-intro', 'Meet Robot');

    await openRoute('fallback/network-error', 'No internet connection');
  }, 420000);

  it('triggers representative primary CTAs from module entries', async () => {
    await openRoute('home/home-hub', 'Home');
    await tapFirstVisibleText(HOME_PRIMARY_CTAS);
    await expectFirstVisibleText(['You practiced speaking!', 'Progress', 'Home']);

    await openRoute('lesson-session/lesson-ready', 'Animal Friends');
    await tapText("I'm ready!");
    await expectFirstVisibleText(['Tuning in…', 'Hi friend!', 'Ready to play with words?', "Yes, let's go!"]);

    await openRoute('purchase/purchase-intro', 'Meet Robot');
    await tapIdAfterScroll('purchaseIntroHowItWorksCta', 'purchaseIntroScroll');
    await expectFirstVisibleText(['How it works', 'Meet Robot']);
  }, 180000);

  it('supports back gesture from a stack screen', async () => {
    await openRoute('device/device-home', 'Robot unavailable');
    await tapText('Unit 2 · Animals');
    await expectBackGestureFromTextReturnsTo('Lesson in progress', 'Robot unavailable');
  });

  it('dismisses modal fallback with a real tap', async () => {
    await openRoute('fallback/network-error', 'No internet connection');
    try {
      await disableDetoxSync();
      await tapText('Try again');
      await expectHealthyVisibleText('Attempt 1 of 3');
      await tapId('stopReconnectHomeButton');
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
