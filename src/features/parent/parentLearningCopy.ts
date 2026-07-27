import { translateCopy, type AppLocale } from '@/services/i18n/i18n';

const STATE_KEYS: Record<string, string> = {
  ASSIGNED: 'Preparing', PRELOADING: 'Preparing', PREPARING: 'Preparing', READY: 'Preparing',
  RUNNING: 'In progress',
  ENTRANCE: 'Robot entrance', TEACH: 'Teaching', TEACHING: 'Teaching', LISTEN: 'Listening', LISTENING: 'Listening',
  THINK: 'Thinking', THINKING: 'Thinking', FEEDBACK: 'Feedback',
  COMPLETED: 'Completed', FAILED: "Didn't finish", ABANDONED: "Didn't finish", CANCELLED: 'Cancelled',
  PAUSED: 'Paused',
};

const RESPONSE_KEYS: Record<string, string> = {
  MATCH: 'Match', ACCEPTED: 'Accepted', NEEDS_REVIEW: 'Needs review', NO_MATCH: 'Not matched', TIMEOUT: 'Timed out', SKIPPED: 'Skipped',
};

export type ParentReportCategory = 'Presented' | 'Attempted' | 'Accepted' | 'Needs review';

export function parentSessionStateLabel(state: string, locale: AppLocale): string {
  return translateCopy(STATE_KEYS[state.toUpperCase()] ?? state, { locale });
}

export function parentResponseClassLabel(value: string, locale: AppLocale): string {
  return translateCopy(RESPONSE_KEYS[value.toUpperCase()] ?? value, { locale });
}

export function parentReportCategoryLabel(category: ParentReportCategory, locale: AppLocale): string {
  return translateCopy(category, { locale });
}
