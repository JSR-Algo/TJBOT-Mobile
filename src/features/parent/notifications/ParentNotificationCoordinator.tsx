import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { usePushNotifications, getLastPushNotificationPayload } from '@/hooks/usePushNotifications';
import { parentReportTargetForDeepLinkUrl, type ParentReportDeepLinkTarget } from '@/navigation/linking';
import { dispatchDeepLinkTarget } from '@/navigation/AppNavigator';
import { ROUTES } from '@/navigation/routes';
import { appQueryClient } from '@/services/query/queryClient';
import { captureError } from '@/services/observability/sentry';
import { parentLearningHistoryKey } from '../hooks/useParentLearningHistoryQuery';
import { parentLearningStatusKey } from '../hooks/useParentLearningStatusQuery';
import { parentSessionReportKey } from '../hooks/useParentSessionReportQuery';

const DEDUPE_STORAGE_KEY = 'parent_notification_dedupe_v1';

export type ParentReportNotificationTarget = ParentReportDeepLinkTarget & {
  readonly notificationId: string;
};

type CoordinatorState = {
  readonly authLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly householdLoading: boolean;
  readonly activeHouseholdId: string | null;
  readonly activeChildId?: string | null;
  readonly children: ReadonlyArray<{ readonly id: string; readonly householdId: string }>;
};

export function reconcileParentReportTarget(
  target: ParentReportNotificationTarget,
  state: CoordinatorState,
): 'queue' | 'navigate' | 'drop' {
  if (state.authLoading || state.householdLoading) return 'queue';
  if (!state.isAuthenticated || !state.activeHouseholdId) return 'drop';
  return state.children.some(child => child.id === target.childId && child.householdId === state.activeHouseholdId)
    ? 'navigate'
    : 'drop';
}

type DedupeStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function createNotificationDedupe(
  storage: DedupeStorage,
  maxEntries = 100,
  onError: (error: unknown) => void = captureError,
) {
  let serial = Promise.resolve();
  const reportError = (error: unknown): void => {
    try { onError(error); } catch { /* notification delivery must remain fail-open */ }
  };
  return {
    claim(scope: 'presentation' | 'foreground' | 'navigation', notificationId: string): Promise<boolean> {
      let claimed = false;
      serial = serial.then(async () => {
        let entries: string[] = [];
        try {
          const raw = await storage.getItem(DEDUPE_STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) entries = parsed.filter(value => typeof value === 'string');
        } catch (error) {
          reportError(error);
          entries = [];
        }
        const key = `${scope}:${notificationId}`;
        if (entries.includes(key)) return;
        claimed = true;
        entries.push(key);
        try {
          await storage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(entries.slice(-Math.max(1, maxEntries))));
        } catch (error) {
          reportError(error);
        }
      }, async (error) => {
        reportError(error);
        claimed = true;
      });
      return serial.then(() => claimed);
    },
  };
}

export function invalidateCompletedLessonQueries(queryClient: QueryClient, childId: string, sessionId: string): void {
  void queryClient.invalidateQueries({ queryKey: parentLearningStatusKey(childId) });
  void queryClient.invalidateQueries({ queryKey: parentSessionReportKey(childId, sessionId) });
  void queryClient.invalidateQueries({ queryKey: parentLearningHistoryKey(childId) });
  void queryClient.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
  queryClient.removeQueries({ queryKey: ['child-progress-dashboard', 'child', childId], exact: true });
}

type NotificationLifecycleDeps = {
  readonly dedupe: {
    claim: (scope: 'presentation' | 'foreground' | 'navigation', notificationId: string) => Promise<boolean>;
  };
  readonly invalidate: (childId: string, sessionId: string) => void;
  readonly enqueue: (target: ParentReportNotificationTarget) => void;
};

function targetFromPayload(payload: Record<string, unknown>): ParentReportNotificationTarget | null {
  const notificationId = typeof payload.notificationId === 'string' && payload.notificationId.length > 0
    ? payload.notificationId
    : typeof payload.notification_id === 'string' && payload.notification_id.length > 0
      ? payload.notification_id
      : null;
  if (!notificationId) return null;
  const deepLink = typeof payload.deepLink === 'string'
    ? payload.deepLink
    : typeof payload.url === 'string'
      ? payload.url
      : null;
  if (!deepLink) return null;
  const parsed = parentReportTargetForDeepLinkUrl(deepLink);
  if (!parsed) return null;
  return { ...parsed, notificationId };
}

export function createParentNotificationLifecycle(deps: NotificationLifecycleDeps) {
  return {
    async foreground(payload: Record<string, unknown>): Promise<void> {
      const target = targetFromPayload(payload);
      if (!target || !(await deps.dedupe.claim('foreground', target.notificationId))) return;
      deps.invalidate(target.childId, target.sessionId);
    },
    async tap(payload: Record<string, unknown>): Promise<void> {
      const target = targetFromPayload(payload);
      if (!target || !(await deps.dedupe.claim('navigation', target.notificationId))) return;
      deps.enqueue(target);
    },
    async link(url: string): Promise<void> {
      const parsed = parentReportTargetForDeepLinkUrl(url);
      if (!parsed) return;
      deps.enqueue({ ...parsed, notificationId: `deep-link:${url}` });
    },
  };
}

const notificationDedupe = createNotificationDedupe(AsyncStorage);

export default function ParentNotificationCoordinator(): null {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeChild, activeHousehold, children, isLoading: householdLoading } = useHousehold();
  const [pending, setPending] = React.useState<ParentReportNotificationTarget | null>(null);
  const lifecycle = React.useMemo(() => createParentNotificationLifecycle({
    dedupe: notificationDedupe,
    invalidate: (childId, sessionId) => invalidateCompletedLessonQueries(appQueryClient, childId, sessionId),
    enqueue: setPending,
  }), []);

  usePushNotifications({
    dedupe: notificationDedupe,
    onForeground: lifecycle.foreground,
    onTap: lifecycle.tap,
  });

  React.useEffect(() => {
    let active = true;
    void getLastPushNotificationPayload().then(payload => {
      if (active && payload) void lifecycle.tap(payload);
    });
    void Linking.getInitialURL().then(url => {
      if (active && url) void lifecycle.link(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => { void lifecycle.link(url); });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [lifecycle]);

  React.useEffect(() => {
    if (!pending) return undefined;
    const decision = reconcileParentReportTarget(pending, {
      authLoading,
      isAuthenticated,
      householdLoading,
      activeHouseholdId: activeHousehold?.id ?? null,
      activeChildId: activeChild?.id ?? null,
      children: children.map(child => ({ id: child.id, householdId: child.household_id })),
    });
    if (decision === 'drop') {
      setPending(null);
      return undefined;
    }
    if (decision === 'queue') return undefined;

    const navigate = () => dispatchDeepLinkTarget({
      name: ROUTES.ParentSessionReportScreen,
      params: { childId: pending.childId, sessionId: pending.sessionId },
    });
    if (navigate()) {
      setPending(null);
      return undefined;
    }
    const retry = setInterval(() => {
      if (navigate()) setPending(null);
    }, 100);
    return () => clearInterval(retry);
  }, [activeChild?.id, activeHousehold?.id, authLoading, children, householdLoading, isAuthenticated, pending]);

  return null;
}
