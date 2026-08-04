import type { UserRole } from './analytics';

export interface InitSentryOptions {
  userRole?: UserRole | 'unknown';
  enableAutoSessionTracking?: boolean;
}

export function initSentry(_opts?: InitSentryOptions): void {}

export function setSentryUserRole(_role: UserRole | 'unknown'): void {}

export function isSentryEnabled(): boolean {
  return false;
}

export function captureError(_error: unknown): void {}
