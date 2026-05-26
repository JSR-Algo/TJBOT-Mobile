/**
 * E2E: auth signup + login flows — mapped to plan ACs.
 *
 * AC coverage:
 *   AC-1  Empty email → inline "Enter your email to continue."
 *   AC-2  Invalid email → "Enter a valid email address."
 *   AC-3  Weak password → passwordError lists all failing rules
 *   AC-4  Valid password typed char-by-char → checklist ticks; submit CTA enabled
 *   AC-5  Existing email (mock 409) → "An account with this email already exists." + tab switches to Log in
 *   AC-12 Eye icon → password becomes visible/hidden
 *   AC-13 Confirm password mismatch → "Passwords don't match."
 *   AC-14 Forgot password → CTA changes to "Send reset email"; shows success message
 *   AC-16 LoginErrorScreen route removed → deep-link tbot://auth/login-error falls back (no crash, no nav)
 *
 * Required env (happy-path tests only):
 *   E2E_STAGING_EMAIL    — staging test account email
 *   E2E_STAGING_PASSWORD — staging test account password
 *   E2E_NEW_EMAIL        — unused-email for signup tests (avoids 409 on AC-5)
 *
 * Build + run:
 *   npm run detox:build:ios && npm run detox:test:ios
 *
 * Do NOT run detox:build as part of tsc/lint CI — separate session required.
 */

import { describe, it, beforeAll, beforeEach } from '@jest/globals';
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

const STAGING_EMAIL = process.env.E2E_STAGING_EMAIL ?? 'qa+e2e@tbot.local';
const STAGING_PASSWORD = process.env.E2E_STAGING_PASSWORD ?? 'ChangeMe-E2E-2026';

// A valid strong password that satisfies all checklist rules.
const STRONG_PASSWORD = 'Test@1234';
// An email address that has never been registered (use a timestamped alias in CI).
const FRESH_EMAIL = process.env.E2E_NEW_EMAIL ?? `qa+new-${Date.now()}@tbot.local`;

async function launchOnLoginScreen(): Promise<void> {
  await device.launchApp({
    newInstance: true,
    delete: true,
    url: 'tbot://auth/login',
    permissions: { notifications: 'YES', microphone: 'YES' },
  });
  await waitFor(element(by.id('emailInput')))
    .toBeVisible()
    .withTimeout(30000);
}

async function switchToTab(label: 'Sign up' | 'Log in'): Promise<void> {
  await element(by.label(`${label} mode`)).tap();
}

describe('auth: signup validation (AC-1, AC-2, AC-3, AC-4, AC-12, AC-13)', () => {
  beforeAll(launchOnLoginScreen);

  beforeEach(async () => {
    await device.reloadReactNative();
    // Always start on the Sign up tab.
    await waitFor(element(by.id('emailInput'))).toBeVisible().withTimeout(15000);
  });

  it('AC-1: empty email → inline email error', async () => {
    await element(by.id('submitButton')).tap();
    await waitFor(element(by.text('Enter your email to continue.')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('AC-2: invalid email → inline email error', async () => {
    await element(by.id('emailInput')).typeText('foo@');
    await element(by.id('submitButton')).tap();
    await waitFor(element(by.text('Enter a valid email address.')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('AC-3: weak password → password error lists all failing rules', async () => {
    await element(by.id('emailInput')).typeText('user@example.com');
    // 'a' fails every rule: length, uppercase, digit, special char
    await element(by.id('passwordInput')).typeText('a');
    await element(by.id('submitButton')).tap();
    await waitFor(element(by.text('Enter your password to continue.')))
      .not.toBeVisible()
      .withTimeout(3000);
    // Password error should appear (any of the checklist-rule messages)
    await waitFor(
      element(by.text('Password must contain at least 8 characters, one uppercase letter, one number, one special character (!@#$%^&*).'))
    ).toBeVisible().withTimeout(5000);
  });

  it('AC-4: valid password typed char-by-char → checklist ticks; submit enabled', async () => {
    await element(by.id('emailInput')).typeText('user@example.com');
    // Type each required char and verify the rule flips to met.
    await element(by.id('passwordInput')).typeText('a');
    await detoxExpect(element(by.label('At least 8 characters: not met'))).toExist();

    await element(by.id('passwordInput')).typeText('AAAAAAA'); // now >=8, has uppercase
    await detoxExpect(element(by.label('At least 8 characters: met'))).toExist();
    await detoxExpect(element(by.label('One uppercase letter: met'))).toExist();

    await element(by.id('passwordInput')).clearText();
    await element(by.id('passwordInput')).typeText(STRONG_PASSWORD);
    await detoxExpect(element(by.label('At least 8 characters: met'))).toExist();
    await detoxExpect(element(by.label('One uppercase letter: met'))).toExist();
    await detoxExpect(element(by.label('One number: met'))).toExist();
    await detoxExpect(element(by.label('One special character (!@#$%^&*): met'))).toExist();

    // Fill confirm password to match → submit should be enabled (not loading spinner)
    await element(by.id('confirmPasswordInput')).typeText(STRONG_PASSWORD);
    await detoxExpect(element(by.id('submitButton'))).toBeEnabled();
  });

  it('AC-12: eye icon toggles password visibility', async () => {
    await element(by.id('passwordInput')).typeText('Secret1!');
    // Default: obscured — tap "Show password"
    await element(by.label('Show password')).tap();
    await detoxExpect(element(by.label('Hide password'))).toBeVisible();
    // Tap again — back to hidden
    await element(by.label('Hide password')).tap();
    await detoxExpect(element(by.label('Show password'))).toBeVisible();
  });

  it('AC-13: confirm password mismatch → "Passwords do not match."', async () => {
    await element(by.id('emailInput')).typeText(FRESH_EMAIL);
    await element(by.id('passwordInput')).typeText(STRONG_PASSWORD);
    await element(by.id('confirmPasswordInput')).typeText('DifferentPass@9');
    await element(by.id('submitButton')).tap();
    await waitFor(element(by.text('Passwords do not match.')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

describe('auth: signup existing email → auto-switch tab (AC-5)', () => {
  beforeAll(launchOnLoginScreen);

  it('AC-5: existing email triggers USER_EXISTS → general error + tab switches to Log in', async () => {
    // STAGING_EMAIL is a pre-existing account.
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await element(by.id('passwordInput')).typeText(STRONG_PASSWORD);
    await element(by.id('confirmPasswordInput')).typeText(STRONG_PASSWORD);
    await element(by.id('submitButton')).tap();

    // The backend returns 409/USER_EXISTS. LoginScreen switches to login tab.
    await waitFor(element(by.label('Log in mode')))
      .toHaveToggleValue(true)
      .withTimeout(10000);

    // General error message surfaced.
    await waitFor(element(by.text('An account with this email already exists.')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

describe('auth: forgot password inline flow (AC-14)', () => {
  beforeAll(async () => {
    await launchOnLoginScreen();
    await switchToTab('Log in');
  });

  it('AC-14: Forgot password? → CTA becomes "Send reset email" → success message', async () => {
    // Tap "Forgot password?" link
    await element(by.label('Forgot password')).tap();
    // CTA label changes
    await waitFor(element(by.id('submitButton')))
      .toHaveLabel('Send reset email')
      .withTimeout(3000);

    // Type a valid email and send
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await element(by.id('submitButton')).tap();

    // Success message appears
    await waitFor(element(by.text('Password reset email sent.')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

describe('auth: LoginErrorScreen route removed (AC-16)', () => {
  it('AC-16: deep-link tbot://auth/login-error does not navigate to LoginErrorScreen', async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      url: 'tbot://auth/login-error',
      permissions: { notifications: 'YES', microphone: 'YES' },
    });

    // App must not crash. Should land on LoginScreen (fallback) or SplashScreen.
    // LoginErrorScreen must NOT be visible.
    await waitFor(element(by.id('loginErrorScreen')))
      .not.toBeVisible()
      .withTimeout(10000);

    // App is still alive — either email input (login screen) or splash is visible.
    await detoxExpect(
      element(by.id('emailInput')).atIndex(0),
    ).toExist();
  });
});

describe('auth: login happy path (smoke regression)', () => {
  beforeAll(launchOnLoginScreen);

  it('signs in with staging creds and lands on main tabs', async () => {
    await switchToTab('Log in');
    await element(by.id('emailInput')).typeText(STAGING_EMAIL);
    await element(by.id('passwordInput')).typeText(STAGING_PASSWORD);
    await element(by.id('submitButton')).tap();

    await waitFor(element(by.id('mainTabs')))
      .toBeVisible()
      .withTimeout(30000);

    await detoxExpect(element(by.id('homeTab'))).toBeVisible();
  });
});
