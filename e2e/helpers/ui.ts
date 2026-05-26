import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

const SCREEN_TIMEOUT_MS = 10000;
const COLD_START_TIMEOUT_MS = 30000;
const NON_BLANK_SENTINELS = [
  'Get started',
  "Hi! I'm Robot.",
  'A grown-up sets things up the first time.',
  'Log in',
  'Home',
  'Robot unavailable',
  'Course Library',
  'Parent Space',
  'Meet Robot',
  'No internet connection',
  'Attempt 1 of 3',
] as const;
const NON_BLANK_TEST_IDS = [
  'welcomeScreen',
  'emailInput',
  'childProfileSaveButton',
  'homeTab',
  'mainTabs',
  'root-error-boundary-restart',
] as const;

export async function launchCleanApp(): Promise<void> {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: {
      notifications: 'YES',
      microphone: 'YES',
    },
  });
}

export async function waitForId(id: string, timeout = SCREEN_TIMEOUT_MS): Promise<void> {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

export async function waitForText(text: string, timeout = SCREEN_TIMEOUT_MS): Promise<void> {
  try {
    await waitFor(element(by.text(text))).toBeVisible().withTimeout(timeout);
  } catch {
    await waitFor(element(by.label(text))).toBeVisible().withTimeout(timeout);
  }
}

export async function expectNoBlankScreen(visibleText?: string, timeout = SCREEN_TIMEOUT_MS): Promise<void> {
  if (visibleText) {
    await waitForText(visibleText, timeout);
    return;
  }
  try {
    await waitForId('mainTabs', 1000);
    return;
  } catch {
    try {
      await expectFirstVisibleId(NON_BLANK_TEST_IDS, timeout);
      return;
    } catch {
      await expectFirstVisibleText(NON_BLANK_SENTINELS, timeout);
    }
  }
}

export async function expectNoStuckLoading(sentinels: readonly string[], timeout = SCREEN_TIMEOUT_MS): Promise<string> {
  return expectFirstVisibleText(sentinels, timeout);
}

export async function expectNativeAppAlive(): Promise<void> {
  await expectNoBlankScreen(undefined, COLD_START_TIMEOUT_MS);
}

export async function tapText(text: string, index = 0): Promise<void> {
  try {
    const target = element(by.text(text)).atIndex(index);
    await waitFor(target).toBeVisible().withTimeout(SCREEN_TIMEOUT_MS);
    await target.tap();
  } catch {
    const target = element(by.label(text)).atIndex(index);
    await waitFor(target).toBeVisible().withTimeout(SCREEN_TIMEOUT_MS);
    await target.tap();
  }
}

export async function tapTextIfVisible(text: string, timeout = 1500, index = 0): Promise<boolean> {
  try {
    const target = element(by.text(text)).atIndex(index);
    await waitFor(target).toBeVisible().withTimeout(timeout);
    await target.tap();
    return true;
  } catch {
    try {
      const target = element(by.label(text)).atIndex(index);
      await waitFor(target).toBeVisible().withTimeout(timeout);
      await target.tap();
      return true;
    } catch {
      return false;
    }
  }
}

export async function tapTextAfterScroll(text: string): Promise<void> {
  const target = element(by.text(text)).atIndex(0);
  await waitFor(target)
    .toBeVisible()
    .whileElement(by.id('onboardingScroll'))
    .scroll(260, 'down');
  await target.tap();
}

export async function tapIdAfterScroll(id: string, scrollId = 'onboardingScroll'): Promise<void> {
  const target = element(by.id(id));
  await waitFor(target)
    .toBeVisible()
    .whileElement(by.id(scrollId))
    .scroll(260, 'down');
  await target.tap();
}

export async function tapFirstVisibleText(labels: readonly string[]): Promise<string> {
  for (const label of labels) {
    try {
      const target = element(by.text(label)).atIndex(0);
      await waitFor(target).toBeVisible().withTimeout(1000);
      await target.tap();
      return label;
    } catch {
      try {
        const target = element(by.label(label)).atIndex(0);
        await waitFor(target).toBeVisible().withTimeout(1000);
        await target.tap();
        return label;
      } catch {
        continue;
      }
    }
  }
  throw new Error(`None of these labels were visible: ${labels.join(', ')}`);
}

export async function expectFirstVisibleText(labels: readonly string[], timeout = SCREEN_TIMEOUT_MS): Promise<string> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const label of labels) {
      try {
        const target = element(by.text(label)).atIndex(0);
        await waitFor(target).toBeVisible().withTimeout(500);
        await detoxExpect(target).toBeVisible();
        return label;
      } catch {
        try {
          const target = element(by.label(label)).atIndex(0);
          await waitFor(target).toBeVisible().withTimeout(500);
          await detoxExpect(target).toBeVisible();
          return label;
        } catch {
          continue;
        }
      }
    }
  }
  throw new Error(`None of these labels became visible: ${labels.join(', ')}`);
}

export async function expectFirstVisibleId(ids: readonly string[], timeout = SCREEN_TIMEOUT_MS): Promise<string> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const id of ids) {
      try {
        const target = element(by.id(id));
        await waitFor(target).toBeVisible().withTimeout(500);
        await detoxExpect(target).toBeVisible();
        return id;
      } catch {
        continue;
      }
    }
  }
  throw new Error(`None of these testIDs became visible: ${ids.join(', ')}`);
}

export async function tapId(id: string): Promise<void> {
  const target = element(by.id(id));
  await waitFor(target).toBeVisible().withTimeout(SCREEN_TIMEOUT_MS);
  await target.tap();
}

export async function tapLabel(label: string): Promise<void> {
  const target = element(by.label(label));
  await waitFor(target).toBeVisible().withTimeout(SCREEN_TIMEOUT_MS);
  await target.tap();
}

export async function typeIntoId(id: string, value: string): Promise<void> {
  const target = element(by.id(id));
  await waitFor(target).toBeVisible().withTimeout(SCREEN_TIMEOUT_MS);
  await target.tap();
  await target.replaceText(value);
}

export async function loginFromColdStart(email: string, password: string): Promise<void> {
  await expectNativeAppAlive();
  try {
    await waitForId('emailInput', 2000);
  } catch {
    await waitForText('Get started', COLD_START_TIMEOUT_MS);
    await tapText('Get started');
    await tapText('Next');
    await tapText('Next');
    await tapText('Next');
    await tapText('Next');
    await tapIdAfterScroll('trustContinueButton');
  }
  if ((process.env.E2E_AUTH_MODE ?? 'preseed') === 'preseed') {
    await tapText('Log in');
  }
  await typeIntoId('emailInput', email);
  await typeIntoId('passwordInput', password);
  if (device.getPlatform() === 'android') {
    await device.pressBack();
  }
  await tapId('submitButton');
}

export async function completeOnboarding(): Promise<void> {
  await waitForText('Pick a buddy and a starting level', COLD_START_TIMEOUT_MS);
  await tapTextAfterScroll('4 – 6');
  await tapIdAfterScroll('childProfileSaveButton');
  await waitForText('Robot needs the mic to listen');
  await tapText('Enable microphone');
  await tapTextIfVisible('Allow');
  await tapText('Start lesson');
  await disableDetoxSync();
  await device.launchApp({ newInstance: true });
  await waitForId('homeTab', COLD_START_TIMEOUT_MS);
}

export async function expectHealthyVisibleText(text: string): Promise<void> {
  await expectNoBlankScreen(text);
}

export async function openRoute(path: string, sentinelText: string): Promise<void> {
  await disableDetoxSync();
  const url = `tbot://${path}`;
  if (device.getPlatform() === 'android') {
    await device.openURL({ url });
  } else {
    await device.launchApp({ newInstance: true, url });
  }
  if (sentinelText === 'Home') {
    await waitForId('homeTab', COLD_START_TIMEOUT_MS);
    await tapId('homeTab');
    return;
  }
  await expectHealthyVisibleText(sentinelText);
}

export async function pushRoute(path: string, sentinelText: string): Promise<void> {
  await disableDetoxSync();
  const url = `tbot://${path}`;
  if (device.getPlatform() === 'android') {
    await device.openURL({ url });
  } else {
    await device.launchApp({ newInstance: true, url });
  }
  await expectHealthyVisibleText(sentinelText);
}

export async function expectHomeHub(): Promise<void> {
  await expectNativeAppAlive();
  await waitForId('homeTab', COLD_START_TIMEOUT_MS);
}

export async function expectBackGestureFromTextReturnsTo(fromText: string, toText: string): Promise<void> {
  if (device.getPlatform() === 'android') {
    await device.pressBack();
  } else {
    await element(by.text(fromText)).swipe('right', 'fast', 0.75, 0.05, 0.5);
  }
  await expectHealthyVisibleText(toText);
}

export async function disableDetoxSync(): Promise<void> {
  await device.disableSynchronization();
}

export async function enableDetoxSync(): Promise<void> {
  await device.enableSynchronization();
}

export async function resetUrlBlacklist(): Promise<void> {
  await device.setURLBlacklist([]);
}

export async function blockLocalBackend(): Promise<void> {
  await device.setURLBlacklist([
    '.*127\\.0\\.0\\.1:3000.*',
    '.*10\\.0\\.2\\.2:3000.*',
    '.*localhost:3000.*',
  ]);
}
