import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getParentLearningStatus, type ParentActiveLearning, type ParentLearningStatus, type ParentLearningStep } from '@/services/api/parentLearning.api';
import { compareProjectionRevisions, openParentProgressRealtime, type ParentActiveLearningDelta, type ParentProgressUpdatedFrame } from '@/services/ws/parentProgressRealtime';
import type { RealtimeConnection } from '@/services/ws/realtime';
import { parentLearningHistoryKey } from './useParentLearningHistoryQuery';

export const parentLearningStatusKey = (childId: string) => ['parent-learning-status', childId] as const;
const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'ABANDONED', 'CANCELLED']);

function invalidateDependentProgress(queryClient: QueryClient, childId: string): void {
  void queryClient.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
  queryClient.removeQueries({ queryKey: ['child-progress-dashboard', 'child', childId], exact: true });
}

interface SharedRealtimeEntry {
  refs: number;
  listeners: Set<(exhausted: boolean) => void>;
  connection: Promise<RealtimeConnection | null>;
  resolved?: RealtimeConnection | null;
}

const sharedRealtimeByClient = new WeakMap<QueryClient, Map<string, SharedRealtimeEntry>>();

function newestParentLearningStatus(
  current: ParentLearningStatus | undefined,
  incoming: ParentLearningStatus,
): ParentLearningStatus {
  if (!current) return incoming;
  return compareProjectionRevisions(incoming.projectionRevision, current.projectionRevision) < 0
    ? current
    : incoming;
}

function isCompleteCurrentStep(step: Partial<ParentLearningStep>): step is ParentLearningStep {
  return typeof step.stepId === 'string'
    && step.stepId.trim().length > 0
    && typeof step.stepNumber === 'number'
    && Number.isFinite(step.stepNumber)
    && step.stepNumber >= 0
    && typeof step.total === 'number'
    && Number.isFinite(step.total)
    && step.total >= 0
    && typeof step.activityTitle === 'string'
    && typeof step.phase === 'string'
    && (typeof step.subject === 'string' || step.subject === null);
}

function isCompleteActiveLearning(active: ParentActiveLearningDelta): active is ParentActiveLearning {
  return typeof active.assignmentId === 'string'
    && (typeof active.sessionId === 'string' || active.sessionId === null)
    && typeof active.courseId === 'string'
    && typeof active.courseTitle === 'string'
    && typeof active.lessonId === 'string'
    && typeof active.lessonTitle === 'string'
    && typeof active.state === 'string'
    && (typeof active.startedAt === 'string' || active.startedAt === null)
    && (active.currentStep === null || (active.currentStep !== undefined && isCompleteCurrentStep(active.currentStep)))
    && typeof active.positionPercent === 'number'
    && Number.isFinite(active.positionPercent)
    && typeof active.activeDurationSec === 'number'
    && Number.isFinite(active.activeDurationSec);
}

function mergeRealtimeUpdate(queryClient: QueryClient, childId: string, frame: ParentProgressUpdatedFrame): void {
  const terminalUpdate = frame.activeLearning === null
    || (frame.activeLearning.state !== undefined && TERMINAL_STATES.has(frame.activeLearning.state));
  queryClient.setQueryData<ParentLearningStatus>(parentLearningStatusKey(childId), (current) => {
    if (!current) return current;
    if (compareProjectionRevisions(frame.projectionRevision, current.projectionRevision) < 0) return current;
    if (terminalUpdate) return { ...current, activeLearning: null, projectionRevision: frame.projectionRevision };
    if (frame.activeLearning === null) return current;
    if (!current.activeLearning) {
      if (!isCompleteActiveLearning(frame.activeLearning)) return current;
      return { ...current, activeLearning: frame.activeLearning, projectionRevision: frame.projectionRevision };
    }
    const { currentStep: stepDelta, ...activeDelta } = frame.activeLearning;
    const currentStep = !Object.prototype.hasOwnProperty.call(frame.activeLearning, 'currentStep')
      ? current.activeLearning.currentStep
      : stepDelta === null
        ? null
        : current.activeLearning.currentStep
          ? { ...current.activeLearning.currentStep, ...stepDelta }
          : stepDelta !== undefined && isCompleteCurrentStep(stepDelta)
            ? stepDelta
            : null;
    return { ...current, activeLearning: { ...current.activeLearning, ...activeDelta, currentStep }, projectionRevision: frame.projectionRevision };
  });
  void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
  if (terminalUpdate) {
    void queryClient.invalidateQueries({ queryKey: parentLearningHistoryKey(childId) });
  }
  invalidateDependentProgress(queryClient, childId);
}

function acquireParentRealtime(queryClient: QueryClient, childId: string, revision: string, listener: (exhausted: boolean) => void): () => void {
  let entries = sharedRealtimeByClient.get(queryClient);
  if (!entries) { entries = new Map(); sharedRealtimeByClient.set(queryClient, entries); }
  const existing = entries.get(childId);
  if (existing) {
    existing.refs += 1;
    existing.listeners.add(listener);
    return () => releaseParentRealtime(entries!, childId, existing, listener);
  }
  const listeners = new Set<(exhausted: boolean) => void>([listener]);
  const broadcast = (value: boolean) => listeners.forEach(notify => notify(value));
  const entry: SharedRealtimeEntry = { refs: 1, listeners, connection: Promise.resolve(null) };
  entry.connection = openParentProgressRealtime(childId, revision, {
      onStatus: (status) => {
        queryClient.setQueryData<ParentLearningStatus>(
          parentLearningStatusKey(childId),
          current => newestParentLearningStatus(current, status),
        );
        invalidateDependentProgress(queryClient, childId);
      },
      onUpdate: (frame) => mergeRealtimeUpdate(queryClient, childId, frame),
      onInvalidate: () => { void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) }); invalidateDependentProgress(queryClient, childId); },
      onAuthExpired: () => {
        broadcast(true);
        void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
      },
      onAccessRevoked: () => broadcast(false), onReconnectExhausted: () => broadcast(true), onHealthy: () => broadcast(false),
    }).then(connection => { entry.resolved = connection; return connection; })
    .catch(() => { entry.resolved = null; broadcast(true); void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) }); return null; });
  entries.set(childId, entry);
  return () => releaseParentRealtime(entries!, childId, entry, listener);
}

function releaseParentRealtime(entries: Map<string, SharedRealtimeEntry>, childId: string, entry: SharedRealtimeEntry, listener: (exhausted: boolean) => void): void {
  entry.listeners.delete(listener);
  entry.refs -= 1;
  if (entry.refs > 0) return;
  entries.delete(childId);
  if (entry.resolved) entry.resolved.close(1000, 'unmounted');
  else void entry.connection.then(connection => connection?.close(1000, 'unmounted'));
}

export type ParentLearningStatusQueryOptions = {
  reconcileWhileActive?: boolean;
};

export function useParentLearningStatusQuery(
  childId: string | undefined,
  options: ParentLearningStatusQueryOptions = {},
): UseQueryResult<ParentLearningStatus, Error> {
  const queryClient = useQueryClient();
  const enabled = Boolean(childId);
  const query = useQuery<ParentLearningStatus, Error>({
    queryKey: parentLearningStatusKey(childId ?? ''),
    queryFn: async () => {
      const incoming = await getParentLearningStatus(childId!);
      const current = queryClient.getQueryData<ParentLearningStatus>(parentLearningStatusKey(childId!));
      return newestParentLearningStatus(current, incoming);
    },
    enabled,
  });
  const [foreground, setForeground] = React.useState(AppState.currentState === 'active');
  const [socketExhausted, setSocketExhausted] = React.useState(false);
  const hasInitialStatus = query.data !== undefined;

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      const isForeground = state === 'active';
      setForeground(isForeground);
      if (isForeground && childId) void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
    });
    return () => subscription.remove();
  }, [childId, queryClient]);

  React.useEffect(() => {
    if (!childId || !hasInitialStatus) return undefined;
    const cached = queryClient.getQueryData<ParentLearningStatus>(parentLearningStatusKey(childId));
    const release = acquireParentRealtime(queryClient, childId, cached?.projectionRevision ?? '0', setSocketExhausted);
    return () => { release(); setSocketExhausted(false); };
  }, [childId, hasInitialStatus, queryClient]);

  const active = query.data?.activeLearning;
  const shouldPoll = Boolean(
    active
    && !TERMINAL_STATES.has(active.state)
    && foreground
    && (socketExhausted || options.reconcileWhileActive),
  );
  React.useEffect(() => {
    if (!shouldPoll || !childId) return undefined;
    const timer = setInterval(() => { void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) }); }, 10_000);
    return () => clearInterval(timer);
  }, [childId, queryClient, shouldPoll]);

  return query;
}
