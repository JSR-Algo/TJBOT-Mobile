export type UserRole = 'child' | 'teen' | 'adult';

export const SENSITIVE_PROPERTY_PATTERN =
  /(?:email|token|secret|password|transcript|audio|name|dob|birthdate|address|phone)/i;

export function initAnalytics(_role?: UserRole): void {}

export function setAnalyticsUserRole(_role: UserRole): void {}

export function identifyAnalyticsUser(_userId: string, _email?: string): void {}

export function resetAnalytics(): void {}

export function trackEvent(
  _event: string,
  _properties?: Record<string, string | number | boolean | null>,
): void {}

export function isAnalyticsEnabled(): boolean {
  return false;
}

/** Retained compatibility API. Analytics collection stays disabled. */
export function setAnalyticsCollectionEnabled(_enabled: boolean): void {}

export function getAnalyticsClient(): null {
  return null;
}
