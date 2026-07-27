import type { QueryClient } from '@tanstack/react-query';
import {
  createNotificationDedupe,
  createParentNotificationLifecycle,
  invalidateCompletedLessonQueries,
  reconcileParentReportTarget,
  type ParentReportNotificationTarget,
} from '../../../src/features/parent/notifications/ParentNotificationCoordinator';

const target: ParentReportNotificationTarget = {
  childId: 'child-1',
  sessionId: 'session-1',
  notificationId: 'completed-session-1',
};

describe('parent notification coordinator', () => {
  it('queues until auth and household hydration complete, then replays for a current member', () => {
    expect(reconcileParentReportTarget(target, {
      authLoading: true,
      isAuthenticated: false,
      householdLoading: true,
      activeHouseholdId: null,
      children: [],
    })).toBe('queue');

    expect(reconcileParentReportTarget(target, {
      authLoading: false,
      isAuthenticated: true,
      householdLoading: false,
      activeHouseholdId: 'house-1',
      children: [{ id: 'child-1', householdId: 'house-1' }],
    })).toBe('navigate');
  });

  it('drops queued targets after logout or membership/household changes', () => {
    expect(reconcileParentReportTarget(target, {
      authLoading: false,
      isAuthenticated: false,
      householdLoading: false,
      activeHouseholdId: null,
      children: [],
    })).toBe('drop');
    expect(reconcileParentReportTarget(target, {
      authLoading: false,
      isAuthenticated: true,
      householdLoading: false,
      activeHouseholdId: 'house-2',
      children: [{ id: 'child-1', householdId: 'house-1' }],
    })).toBe('drop');
    expect(reconcileParentReportTarget(target, {
      authLoading: false,
      isAuthenticated: true,
      householdLoading: false,
      activeHouseholdId: 'house-1',
      children: [{ id: 'child-2', householdId: 'house-1' }],
    })).toBe('drop');
  });

  it('allows a current household child even when another child is active', () => {
    expect(reconcileParentReportTarget(target, {
      authLoading: false,
      isAuthenticated: true,
      householdLoading: false,
      activeHouseholdId: 'house-1',
      activeChildId: 'child-2',
      children: [
        { id: 'child-1', householdId: 'house-1' },
        { id: 'child-2', householdId: 'house-1' },
      ],
    })).toBe('navigate');
  });

  it('persists bounded dedupe independently for presentation and navigation', async () => {
    let persisted: string | null = null;
    const storage = {
      getItem: jest.fn(async () => persisted),
      setItem: jest.fn(async (_key: string, value: string) => { persisted = value; }),
    };
    const dedupe = createNotificationDedupe(storage, 2);

    await expect(dedupe.claim('presentation', 'n-1')).resolves.toBe(true);
    await expect(dedupe.claim('presentation', 'n-1')).resolves.toBe(false);
    await expect(dedupe.claim('navigation', 'n-1')).resolves.toBe(true);
    await dedupe.claim('presentation', 'n-2');
    await dedupe.claim('presentation', 'n-3');

    expect(JSON.parse(persisted!)).toEqual([
      'presentation:n-2',
      'presentation:n-3',
    ]);
  });

  it('invalidates canonical status/report/history and dependent course progress keys', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const removeQueries = jest.fn();
    invalidateCompletedLessonQueries({ invalidateQueries, removeQueries } as unknown as QueryClient, 'child-1', 'session-1');
    await Promise.resolve();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parent-learning-status', 'child-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parent-session-report', 'child-1', 'session-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parent-learning-history', 'child-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['lesson-progress', 'child', 'child-1'] });
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['child-progress-dashboard', 'child', 'child-1'], exact: true });
  });

  it('invalidates one foreground delivery and navigates one cold/background tap', async () => {
    const claims = new Set<string>();
    const dedupe = {
      claim: jest.fn(async (scope: string, id: string) => {
        const key = `${scope}:${id}`;
        if (claims.has(key)) return false;
        claims.add(key);
        return true;
      }),
    };
    const invalidate = jest.fn();
    const enqueue = jest.fn();
    const lifecycle = createParentNotificationLifecycle({ dedupe, invalidate, enqueue });
    const payload = {
      notificationId: 'completed-session-1',
      deepLink: 'TJBot://parent/children/child-1/sessions/session-1/report',
    };

    await lifecycle.foreground(payload);
    await lifecycle.foreground(payload);
    await lifecycle.tap(payload);
    await lifecycle.tap(payload);

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith('child-1', 'session-1');
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(target);
  });

  it('ignores report payloads without the stable provider notification id', async () => {
    const invalidate = jest.fn();
    const enqueue = jest.fn();
    const lifecycle = createParentNotificationLifecycle({
      dedupe: { claim: jest.fn().mockResolvedValue(true) },
      invalidate,
      enqueue,
    });

    await lifecycle.foreground({ deepLink: 'TJBot://parent/children/child-1/sessions/session-1/report' });
    await lifecycle.tap({ childId: 'child-1', sessionId: 'session-1' });

    expect(invalidate).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects malformed explicit report links instead of falling back to loose ids', async () => {
    const enqueue = jest.fn();
    const lifecycle = createParentNotificationLifecycle({
      dedupe: { claim: jest.fn().mockResolvedValue(true) },
      invalidate: jest.fn(),
      enqueue,
    });

    await lifecycle.tap({
      notificationId: 'n-1', childId: 'child-1', sessionId: 'session-1',
      deepLink: 'TJBot://parent/children/child-1/sessions/session-1/report/extra',
    });

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('queues exact direct links without requiring a provider notification id', async () => {
    const enqueue = jest.fn();
    const lifecycle = createParentNotificationLifecycle({
      dedupe: { claim: jest.fn().mockResolvedValue(true) },
      invalidate: jest.fn(),
      enqueue,
    });

    await lifecycle.link('TJBot://parent/children/child-1/sessions/session-1/report');
    await lifecycle.link('TJBot://parent/children/child-1/sessions/session-1/report/extra');

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ childId: 'child-1', sessionId: 'session-1' }));
  });
});
