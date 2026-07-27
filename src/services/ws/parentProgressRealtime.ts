import { Config } from '@/config';
import { normalizeParentLearningStatus, type ParentActiveLearning, type ParentLearningStatus } from '@/services/api/parentLearning.api';
import { createReconnectingSocket, type CreateReconnectingSocketOptions, type RealtimeConnection } from '@/services/ws/realtime';

export interface ParentProgressSnapshotFrame { type: 'lesson.progress.snapshot'; childId: string; projectionRevision: string; status: ParentLearningStatus }
export interface ParentProgressUpdatedFrame { type: 'lesson.progress.updated'; childId: string; sessionId: string | null; projectionRevision: string; occurredAt: string; publishedAt: string; activeLearning: ParentActiveLearning | null }
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
  if (activeChildConnection && activeChildConnection.childId !== normalizedChildId) activeChildConnection.connection.close(1000, 'child switched');
  const connection: RealtimeConnection = await createReconnectingSocket(parentProgressUrl(options.baseUrl ?? Config.API_BASE_URL), {
    ...options,
    continueAfterReconnectExhausted: true,
    onOpen: () => {
      connection.send({ type: 'subscribe', childId: normalizedChildId, lastProjectionRevision: currentRevision });
      callbacks.onHealthy?.();
    },
    onReconnect: () => { callbacks.onReconnect?.(); callbacks.onInvalidate(); },
    onReconnectExhausted: callbacks.onReconnectExhausted,
    onClose: (event) => {
      if (event.code === 4401) callbacks.onAuthExpired();
      if (event.code === 4403) callbacks.onAccessRevoked();
    },
    shouldReconnect: (event) => event.code !== 4401 && event.code !== 4403,
    onMessage: (event) => {
      let raw: unknown;
      try { raw = JSON.parse(event.data) as unknown; } catch { callbacks.onInvalidate(); return; }
      const frame = record(raw);
      const revision = validRevision(frame.projectionRevision);
      if (frame.childId !== normalizedChildId || revision === null) { callbacks.onInvalidate(); return; }
      if (frame.type === 'lesson.progress.snapshot') {
        if (compareProjectionRevisions(revision, currentRevision) <= 0) return;
        if (!isRecord(frame.status)) { callbacks.onInvalidate(); return; }
        const status = normalizeParentLearningStatus(frame.status);
        if (status.projectionRevision !== revision) { callbacks.onInvalidate(); return; }
        currentRevision = revision;
        callbacks.onStatus(status);
        return;
      }
      if (frame.type === 'lesson.progress.updated') {
        const comparison = compareProjectionRevisions(revision, currentRevision);
        if (comparison <= 0) return;
        if (revision !== incrementRevision(currentRevision) || !isUpdateFrame(frame)) { callbacks.onInvalidate(); return; }
        currentRevision = revision;
        callbacks.onUpdate?.({ type: 'lesson.progress.updated', childId: normalizedChildId, sessionId: frame.sessionId, projectionRevision: revision, occurredAt: frame.occurredAt, publishedAt: frame.publishedAt, activeLearning: frame.activeLearning === null ? null : normalizeParentLearningStatus({ activeLearning: frame.activeLearning, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: revision }).activeLearning });
        return;
      }
      callbacks.onInvalidate();
    },
    reconnect: options.reconnect ?? { maxAttempts: 3 },
  });
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
function isUpdateFrame(value: Record<string, unknown>): value is Record<string, unknown> & { sessionId: string | null; occurredAt: string; publishedAt: string; activeLearning: unknown } { return (typeof value.sessionId === 'string' || value.sessionId === null) && typeof value.occurredAt === 'string' && typeof value.publishedAt === 'string' && (value.activeLearning === null || isRecord(value.activeLearning)); }
