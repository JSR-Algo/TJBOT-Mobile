import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROUTE_MAP } from '@/navigation/routeMap';
import { ROUTES } from '@/navigation/routes';
import { deriveHomeState, useHomeState } from '@/features/home/hooks/useHomeState';
import { HOME_BACKEND_CONTRACT_AVAILABLE } from '@/services/api/home.api';

const ENTRY_ROLES = new Set(['tab', 'stack-entry', 'modal-entry', 'state-machine', 'fallback-entry']);

const baseChildren = [{ id: 'child-1', name: 'Mina' }];

describe('deriveHomeState', () => {
  it('documents that Home backend contract is unavailable instead of querying a throwing route', () => {
    expect(HOME_BACKEND_CONTRACT_AVAILABLE).toBe(false);
  });

  it('does not leave Home in loading state when the backend contract is unavailable', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result, unmount } = renderHook(() => useHomeState(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.variant).toBe('daily_available');

    unmount();
    queryClient.clear();
  });

  it('shows a dedicated zero-child state before lesson or robot actions', () => {
    const state = deriveHomeState({
      children: [],
      hub: { childName: '', streakDays: 0, todayMinutes: 0, nextLessonId: null },
    });

    expect(state.variant).toBe('zero_child');
    expect(state.cfg.ctaTarget).toBe(ROUTES.ParentSummaryScreen);
  });

  it('shows a dedicated multi-child selector state until a child is selected', () => {
    const state = deriveHomeState({
      children: [
        { id: 'child-1', name: 'Mina' },
        { id: 'child-2', name: 'Bao' },
      ],
      hub: { childName: 'Mina', streakDays: 2, todayMinutes: 7, nextLessonId: 'lesson-1' },
    });

    expect(state.variant).toBe('multiple_children');
    expect(state.showChildSelector).toBe(true);
    expect(state.children.map(child => child.name)).toEqual(['Mina', 'Bao']);
  });

  it('routes unpaired robot state to the device entry route', () => {
    const state = deriveHomeState({
      children: baseChildren,
      selectedChildId: 'child-1',
      hub: {
        childName: 'Mina',
        streakDays: 0,
        todayMinutes: 0,
        nextLessonId: null,
        robot: { paired: false, online: false },
      },
    });

    expect(state.variant).toBe('unpaired_robot');
    expect(state.cfg.ctaTarget).toBe(ROUTES.DeviceOverviewScreen);
  });

  it('separates recent offline and offline-over-24-hours states without panic copy', () => {
    const recent = deriveHomeState({
      now: '2026-05-14T10:00:00.000Z',
      children: baseChildren,
      selectedChildId: 'child-1',
      hub: {
        childName: 'Mina',
        streakDays: 0,
        todayMinutes: 0,
        nextLessonId: null,
        robot: { paired: true, online: false, lastSeenAt: '2026-05-14T08:00:00.000Z' },
      },
    });
    const stale = deriveHomeState({
      now: '2026-05-14T10:00:00.000Z',
      children: baseChildren,
      selectedChildId: 'child-1',
      hub: {
        childName: 'Mina',
        streakDays: 0,
        todayMinutes: 0,
        nextLessonId: null,
        robot: { paired: true, online: false, lastSeenAt: '2026-05-13T08:30:00.000Z' },
      },
    });

    expect(recent.variant).toBe('offline');
    expect(recent.cfg.chip?.text).toContain('reconnecting');
    expect(stale.variant).toBe('offline_24h');
    expect(stale.cfg.chip?.text).toContain('last seen');
    expect(stale.cfg.chip?.text.toLowerCase()).not.toContain('danger');
  });

  it('keeps parent pause and quiet-hours states visible even when the robot is offline', () => {
    const paused = deriveHomeState({
      children: baseChildren,
      selectedChildId: 'child-1',
      hub: {
        childName: 'Mina',
        streakDays: 0,
        todayMinutes: 0,
        nextLessonId: null,
        robot: { paired: true, online: false, paused: true },
      },
    });
    const quietHours = deriveHomeState({
      children: baseChildren,
      selectedChildId: 'child-1',
      hub: {
        childName: 'Mina',
        streakDays: 0,
        todayMinutes: 0,
        nextLessonId: null,
        robot: { paired: true, online: false, quietHoursActive: true },
      },
    });

    expect(paused.variant).toBe('paused');
    expect(quietHours.variant).toBe('quiet_hours');
  });

  it('uses refresh-oriented copy and target for Home error state', () => {
    const state = deriveHomeState({
      isError: true,
      children: baseChildren,
      selectedChildId: 'child-1',
      hub: { childName: 'Mina', streakDays: 0, todayMinutes: 0, nextLessonId: null },
    });

    expect(state.variant).toBe('error');
    expect(state.cfg.ctaLabel).toBe('Retry Home');
    expect(state.cfg.ctaTarget).toBe(ROUTES.HomeHubScreen);
  });

  it('keeps primary CTAs and quick actions on route-entry-safe targets', () => {
    const scenarios = [
      deriveHomeState({ children: [], hub: { childName: '', streakDays: 0, todayMinutes: 0, nextLessonId: null } }),
      deriveHomeState({
        children: baseChildren,
        selectedChildId: 'child-1',
        hub: { childName: 'Mina', streakDays: 1, todayMinutes: 0, nextLessonId: 'lesson-1' },
      }),
      deriveHomeState({
        children: baseChildren,
        selectedChildId: 'child-1',
        hub: { childName: 'Mina', streakDays: 1, todayMinutes: 10, nextLessonId: null, variant: 'completed_today' },
      }),
      deriveHomeState({
        children: baseChildren,
        selectedChildId: 'child-1',
        hub: {
          childName: 'Mina',
          streakDays: 0,
          todayMinutes: 0,
          nextLessonId: null,
          robot: { paired: false, online: false },
        },
      }),
    ];

    for (const scenario of scenarios) {
      const targets = [scenario.cfg.ctaTarget, ...scenario.cfg.quickActions.map(action => action.target)];
      for (const target of targets) {
        expect(ENTRY_ROLES.has(ROUTE_MAP[target].role)).toBe(true);
      }
    }
  });

  it('does not show guessed notification or review badges without a backend count route', () => {
    const state = deriveHomeState({
      children: baseChildren,
      selectedChildId: 'child-1',
      hub: { childName: 'Mina', streakDays: 1, todayMinutes: 0, nextLessonId: 'lesson-1' },
    });

    expect(state.cfg.reviewBadge).toBeNull();
    expect(state.cfg.courseBadge).toBeNull();
  });
});
