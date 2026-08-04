import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { resources, type Locale, type TranslationResourceValue } from '../../src/services/i18n/resources';

const SCREEN_TIMEOUT_MS = 10000;
const COLD_START_TIMEOUT_MS = 30000;
const ROUTE_OPEN_SETTLE_MS = 750;
const ROUTE_OPEN_ATTEMPTS = 2;
const LOGIN_SCREEN_ATTEMPTS = 2;
const MATCH_ATTEMPT_TIMEOUT_MS = 100;
const VISIBLE_MATCH_INDEXES = [0, 1, 2, 3, 4, 5] as const;
const PREFERRED_E2E_LOCALE: Locale = process.env.E2E_APP_LOCALE === 'en' ? 'en' : 'vi';
const E2E_LOCALE_ORDER: readonly Locale[] = PREFERRED_E2E_LOCALE === 'vi' ? ['vi', 'en'] : ['en', 'vi'];
const DETOX_PERMISSIONS = {
  notifications: 'YES',
  microphone: 'YES',
} as const;
let hasPerformedCleanInstall = false;
let hasAttemptedIosPasswordPromptCoordinateDismissal = false;
const NON_BLANK_SENTINELS = [
  'Get started',
  "Hi! I'm Robot.",
  'A grown-up sets things up the first time.',
  'Log in',
  'Home',
  'Robot unavailable',
  'No Robot connected',
  'Course Library',
  'Parent Space',
  'Meet Robot',
  'Turn on Robot',
  'Power on your Robot',
  'No internet connection',
  'Attempt 1 of 3',
] as const;
const NON_BLANK_TEST_IDS = [
  'ageBandOption_18_PLUS',
  'welcomeScreen',
  'emailInput',
  'childProfileSaveButton',
  'homeTab',
  'mainTabs',
  'root-error-boundary-restart',
] as const;

function resolveTranslationEntry(entry: TranslationResourceValue | undefined): string | null {
  if (entry === undefined) return null;
  if (typeof entry === 'string') return entry;

  const parentValue = entry.parent;
  if (typeof parentValue === 'string') return parentValue;

  return null;
}

function pushUnique(values: string[], value: string | null): void {
  if (value !== null && !values.includes(value)) values.push(value);
}

function localizedCandidates(labels: readonly string[]): string[] {
  const candidates: string[] = [];
  for (const label of labels) {
    for (const locale of E2E_LOCALE_ORDER) {
      pushUnique(candidates, resolveTranslationEntry(resources[locale].translation[label]));
    }
    pushUnique(candidates, label);
  }
  return candidates;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nextAttemptTimeout(deadline: number): number | null {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return null;
  return Math.min(MATCH_ATTEMPT_TIMEOUT_MS, remaining);
}

async function waitForVisibleTextOrLabel(
  label: string,
  kind: 'text' | 'label',
  index: number,
  timeout: number,
): Promise<boolean> {
  const target = element(kind === 'text' ? by.text(label) : by.label(label)).atIndex(index);
  try {
    await waitFor(target).toBeVisible().withTimeout(timeout);
    await detoxExpect(target).toBeVisible();
    return true;
  } catch {
    return false;
  }
}

async function tapVisibleTextOrLabel(
  label: string,
  kind: 'text' | 'label',
  index: number,
  timeout: number,
): Promise<boolean> {
  const target = element(kind === 'text' ? by.text(label) : by.label(label)).atIndex(index);
  try {
    await waitFor(target).toBeVisible().withTimeout(timeout);
    await target.tap();
    return true;
  } catch {
    return false;
  }
}

async function firstVisibleTextOrLabel(labels: readonly string[], deadline: number): Promise<string | null> {
  for (const index of VISIBLE_MATCH_INDEXES) {
    for (const label of labels) {
      const textTimeout = nextAttemptTimeout(deadline);
      if (textTimeout === null) return null;
      if (await waitForVisibleTextOrLabel(label, 'text', index, textTimeout)) return label;

      const labelTimeout = nextAttemptTimeout(deadline);
      if (labelTimeout === null) return null;
      if (await waitForVisibleTextOrLabel(label, 'label', index, labelTimeout)) return label;
    }
  }
  return null;
}

async function tapFirstVisibleTextOrLabel(labels: readonly string[], index: number, deadline: number): Promise<string | null> {
  const indexes = index === 0 ? VISIBLE_MATCH_INDEXES : [index];
  for (const targetIndex of indexes) {
    for (const label of labels) {
      const textTimeout = nextAttemptTimeout(deadline);
      if (textTimeout === null) return null;
      if (await tapVisibleTextOrLabel(label, 'text', targetIndex, textTimeout)) return label;

      const labelTimeout = nextAttemptTimeout(deadline);
      if (labelTimeout === null) return null;
      if (await tapVisibleTextOrLabel(label, 'label', targetIndex, labelTimeout)) return label;
    }
  }
  return null;
}

async function tapFirstVisibleLabel(labels: readonly string[], deadline: number): Promise<boolean> {
  for (const index of VISIBLE_MATCH_INDEXES) {
    for (const label of labels) {
      const timeout = nextAttemptTimeout(deadline);
      if (timeout === null) return false;
      if (await tapVisibleTextOrLabel(label, 'label', index, timeout)) return true;
    }
  }
  return false;
}

export async function clearIosKeychainForCleanLaunch(): Promise<void> {
  if (device.getPlatform() !== 'ios') return;
  await device.clearKeychain();
  hasAttemptedIosPasswordPromptCoordinateDismissal = false;
}

export async function launchCleanApp(): Promise<void> {
  await clearIosKeychainForCleanLaunch();
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: DETOX_PERMISSIONS,
  });
  hasPerformedCleanInstall = true;
}

export async function waitForId(id: string, timeout = SCREEN_TIMEOUT_MS): Promise<void> {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

export async function waitForText(text: string, timeout = SCREEN_TIMEOUT_MS): Promise<void> {
  const labels = localizedCandidates([text]);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await firstVisibleTextOrLabel(labels, deadline)) !== null) return;
  }
  throw new Error(`None of these labels became visible: ${labels.join(', ')}`);
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
  const labels = localizedCandidates([text]);
  const deadline = Date.now() + SCREEN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if ((await tapFirstVisibleTextOrLabel(labels, index, deadline)) !== null) return;
  }
  throw new Error(`None of these labels were tappable: ${labels.join(', ')}`);
}

export async function tapTextIfVisible(text: string, timeout = 1500, index = 0): Promise<boolean> {
  const labels = localizedCandidates([text]);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await tapFirstVisibleTextOrLabel(labels, index, deadline)) !== null) return true;
  }
  return false;
}

async function tapLocalizedLabel(labels: readonly string[], index = 0, timeout = SCREEN_TIMEOUT_MS): Promise<string> {
  const candidates = localizedCandidates(labels);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const tapped = await tapFirstVisibleTextOrLabel(candidates, index, deadline);
    if (tapped !== null) return tapped;
  }
  throw new Error(`None of these labels were tappable: ${candidates.join(', ')}`);
}

export async function tapTextAfterScroll(text: string): Promise<void> {
  const labels = localizedCandidates([text]);
  for (const label of labels) {
    try {
      const target = element(by.text(label)).atIndex(0);
      await waitFor(target)
        .toBeVisible()
        .whileElement(by.id('onboardingScroll'))
        .scroll(260, 'down');
      await target.tap();
      return;
    } catch {
      continue;
    }
  }
  throw new Error(`None of these labels were visible after scroll: ${labels.join(', ')}`);
}

export async function tapIdAfterScroll(id: string, scrollId = 'onboardingScroll', visiblePercent = 75): Promise<void> {
  const target = element(by.id(id));
  await waitFor(target)
    .toBeVisible(visiblePercent)
    .whileElement(by.id(scrollId))
    .scroll(260, 'down', 0.5, 0.5);
  await target.tap();
}

async function tapTrustContinueButton(): Promise<void> {
  await tapIdAfterScroll('trustContinueButton', 'onboardingScroll');
  try {
    await waitForId('loginScreenScroll', 5000);
    return;
  } catch {
    if (device.getPlatform() !== 'android') {
      await waitForId('loginScreenScroll', COLD_START_TIMEOUT_MS);
      return;
    }
  }

  await device.tap({ x: 540, y: 1710 });
  await waitForId('loginScreenScroll', COLD_START_TIMEOUT_MS);
}

export async function tapFirstVisibleText(labels: readonly string[]): Promise<string> {
  return tapLocalizedLabel(labels, 0, SCREEN_TIMEOUT_MS);
}

export async function expectFirstVisibleText(labels: readonly string[], timeout = SCREEN_TIMEOUT_MS): Promise<string> {
  const candidates = localizedCandidates(labels);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const visible = await firstVisibleTextOrLabel(candidates, deadline);
    if (visible !== null) return visible;
  }
  throw new Error(`None of these labels became visible: ${candidates.join(', ')}`);
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

export async function dismissSavePasswordPromptIfVisible(): Promise<void> {
  if (device.getPlatform() !== 'ios') return;
  try {
    const notNow = element(by.text('Not Now'));
    await waitFor(notNow).toBeVisible().withTimeout(2000);
    await notNow.tap();
    return;
  } catch {
    // iOS password prompts are system UI and are not always exposed to Detox matchers.
  }

  if (hasAttemptedIosPasswordPromptCoordinateDismissal) return;
  hasAttemptedIosPasswordPromptCoordinateDismissal = true;

  await sleep(500);
  for (const point of [
    { x: 130, y: 560 },
    { x: 300, y: 1270 },
  ]) {
    try {
      await device.tap(point);
      await sleep(500);
      return;
    } catch {
      // Try the next coordinate system used by current and older iOS simulators.
    }
  }
}

export async function completeAgeGateIfVisible(timeout = 1500): Promise<void> {
  try {
    await waitFor(element(by.id('ageBandOption_18_PLUS'))).toBeVisible().withTimeout(timeout);
  } catch {
    return;
  }
  await tapId('ageBandOption_18_PLUS');
  await tapId('ageScreenContinueButton');
  try {
    await waitForId('emailInput', 2000);
  } catch {
    await completeFirstRunIntroIfVisible(COLD_START_TIMEOUT_MS);
  }
}

export async function completeFirstRunIntroIfVisible(timeout = 1500): Promise<void> {
  try {
    await waitFor(element(by.id('welcomeScreen'))).toBeVisible().withTimeout(timeout);
  } catch {
    return;
  }
  await tapId('getStartedButton');
  for (let step = 0; step < 4; step += 1) {
    await tapId('introNextButton');
  }
  await tapTrustContinueButton();
}

async function launchUnauthenticatedApp(clearStoredAuth: boolean): Promise<void> {
  if (clearStoredAuth) {
    await clearIosKeychainForCleanLaunch();
  }
  await device.launchApp({
    newInstance: true,
    delete: !hasPerformedCleanInstall,
    permissions: DETOX_PERMISSIONS,
  });
  hasPerformedCleanInstall = true;
}

async function waitForLoginInput(timeout: number): Promise<boolean> {
  try {
    await waitForId('loginScreenScroll', timeout);
    await waitForId('emailInput', timeout);
    return true;
  } catch {
    return false;
  }
}

export async function ensureLoginScreen(options: { timeout?: number; reset?: boolean } = {}): Promise<void> {
  const timeout = options.timeout ?? COLD_START_TIMEOUT_MS;
  if (options.reset === true) {
    await launchUnauthenticatedApp(true);
  }

  for (let attempt = 0; attempt < LOGIN_SCREEN_ATTEMPTS; attempt += 1) {
    if (await waitForLoginInput(Math.min(timeout, SCREEN_TIMEOUT_MS))) return;
    await completeAgeGateIfVisible(Math.min(timeout, SCREEN_TIMEOUT_MS));
    await completeFirstRunIntroIfVisible(Math.min(timeout, SCREEN_TIMEOUT_MS));
    if (await waitForLoginInput(Math.min(timeout, SCREEN_TIMEOUT_MS))) return;

    if (attempt < LOGIN_SCREEN_ATTEMPTS - 1) {
      await launchUnauthenticatedApp(true);
    }
  }

  await waitForId('emailInput', timeout);
}

export async function tapLabel(label: string): Promise<void> {
  const labels = localizedCandidates([label]);
  const deadline = Date.now() + SCREEN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await tapFirstVisibleLabel(labels, deadline)) return;
  }
  throw new Error(`None of these accessibility labels were tappable: ${labels.join(', ')}`);
}

export async function typeIntoId(id: string, value: string): Promise<void> {
  const target = element(by.id(id));
  await waitFor(target).toBeVisible().withTimeout(SCREEN_TIMEOUT_MS);
  await target.tap();
  await target.replaceText(value);
}

export async function loginFromColdStart(email: string, password: string): Promise<void> {
  await expectNativeAppAlive();
  await completeAgeGateIfVisible();
  try {
    await waitForId('emailInput', 2000);
  } catch {
    await completeFirstRunIntroIfVisible(COLD_START_TIMEOUT_MS);
  }
  if ((process.env.E2E_AUTH_MODE ?? 'preseed') === 'preseed') {
    await tapId('authModeTab_login');
  }
  await typeIntoId('emailInput', email);
  await typeIntoId('passwordInput', password);
  if (device.getPlatform() === 'android') {
    await device.pressBack();
  }
  await tapId('submitButton');
  try {
    await waitForId('emailInput', 1500);
    await tapId('submitButton');
  } catch {
    await dismissSavePasswordPromptIfVisible();
    return;
  }
  await dismissSavePasswordPromptIfVisible();
}

export async function completeOnboarding(): Promise<void> {
  try {
    await waitForId('homeTab', 3000);
    await dismissSavePasswordPromptIfVisible();
    return;
  } catch {
    // Continue through first-run onboarding when Home is not already available.
  }
  await dismissSavePasswordPromptIfVisible();
  await waitForText('Pick a buddy and a starting level', COLD_START_TIMEOUT_MS);
  await tapIdAfterScroll('childAgeBand_PRE_K', 'onboardingScroll', 20);
  await tapIdAfterScroll('childProfileSaveButton');
  await waitForText('Robot needs the mic to listen');
  await tapFirstVisibleText(['Enable microphone', 'Continue', 'Not now']);
  await tapTextIfVisible('Allow');
  await tapFirstVisibleText(['Start lesson', 'Yes!']);
  await disableDetoxSync();
  await device.launchApp({ newInstance: true });
  await openRouteWithRetry('home/home-hub', waitForHomeRoute);
  await dismissSavePasswordPromptIfVisible();
}

export async function expectHealthyVisibleText(text: string): Promise<void> {
  await expectNoBlankScreen(text);
}

async function waitForHomeRoute(): Promise<void> {
  try {
    await waitForId('homeTab', 5000);
  } catch {
    try {
      await waitForText('Home', 5000);
    } catch {
      await waitForId('mainTabs', 5000);
    }
  }
  await tapId('homeTab').catch(() => undefined);
}

async function openRouteWithRetry(path: string, waitForTarget: () => Promise<void>): Promise<void> {
  await disableDetoxSync();
  const url = `TJBot:///${path}`;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < ROUTE_OPEN_ATTEMPTS; attempt += 1) {
    await device.openURL({ url });
    await sleep(ROUTE_OPEN_SETTLE_MS);
    try {
      await waitForTarget();
      return;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error(`Route did not open: ${path}`);
}

export async function openRoute(path: string, sentinelText: string): Promise<void> {
  if (sentinelText === 'Home') {
    await openRouteWithRetry(path, waitForHomeRoute);
    return;
  }
  await openRouteWithRetry(path, () => expectHealthyVisibleText(sentinelText));
}

export async function openRouteToAnyText(path: string, sentinelTexts: readonly string[]): Promise<void> {
  await openRouteWithRetry(path, () => expectFirstVisibleText(sentinelTexts, COLD_START_TIMEOUT_MS));
}

export async function openRouteToId(path: string, id: string): Promise<void> {
  await openRouteWithRetry(path, () => waitForId(id, COLD_START_TIMEOUT_MS));
}

export async function pushRoute(path: string, sentinelText: string): Promise<void> {
  await openRouteWithRetry(path, () => expectHealthyVisibleText(sentinelText));
}

export async function expectHomeHub(): Promise<void> {
  await expectNativeAppAlive();
  await waitForId('homeTab', COLD_START_TIMEOUT_MS);
}

export async function expectBackGestureFromTextReturnsTo(fromText: string, toText: string): Promise<void> {
  if (device.getPlatform() === 'android') {
    await device.pressBack();
  } else {
    const labels = localizedCandidates([fromText]);
    let swiped = false;
    for (const label of labels) {
      try {
        const target = element(by.text(label)).atIndex(0);
        await waitFor(target).toBeVisible().withTimeout(500);
        await target.swipe('right', 'fast', 0.75, 0.05, 0.5);
        swiped = true;
        break;
      } catch {
        try {
          const target = element(by.label(label)).atIndex(0);
          await waitFor(target).toBeVisible().withTimeout(500);
          await target.swipe('right', 'fast', 0.75, 0.05, 0.5);
          swiped = true;
          break;
        } catch {
          continue;
        }
      }
    }
    if (!swiped) throw new Error(`Could not swipe from any label: ${labels.join(', ')}`);
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
