import PostHog from 'posthog-react-native';
import { ENV } from '../__env__';

/** Event names must follow `mobile.<domain>.<action>`. */
const POSTHOG_KEY = ENV.EXPO_PUBLIC_POSTHOG_API_KEY?.trim();
const POSTHOG_HOST = ENV.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

let client: PostHog | null = null;
let analyticsEnabled = false;

export function initAnalytics(): void {
  if (!POSTHOG_KEY) {
    analyticsEnabled = false;
    return;
  }

  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    disabled: false,
    captureNativeAppLifecycleEvents: true,
    flushAt: 1,
    flushInterval: 1000,
  });
  analyticsEnabled = true;
}

export function identifyAnalyticsUser(userId: string, email?: string): void {
  if (!analyticsEnabled || !client || !userId) return;
  client.identify(userId, email ? { email } : undefined);
}

export function resetAnalytics(): void {
  if (!analyticsEnabled || !client) return;
  client.reset();
}

export function trackEvent(event: string, properties?: Record<string, string | number | boolean | null>): void {
  if (!analyticsEnabled || !client) return;
  // Strip undefined values for PostHog's strict JsonType
  const clean = properties
    ? Object.fromEntries(Object.entries(properties).filter(([, v]) => v !== undefined))
    : undefined;
  client.capture(event, clean);
}

export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled;
}

export function getAnalyticsClient(): PostHog | null {
  return client;
}
