import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Household, Child } from '../types';
import * as householdsApi from '../services/api/households';
import { useAuth } from './AuthContext';
import { normalizeError } from '../utils/errors';
import type { RootStackParamList } from '../navigation/routes';
import { replayRewardSeenQueue, setRewardQueueScope } from '@/features/rewards/offline/rewardSeenQueue';
import { captureError } from '@/services/observability/sentry';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete_v1';

// Mobile-local active-child selection. The backend active_child_id endpoint is
// currently unreliable, so the app owns this choice locally and persists it.
// On hydrate we read the last pick; resolution always falls back to children[0]
// when the stored id is missing/stale, so single-child households stay
// byte-identical to the old children[0] behavior.
const ACTIVE_CHILD_ID_KEY = 'active_child_id';

function readActiveChildIdFromStore(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_CHILD_ID_KEY).catch(() => null);
}

function writeActiveChildIdToStore(value: string | null): void {
  const op = value === null
    ? AsyncStorage.removeItem(ACTIVE_CHILD_ID_KEY)
    : AsyncStorage.setItem(ACTIVE_CHILD_ID_KEY, value);
  op.catch(() => { /* persistence best-effort — selection survives in-memory regardless */ });
}

async function readOnboardingCompleteFromStore(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY);
    return v === '1';
  } catch { return false; }
}

function writeOnboardingCompleteToStore(value: boolean): void {
  SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, value ? '1' : '0').catch(
    () => { /* persistence best-effort — stale state survives one cold start */ },
  );
}

export async function clearOnboardingCompleteStore(): Promise<void> {
  try { await SecureStore.deleteItemAsync(ONBOARDING_COMPLETE_KEY); } catch { /* noop */ }
}

interface HouseholdState {
  households: Household[];
  activeHousehold: Household | null;
  children: Child[];
  activeChildId: string | null;
  isLoading: boolean;
  error: string | null;
  onboardingComplete: boolean;
  pendingDeviceSetup: boolean;
  protectedInitialRoute?: keyof RootStackParamList;
}

interface HouseholdContextValue extends HouseholdState {
  // Resolved active child. Falls back to children[0] when the persisted id is
  // unset or no longer present, so multi-child families can pick who a lesson
  // is sent to / monitored, while single-child stays === children[0].
  activeChild: Child | null;
  setActiveChild: (id: string) => void;
  createHousehold: (name: string) => Promise<Household>;
  selectHousehold: (id: string) => void;
  addChild: (dto: { name: string; date_of_birth: string; vocabulary_level?: string; learning_style?: string }, householdId?: string) => Promise<Child>;
  refresh: () => Promise<void>;
  completeOnboarding: (protectedInitialRoute?: keyof RootStackParamList, withDeviceSetup?: boolean) => void;
  clearPendingDeviceSetup: () => void;
  protectedInitialRoute?: keyof RootStackParamList;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const rewardScopeRef = React.useRef<string | null>(null);
  const [state, setState] = useState<HouseholdState>({
    households: [],
    activeHousehold: null,
    children: [],
    activeChildId: null,
    isLoading: false,
    error: null,
    onboardingComplete: false,
    pendingDeviceSetup: false,
    protectedInitialRoute: undefined,
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));

    // Safety timeout bumped 5s → 12s: Render free-tier cold start can take
    // 8-10s, which previously kicked the user back to Onboarding.
    const timeout = setTimeout(() => {
      setState((s) => s.isLoading ? { ...s, isLoading: false } : s);
    }, 12000);

    try {
      const households = await householdsApi.list();
      clearTimeout(timeout);
      const active = households[0] ?? null;
      let childList: Child[] = [];
      if (active) {
        childList = await householdsApi.listChildren(active.id);
      }
      const completed = households.length > 0;
      if (completed) writeOnboardingCompleteToStore(true);
      setState((s) => ({
        ...s,
        households,
        activeHousehold: active,
        children: childList,
        isLoading: false,
        onboardingComplete: s.onboardingComplete || completed,
      }));
    } catch (err) {
      clearTimeout(timeout);
      const normalized = normalizeError(err);
      // On error, DO NOT flip onboardingComplete — a transient 401/timeout
      // used to force returning users back into Onboarding. Keep whatever
      // the persisted hydrate loaded.
      setState((s) => ({ ...s, error: normalized.message, isLoading: false }));
    }
  }, [isAuthenticated]);

  // Hydrate persisted onboardingComplete BEFORE any refresh runs, so cold
  // start of a returning user doesn't briefly show onboarding while
  // the API call is in flight.
  useEffect(() => {
    readOnboardingCompleteFromStore().then((persisted) => {
      if (persisted) setState((s) => (s.onboardingComplete ? s : { ...s, onboardingComplete: true }));
    });
  }, []);

  // Hydrate the persisted active-child pick. Stored as a raw id; resolution
  // against `children` (with children[0] fallback) happens at render below, so
  // a stale id never selects a child that no longer exists.
  useEffect(() => {
    readActiveChildIdFromStore().then((id) => {
      if (id) setState((s) => (s.activeChildId ? s : { ...s, activeChildId: id }));
    });
  }, []);

  useEffect(() => {
    // Wait for AuthContext to finish hydrating SecureStore before deciding
    // whether to refresh or clear account-scoped household data. The device
    // first-run flag remains independent from auth state.
    if (authLoading) return;
    if (isAuthenticated) {
      refresh();
    } else {
      setState((s) => ({
        ...s,
        households: [],
        activeHousehold: null,
        children: [],
        pendingDeviceSetup: false,
      }));
    }
  }, [isAuthenticated, authLoading, refresh]);

  useEffect(() => {
    const accountId = user?.id ?? null;
    const householdId = state.activeHousehold?.id ?? null;
    if (!isAuthenticated || !accountId || !householdId) {
      rewardScopeRef.current = null;
      setRewardQueueScope(accountId, null);
      return;
    }
    const scopeKey = `${accountId}:${householdId}`;
    if (rewardScopeRef.current === scopeKey) return;
    rewardScopeRef.current = scopeKey;
    setRewardQueueScope(accountId, householdId);
    replayRewardSeenQueue().catch(captureError);
  }, [isAuthenticated, state.activeHousehold?.id, user?.id]);

  const createHousehold = async (name: string): Promise<Household> => {
    const household = await householdsApi.create(name);
    // NOTE: Do NOT flip `onboardingComplete=true` here. The root stack
    // gates onboarding vs protected app on this flag, so toggling it
    // mid-flow unmounts onboarding and leaves the user unable to
    // navigate forward to AddChild → InterestSetup → DeviceSetupIntro.
    // The flag is intentionally set only by `completeOnboarding()` at
    // DeviceSetupIntroScreen (Skip / Pair). Cold-start protection for
    // returning users comes from the persisted-hydrate effect (line 104)
    // plus refresh()'s own write-on-success at line 82 — the auth-loading
    // guard at line 116 prevents the original B2 race that wiped the flag.
    setState((s) => ({
      ...s,
      households: [...s.households, household],
      activeHousehold: s.activeHousehold ?? household,
    }));
    return household;
  };

  const selectHousehold = (id: string) => {
    const found = state.households.find((h) => h.id === id);
    if (found) setState((s) => ({ ...s, activeHousehold: found }));
  };

  const setActiveChild = (id: string) => {
    // Only accept ids that are actually in the current children list; ignore
    // stale/foreign ids so the resolved activeChild can never go out of range.
    if (!state.children.some((c) => c.id === id)) return;
    writeActiveChildIdToStore(id);
    setState((s) => ({ ...s, activeChildId: id }));
  };

  const addChild = async (
    dto: { name: string; date_of_birth: string; vocabulary_level?: string; learning_style?: string },
    householdId?: string,
  ): Promise<Child> => {
    const targetHouseholdId = householdId ?? state.activeHousehold?.id;
    if (!targetHouseholdId) throw new Error('No active household');
    const child = await householdsApi.addChild(targetHouseholdId, dto);
    setState((s) => ({ ...s, children: [...s.children, child] }));
    return child;
  };

  const completeOnboarding = (protectedInitialRoute?: keyof RootStackParamList, withDeviceSetup = false) => {
    writeOnboardingCompleteToStore(true);
    setState((s) => ({ ...s, onboardingComplete: true, pendingDeviceSetup: withDeviceSetup, protectedInitialRoute }));
  };

  const clearPendingDeviceSetup = () => {
    setState((s) => ({ ...s, pendingDeviceSetup: false }));
  };

  // Resolve the active child: the persisted pick when it's still present,
  // otherwise children[0]. This keeps single-child households byte-identical to
  // the old children[0] reads (activeChild === children[0]).
  const activeChild =
    state.children.find((c) => c.id === state.activeChildId) ?? state.children[0] ?? null;

  return (
    <HouseholdContext.Provider value={{ ...state, activeChild, setActiveChild, createHousehold, selectHousehold, addChild, refresh, completeOnboarding, clearPendingDeviceSetup }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}

export function useOptionalHousehold(): HouseholdContextValue | undefined {
  return useContext(HouseholdContext);
}
