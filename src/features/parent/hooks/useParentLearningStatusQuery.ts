import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getParentLearningStatus, type ParentLearningStatus } from '@/services/api/parentLearning.api';
import { openParentProgressRealtime } from '@/services/ws/parentProgressRealtime';

export const parentLearningStatusKey = (childId: string) => ['parent-learning-status', childId] as const;
const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'ABANDONED', 'CANCELLED']);

export function useParentLearningStatusQuery(childId: string | undefined): UseQueryResult<ParentLearningStatus, Error> {
  const queryClient = useQueryClient();
  const enabled = Boolean(childId);
  const query = useQuery<ParentLearningStatus, Error>({ queryKey: parentLearningStatusKey(childId ?? ''), queryFn: () => getParentLearningStatus(childId!), enabled });
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
    let disposed = false;
    let close: (() => void) | undefined;
    const cached = queryClient.getQueryData<ParentLearningStatus>(parentLearningStatusKey(childId));
    void openParentProgressRealtime(childId, cached?.projectionRevision ?? '0', {
      onStatus: (status) => { if (!disposed) queryClient.setQueryData(parentLearningStatusKey(childId), status); },
      onUpdate: (frame) => {
        if (disposed) return;
        queryClient.setQueryData<ParentLearningStatus>(parentLearningStatusKey(childId), (current) => {
          if (!current) return current;
          if (frame.activeLearning === null) return { ...current, activeLearning: null, projectionRevision: frame.projectionRevision };
          if (!current.activeLearning) {
            void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
            return current;
          }
          const { currentStep: stepDelta, ...activeDelta } = frame.activeLearning;
          const currentStep = !Object.prototype.hasOwnProperty.call(frame.activeLearning, 'currentStep')
            ? current.activeLearning.currentStep
            : stepDelta === null
              ? null
              : current.activeLearning.currentStep
                ? { ...current.activeLearning.currentStep, ...stepDelta }
                : null;
          if (stepDelta !== undefined && stepDelta !== null && !current.activeLearning.currentStep) {
            void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
          }
          return { ...current, activeLearning: { ...current.activeLearning, ...activeDelta, currentStep }, projectionRevision: frame.projectionRevision };
        });
      },
      onInvalidate: () => { if (!disposed) void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) }); },
      onAuthExpired: () => setSocketExhausted(false),
      onAccessRevoked: () => setSocketExhausted(false),
      onReconnectExhausted: () => setSocketExhausted(true),
      onHealthy: () => setSocketExhausted(false),
    }).then((connection) => {
      if (disposed) connection.close(1000, 'unmounted');
      else close = () => connection.close(1000, 'unmounted');
    }).catch(() => {
      if (disposed) return;
      setSocketExhausted(true);
      void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
    });
    return () => { disposed = true; close?.(); setSocketExhausted(false); };
  }, [childId, hasInitialStatus, queryClient]);

  const active = query.data?.activeLearning;
  const shouldPoll = Boolean(active && !TERMINAL_STATES.has(active.state) && foreground && socketExhausted);
  React.useEffect(() => {
    if (!shouldPoll || !childId) return undefined;
    const timer = setInterval(() => { void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) }); }, 10_000);
    return () => clearInterval(timer);
  }, [childId, queryClient, shouldPoll]);

  return query;
}
