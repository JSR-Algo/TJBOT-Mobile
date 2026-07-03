import PostHog from 'posthog-react-native';
import { ENV } from '../../__env__';

/** Event names must follow `mobile.<domain>.<action>`. */
const POSTHOG_KEY = ENV.EXPO_PUBLIC_POSTHOG_API_KEY?.trim();
const POSTHOG_HOST = ENV.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

export type UserRole = 'child' | 'teen' | 'adult';

export const SENSITIVE_PROPERTY_PATTERN =
  /(?:email|token|secret|password|transcript|audio|name|dob|birthdate|address|phone)/i;

let client: PostHog | null = null;
let analyticsEnabled = false;
let currentRole: UserRole | null = null;

export function initAnalytics(role?: UserRole): void {
  if (role !== undefined) currentRole = role;
  if (!POSTHOG_KEY) {
    analyticsEnabled = false;
    return;
  }
  const disabled = currentRole === 'child';

  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    disabled,
    captureNativeAppLifecycleEvents: true,
    flushAt: 1,
    flushInterval: 1000,
  });
  analyticsEnabled = !disabled;
}

export function setAnalyticsUserRole(role: UserRole): void {
  currentRole = role;
  if (role === 'child') {
    if (client) {
      void client.optOut();
    }
    analyticsEnabled = false;
    return;
  }
  if (client) {
    void client.optIn();
    analyticsEnabled = true;
    return;
  }
  initAnalytics(role);
}

export function identifyAnalyticsUser(userId: string, email?: string): void {
  if (!analyticsEnabled || !client || !userId) return;
  const properties = email ? redactSensitiveProperties({ email }) : undefined;
  client.identify(userId, properties);
}

export function resetAnalytics(): void {
  if (!analyticsEnabled || !client) return;
  client.reset();
}

export function trackEvent(event: string, properties?: Record<string, string | number | boolean | null>): void {
  if (!analyticsEnabled || !client) return;
  const clean = properties ? redactSensitiveProperties(properties) : undefined;
  client.capture(event, clean);
}

export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled;
}

/**
 * Parent-controlled analytics consent switch (Settings → Privacy). Flips the
 * live PostHog opt state AND the in-process gate so `trackEvent` stops/starts
 * immediately. Persisting the parent's choice across launches is the caller's
 * responsibility (Settings writes it to AsyncStorage and re-applies on boot).
 */
export function setAnalyticsCollectionEnabled(enabled: boolean): void {
  analyticsEnabled = enabled;
  if (!client) return;
  if (enabled) {
    void client.optIn();
  } else {
    void client.optOut();
  }
}

export function getAnalyticsClient(): PostHog | null {
  return client;
}

function redactSensitiveProperties(
  properties: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || SENSITIVE_PROPERTY_PATTERN.test(key)) continue;
    clean[key] = value;
  }
  return clean;
}
