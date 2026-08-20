import { ENV } from 'tbot-runtime-env';

export type ParentProgressDiagnosticSource = 'ws' | 'focused_http';

export type ParentProgressDiagnosticDecision =
  | 'receive'
  | 'apply_snapshot'
  | 'apply_update'
  | 'drop_bad_json'
  | 'drop_child_mismatch'
  | 'drop_invalid_revision'
  | 'drop_stale'
  | 'drop_invalid_snapshot'
  | 'drop_invalid_update'
  | 'drop_unknown_type'
  | 'drop_gap_incomplete'
  | 'sample_start'
  | 'receive_sample'
  | 'apply_sample'
  | 'defer_terminal'
  | 'cache_deferred_terminal'
  | 'apply_deferred_terminal'
  | 'drop_stale_cache'
  | 'sample_error';

export interface ParentProgressDiagnostic {
  source: ParentProgressDiagnosticSource;
  decision: ParentProgressDiagnosticDecision;
  childId: string;
  revision?: string;
  cacheRevision?: string;
  state?: string | null;
  stepId?: string | null;
  stepNumber?: number | null;
  percent?: number | null;
  terminalReady?: boolean;
}

type ParentProgressDiagnosticLog = Omit<ParentProgressDiagnostic, 'childId'> & {
  childKey: string;
};

let enabledForTest: boolean | null = null;
const diagnosticEnv = ENV as typeof ENV & {
  EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS?: string;
  EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL?: string;
};

export function setParentProgressDiagnosticsEnabledForTest(value: boolean | null): void {
  enabledForTest = value;
}

export function logParentProgressDiagnostic(event: ParentProgressDiagnostic): void {
  if (!isParentProgressDiagnosticsEnabled()) return;
  console.info('parent_progress_diag', sanitizeParentProgressDiagnostic(event));
}

function isParentProgressDiagnosticsEnabled(nowMs = Date.now()): boolean {
  if (enabledForTest !== null) return enabledForTest;
  const enabled = diagnosticEnv.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS
    || process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS;
  if (enabled !== 'true') return false;
  const expiresAt = parseDiagnosticExpiry(
    diagnosticEnv.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL
      || process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL,
  );
  return expiresAt !== null && nowMs <= expiresAt;
}

function parseDiagnosticExpiry(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeParentProgressDiagnostic(event: ParentProgressDiagnostic): ParentProgressDiagnosticLog {
  const sanitized: ParentProgressDiagnosticLog = {
    source: event.source,
    decision: event.decision,
    childKey: stableChildKey(event.childId),
  };
  if (event.revision !== undefined) sanitized.revision = event.revision;
  if (event.cacheRevision !== undefined) sanitized.cacheRevision = event.cacheRevision;
  if (event.state !== undefined) sanitized.state = event.state;
  if (event.stepId !== undefined) sanitized.stepId = sanitizeStepId(event.stepId);
  if (event.stepNumber !== undefined) sanitized.stepNumber = event.stepNumber;
  if (event.percent !== undefined) sanitized.percent = event.percent;
  if (event.terminalReady !== undefined) sanitized.terminalReady = event.terminalReady;
  return sanitized;
}

function stableChildKey(childId: string): string {
  let hash = 2166136261;
  for (let index = 0; index < childId.length; index += 1) {
    hash ^= childId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `child_${(hash >>> 0).toString(36)}`;
}

function sanitizeStepId(stepId: string | null): string | null {
  if (stepId === null) return null;
  return /^[A-Za-z0-9_.:-]{1,64}$/.test(stepId) ? stepId : `step_${stableChildKey(stepId).slice('child_'.length)}`;
}
