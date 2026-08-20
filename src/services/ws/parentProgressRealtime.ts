import { Config } from '@/config';
import { normalizeParentLearningStatus, type ParentActiveLearning, type ParentLearningStatus, type ParentLearningStep } from '@/services/api/parentLearning.api';
import { logParentProgressDiagnostic } from '@/services/observability/parentProgressDiagnostics';
import { createReconnectingSocket, type CreateReconnectingSocketOptions, type RealtimeConnection } from '@/services/ws/realtime';

export interface ParentProgressSnapshotFrame { type: 'lesson.progress.snapshot'; childId: string; projectionRevision: string; status: ParentLearningStatus }
export type ParentActiveLearningDelta = Omit<Partial<ParentActiveLearning>, 'currentStep'> & { currentStep?: Partial<ParentLearningStep> | null };
export interface ParentProgressUpdatedFrame { type: 'lesson.progress.updated'; childId: string; sessionId: string | null; projectionRevision: string; occurredAt: string; publishedAt: string; activeLearning: ParentActiveLearningDelta | null }
export interface ParentProgressRealtimeCallbacks {
  onStatus(status: ParentLearningStatus): void;
  onUpdate?(frame: ParentProgressUpdatedFrame): void;
  onInvalidate(): void;
  onAuthExpired(): void;
  onAccessRevoked(): void;
  onReconnectExhausted(): void;
  onHealthy?(): void;
  onReconnect?(): void;
}
export interface ParentProgressRealtimeOptions extends Omit<CreateReconnectingSocketOptions, 'onClose' | 'onMessage' | 'onOpen' | 'onReconnect' | 'onReconnectExhausted' | 'shouldReconnect'> { readonly baseUrl?: string }

let activeChildConnection: { childId: string; connection: RealtimeConnection } | null = null;

export async function openParentProgressRealtime(
  childId: string,
  lastProjectionRevision: string,
  callbacks: ParentProgressRealtimeCallbacks,
  options: ParentProgressRealtimeOptions = {},
): Promise<RealtimeConnection> {
  const normalizedChildId = childId.trim();
  const initialRevision = normalizeRevision(lastProjectionRevision);
  let currentRevision = initialRevision;
  let connection: RealtimeConnection | null = null;
  let subscribePending = false;
  const subscribe = (): void => {
    if (!connection) {
      subscribePending = true;
      return;
    }
    subscribePending = false;
    connection.send({
      type: 'subscribe',
      childId: normalizedChildId,
      lastProjectionRevision: currentRevision,
    });
  };
  if (activeChildConnection && activeChildConnection.childId !== normalizedChildId) activeChildConnection.connection.close(1000, 'child switched');
  connection = await createReconnectingSocket(parentProgressUrl(options.baseUrl ?? Config.API_BASE_URL), {
    ...options,
    continueAfterReconnectExhausted: true,
    onOpen: () => {
      subscribe();
      callbacks.onHealthy?.();
    },
    onReconnect: () => { callbacks.onReconnect?.(); callbacks.onInvalidate(); },
    onReconnectExhausted: callbacks.onReconnectExhausted,
    onClose: (event) => {
      if (event.code === 4401) callbacks.onAuthExpired();
      if (event.code === 4403) callbacks.onAccessRevoked();
    },
    shouldReconnect: (event) => event.code !== 4403,
    onMessage: (event) => {
      let raw: unknown;
      try { raw = JSON.parse(event.data) as unknown; } catch {
        logParentProgressDiagnostic({ source: 'ws', decision: 'drop_bad_json', childId: normalizedChildId });
        callbacks.onInvalidate();
        return;
      }
      const frame = record(raw);
      const revision = validRevision(frame.projectionRevision);
      if (frame.childId !== normalizedChildId) {
        logParentProgressDiagnostic({ source: 'ws', decision: 'drop_child_mismatch', childId: normalizedChildId, revision: revision ?? undefined });
        callbacks.onInvalidate();
        return;
      }
      if (revision === null) {
        logParentProgressDiagnostic({ source: 'ws', decision: 'drop_invalid_revision', childId: normalizedChildId });
        callbacks.onInvalidate();
        return;
      }
      if (frame.type === 'lesson.progress.snapshot') {
        logParentProgressDiagnostic({ source: 'ws', decision: 'receive', childId: normalizedChildId, revision });
        if (compareProjectionRevisions(revision, currentRevision) <= 0) {
          logParentProgressDiagnostic({ source: 'ws', decision: 'drop_stale', childId: normalizedChildId, revision });
          return;
        }
        if (!isRecord(frame.status)) {
          logParentProgressDiagnostic({ source: 'ws', decision: 'drop_invalid_snapshot', childId: normalizedChildId, revision });
          callbacks.onInvalidate();
          return;
        }
        const status = normalizeParentLearningStatus(frame.status);
        if (status.projectionRevision !== revision) {
          logParentProgressDiagnostic({ source: 'ws', decision: 'drop_invalid_snapshot', childId: normalizedChildId, revision });
          callbacks.onInvalidate();
          return;
        }
        currentRevision = revision;
        logParentProgressDiagnostic({ source: 'ws', decision: 'apply_snapshot', childId: normalizedChildId, revision, ...statusDiagnosticFields(status) });
        callbacks.onStatus(status);
        return;
      }
      if (frame.type === 'lesson.progress.updated') {
        const comparison = compareProjectionRevisions(revision, currentRevision);
        if (comparison <= 0) {
          logParentProgressDiagnostic({ source: 'ws', decision: 'drop_stale', childId: normalizedChildId, revision });
          return;
        }
        if (!isUpdateFrame(frame)) {
          logParentProgressDiagnostic({ source: 'ws', decision: 'drop_invalid_update', childId: normalizedChildId, revision });
          callbacks.onInvalidate();
          return;
        }
        const activeLearning = frame.activeLearning === null ? null : parseActiveLearningDelta(frame.activeLearning);
        if (activeLearning === undefined) {
          logParentProgressDiagnostic({ source: 'ws', decision: 'drop_invalid_update', childId: normalizedChildId, revision });
          callbacks.onInvalidate();
          return;
        }
        logParentProgressDiagnostic({ source: 'ws', decision: 'receive', childId: normalizedChildId, revision, ...activeDiagnosticFields(activeLearning) });
        // Gateway updates carry a full active-learning projection, so complete frames can safely close a revision gap.
        if (revision !== incrementRevision(currentRevision) && activeLearning !== null && !isCompleteActiveLearning(activeLearning)) {
          logParentProgressDiagnostic({ source: 'ws', decision: 'drop_gap_incomplete', childId: normalizedChildId, revision, ...activeDiagnosticFields(activeLearning) });
          callbacks.onInvalidate();
          return;
        }
        currentRevision = revision;
        logParentProgressDiagnostic({ source: 'ws', decision: 'apply_update', childId: normalizedChildId, revision, ...activeDiagnosticFields(activeLearning) });
        callbacks.onUpdate?.({ type: 'lesson.progress.updated', childId: normalizedChildId, sessionId: frame.sessionId, projectionRevision: revision, occurredAt: frame.occurredAt, publishedAt: frame.publishedAt, activeLearning });
        return;
      }
      logParentProgressDiagnostic({ source: 'ws', decision: 'drop_unknown_type', childId: normalizedChildId, revision });
      callbacks.onInvalidate();
    },
    reconnect: options.reconnect ?? { maxAttempts: 3 },
  });
  if (subscribePending) subscribe();
  activeChildConnection = { childId: normalizedChildId, connection };
  const originalClose = connection.close.bind(connection);
  return { ...connection, close(code?: number, reason?: string) { if (activeChildConnection?.connection === connection) activeChildConnection = null; originalClose(code, reason); } };
}

export function compareProjectionRevisions(left: string, right: string): -1 | 0 | 1 {
  const a = normalizeRevision(left); const b = normalizeRevision(right);
  if (a.length !== b.length) return a.length > b.length ? 1 : -1;
  return a === b ? 0 : a > b ? 1 : -1;
}

function incrementRevision(value: string): string { const digits = normalizeRevision(value).split(''); let carry = 1; for (let i = digits.length - 1; i >= 0 && carry; i -= 1) { const next = Number(digits[i]) + carry; digits[i] = String(next % 10); carry = next >= 10 ? 1 : 0; } if (carry) digits.unshift('1'); return digits.join(''); }
function normalizeRevision(value: string): string { return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, '') : '0'; }
function validRevision(value: unknown): string | null { return typeof value === 'string' && /^\d+$/.test(value) ? normalizeRevision(value) : null; }
function parentProgressUrl(baseUrl: string): string { const url = new URL(baseUrl); if (url.protocol === 'http:') url.protocol = 'ws:'; else if (url.protocol === 'https:') url.protocol = 'wss:'; if (url.protocol !== 'ws:' && url.protocol !== 'wss:') throw new Error('PARENT_PROGRESS_BASE_URL_UNSUPPORTED'); url.pathname = '/parent-progress'; url.search = ''; url.hash = ''; return url.toString(); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function record(value: unknown): Record<string, unknown> { return isRecord(value) ? value : {}; }
function isUpdateFrame(value: Record<string, unknown>): value is Record<string, unknown> & { sessionId: string | null; occurredAt: string; publishedAt: string; activeLearning: Record<string, unknown> | null } { return (typeof value.sessionId === 'string' || value.sessionId === null) && typeof value.occurredAt === 'string' && typeof value.publishedAt === 'string' && (value.activeLearning === null || isRecord(value.activeLearning)); }

function statusDiagnosticFields(status: ParentLearningStatus): { state?: string | null; stepId?: string | null; stepNumber?: number | null; percent?: number | null; terminalReady?: boolean } {
  return activeDiagnosticFields(status.activeLearning);
}

function activeDiagnosticFields(active: ParentActiveLearningDelta | ParentActiveLearning | null): { state?: string | null; stepId?: string | null; stepNumber?: number | null; percent?: number | null; terminalReady?: boolean } {
  if (active === null) return { state: null, stepId: null, stepNumber: null, percent: null };
  const state = typeof active.state === 'string' ? active.state : undefined;
  const stepId = active.currentStep && typeof active.currentStep.stepId === 'string' ? active.currentStep.stepId : active.currentStep === null ? null : undefined;
  const stepNumber = active.currentStep && typeof active.currentStep.stepNumber === 'number' ? active.currentStep.stepNumber : active.currentStep === null ? null : undefined;
  const percent = typeof active.positionPercent === 'number' ? active.positionPercent : undefined;
  const terminalReady = state === 'READY' && stepNumber === null;
  return { state, stepId, stepNumber, percent, ...(terminalReady ? { terminalReady } : {}) };
}

function isCompleteActiveLearning(active: ParentActiveLearningDelta): boolean {
  return typeof active.assignmentId === 'string'
    && (typeof active.sessionId === 'string' || active.sessionId === null)
    && typeof active.courseId === 'string'
    && typeof active.courseTitle === 'string'
    && typeof active.lessonId === 'string'
    && typeof active.lessonTitle === 'string'
    && typeof active.state === 'string'
    && (typeof active.startedAt === 'string' || active.startedAt === null)
    && (active.currentStep === null || (active.currentStep !== undefined && isCompleteStep(active.currentStep)))
    && typeof active.positionPercent === 'number'
    && typeof active.activeDurationSec === 'number';
}

function isCompleteStep(step: Partial<ParentLearningStep>): boolean {
  return typeof step.stepId === 'string'
    && typeof step.stepNumber === 'number'
    && typeof step.total === 'number'
    && typeof step.activityTitle === 'string'
    && typeof step.phase === 'string'
    && (typeof step.subject === 'string' || step.subject === null);
}

function parseActiveLearningDelta(value: Record<string, unknown>): ParentActiveLearningDelta | undefined {
  const delta: ParentActiveLearningDelta = {};
  const stringFields = ['assignmentId', 'courseId', 'courseTitle', 'lessonId', 'lessonTitle', 'state'] as const;
  for (const key of stringFields) {
    if (!(key in value)) continue;
    if (typeof value[key] !== 'string') return undefined;
    delta[key] = value[key];
  }
  for (const key of ['sessionId', 'startedAt'] as const) {
    if (!(key in value)) continue;
    if (value[key] !== null && typeof value[key] !== 'string') return undefined;
    delta[key] = value[key];
  }
  for (const key of ['positionPercent', 'activeDurationSec'] as const) {
    if (!(key in value)) continue;
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0) return undefined;
    delta[key] = value[key];
  }
  if ('currentStep' in value) {
    if (value.currentStep !== null && !isRecord(value.currentStep)) return undefined;
    if (value.currentStep === null) delta.currentStep = null;
    else {
      const step: Partial<ParentLearningStep> = {};
      for (const key of ['stepId', 'activityTitle', 'phase'] as const) {
        if (!(key in value.currentStep)) continue;
        if (typeof value.currentStep[key] !== 'string') return undefined;
        step[key] = value.currentStep[key];
      }
      if ('subject' in value.currentStep) {
        if (value.currentStep.subject !== null && typeof value.currentStep.subject !== 'string') return undefined;
        step.subject = value.currentStep.subject;
      }
      for (const key of ['stepNumber', 'total'] as const) {
        if (!(key in value.currentStep)) continue;
        if (typeof value.currentStep[key] !== 'number' || !Number.isFinite(value.currentStep[key]) || value.currentStep[key] < 0) return undefined;
        step[key] = value.currentStep[key];
      }
      delta.currentStep = step;
    }
  }
  return delta;
}
