export type LessonTheme = {
  version: string;
  allowedTopics: string[];
  vocab: string[];
  openers: string[];
};

export interface TelemetryPort {
  emit(event: 'safety_block_event' | 'safety_shim_error', payload: Record<string, unknown>): void;
}

export interface SafetyContext {
  readonly childAgeBracket: '4-6' | '7-9' | '10-12';
  readonly childProfileId: string;
  readonly sessionId: string;
  readonly theme: LessonTheme;
  readonly telemetry: TelemetryPort;
}

export type SafetyCategory =
  | 'violence'
  | 'sexual'
  | 'substance'
  | 'self-harm'
  | 'pii'
  | 'prompt-injection';

export interface CheckResult {
  readonly verdict: 'allow' | 'block';
  readonly category?: SafetyCategory;
  readonly termSha256?: string;
  readonly fallback?: string;
}

export interface BlocklistV1 {
  version: string;
  generatedAt: string;
  authoredBy: string;
  approvedBy: string;
  integritySha256: string;
  categories: Record<SafetyCategory | string, string[]>;
}
