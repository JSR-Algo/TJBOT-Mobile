import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Household, Child } from '../types';
import * as householdsApi from '../services/api/households';
import { useAuth } from './AuthContext';
import { normalizeError } from '../utils/errors';
import type { RootStackParamList } from '../navigation/routes';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import { INVESTOR_DEMO_CHILD, INVESTOR_DEMO_HOUSEHOLD } from '@/demo/investorDemoSeed';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete_v1';
const HOUSEHOLDS_CACHE_KEY = '@tbot/household-context:households';

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
  addChild: (dto: { name: string; date_of_birth: string; buddy?: 'dog' | 'cat' | 'robot' }, householdId?: string) => Promise<Child>;
  refresh: () => Promise<void>;
  completeOnboarding: (protectedInitialRoute?: keyof RootStackParamList, withDeviceSetup?: boolean) => void;
  clearPendingDeviceSetup: () => void;
  protectedInitialRoute?: keyof RootStackParamList;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

function investorDemoHouseholdState(): HouseholdState {
  return {
    households: [INVESTOR_DEMO_HOUSEHOLD],
    activeHousehold: INVESTOR_DEMO_HOUSEHOLD,
    children: [INVESTOR_DEMO_CHILD],
    activeChildId: INVESTOR_DEMO_CHILD.id,
    isLoading: false,
    error: null,
    onboardingComplete: true,
    pendingDeviceSetup: false,
    protectedInitialRoute: undefined,
  };
}

export function HouseholdProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const investorDemo = isInvestorDemoEnabled();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<HouseholdState>(
    investorDemo ? investorDemoHouseholdState() : {
      households: [],
      activeHousehold: null,
      children: [],
      activeChildId: null,
      isLoading: false,
      error: null,
      onboardingComplete: false,
      pendingDeviceSetup: false,
      protectedInitialRoute: undefined,
    },
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const inferOnboardingFromNextAuthenticatedRefreshRef = useRef(true);

  // Hydrate persisted household list and onboarding flag before any API call,
  // so returning users see cached data immediately while fresh data refreshes.
  useEffect(() => {
    if (investorDemo) return undefined;
    let cancelled = false;

    Promise.all([
      readOnboardingCompleteFromStore(),
      AsyncStorage.getItem(HOUSEHOLDS_CACHE_KEY),
    ]).then(([persistedFlag, cachedHouseholds]) => {
      if (cancelled) return;

      setState((s) => {
        if (s.households.length > 0) return s; // API already won the race
        const households = cachedHouseholds ? (JSON.parse(cachedHouseholds) as Household[]) : [];
        const nextOnboardingComplete = persistedFlag || s.onboardingComplete;
        if (
          households.length === 0 &&
          s.households.length === 0 &&
          s.activeHousehold === null &&
          nextOnboardingComplete === s.onboardingComplete
        ) {
          return s;
        }
        return {
          ...s,
          households,
          activeHousehold: households[0] ?? null,
          onboardingComplete: nextOnboardingComplete,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [investorDemo]);

  const refresh = useCallback(async () => {
    if (investorDemo) return;
    if (!isAuthenticated) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    const shouldInferOnboardingCompletion = inferOnboardingFromNextAuthenticatedRefreshRef.current;
    if (shouldInferOnboardingCompletion) {
      inferOnboardingFromNextAuthenticatedRefreshRef.current = false;
    }
    setState((s) => ({
      ...s,
      // RootStackNavigator treats this as a blocking initial load and
      // temporarily unmounts the active navigator. Once a household exists,
      // refresh in the background so onboarding form state is not reset.
      isLoading: s.households.length === 0 && s.activeHousehold === null,
      error: null,
    }));

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const activeHouseholdId = state.activeHousehold?.id;
      const [households, childList] = await Promise.all([
        householdsApi.list(controller.signal),
        activeHouseholdId
          ? householdsApi.listChildren(activeHouseholdId, controller.signal)
          : Promise.resolve<Child[]>([]),
      ]);

      const active = households[0] ?? null;
      const completed = shouldInferOnboardingCompletion && households.length > 0;
      if (completed) {
        writeOnboardingCompleteToStore(true);
        AsyncStorage.setItem(HOUSEHOLDS_CACHE_KEY, JSON.stringify(households)).catch(
          () => { /* cache write is best-effort */ },
        );
      }
      setState((s) => ({
        ...s,
        households,
        activeHousehold: active,
        children: childList,
        isLoading: false,
        onboardingComplete: s.onboardingComplete || completed,
      }));
    } catch (err) {
      if (
        shouldInferOnboardingCompletion &&
        abortControllerRef.current === controller
      ) {
        inferOnboardingFromNextAuthenticatedRefreshRef.current = true;
      }
      const normalized = normalizeError(err);
      // On error, DO NOT flip onboardingComplete — a transient 401/timeout
      // used to force returning users back into Onboarding. Keep whatever
      // the persisted hydrate loaded.
      setState((s) => ({ ...s, error: normalized.message, isLoading: false }));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [investorDemo, isAuthenticated, state.activeHousehold?.id]);

  // Hydrate the persisted active-child pick. Stored as a raw id; resolution
  // against `children` (with children[0] fallback) happens at render below, so
  // a stale id never selects a child that no longer exists.
  useEffect(() => {
    if (investorDemo) return undefined;
    readActiveChildIdFromStore().then((id) => {
      if (id) setState((s) => (s.activeChildId ? s : { ...s, activeChildId: id }));
    });
  }, [investorDemo]);

  useEffect(() => {
    if (investorDemo) return undefined;
    // Wait for AuthContext to finish hydrating SecureStore before deciding
    // whether to refresh or clear account-scoped household data. The device
    // first-run flag remains independent from auth state.
    if (authLoading) return;
    if (isAuthenticated) {
      refresh();
    } else {
      inferOnboardingFromNextAuthenticatedRefreshRef.current = true;
      setState((s) => {
        if (
          s.households.length === 0 &&
          s.activeHousehold === null &&
          s.children.length === 0 &&
          !s.pendingDeviceSetup
        ) {
          return s;
        }
        return {
          ...s,
          households: [],
          activeHousehold: null,
          children: [],
          pendingDeviceSetup: false,
        };
      });
    }
  }, [investorDemo, isAuthenticated, authLoading, refresh]);

  // Cancel any in-flight refresh when the provider unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const createHousehold = useCallback(async (name: string): Promise<Household> => {
    const household = await householdsApi.create(name);
    // NOTE: Do NOT flip `onboardingComplete=true` here. The root stack
    // gates onboarding vs protected app on this flag, so toggling it
    // mid-flow unmounts onboarding and leaves the user unable to
    // navigate forward to AddChild → InterestSetup → DeviceSetupIntro.
    // The flag is intentionally set only by `completeOnboarding()` at
    // DeviceSetupIntroScreen (Skip / Pair). Cold-start protection for
    // returning users comes from the persisted-hydrate effect
    // plus refresh()'s own write-on-success — the auth-loading
    // guard prevents the original B2 race that wiped the flag.
    setState((s) => ({
      ...s,
      households: [...s.households, household],
      activeHousehold: s.activeHousehold ?? household,
    }));
    return household;
  }, []);

  const selectHousehold = useCallback((id: string) => {
    setState((s) => {
      const found = s.households.find((h) => h.id === id);
      return found ? { ...s, activeHousehold: found } : s;
    });
  }, []);

  const setActiveChild = useCallback((id: string) => {
    // Only accept ids that are actually in the current children list; ignore
    // stale/foreign ids so the resolved activeChild can never go out of range.
    if (!state.children.some((c) => c.id === id)) return;
    writeActiveChildIdToStore(id);
    setState((s) => ({ ...s, activeChildId: id }));
  }, [state.children]);

  const addChild = useCallback(async (
    dto: { name: string; date_of_birth: string; buddy?: 'dog' | 'cat' | 'robot' },
    householdId?: string,
  ): Promise<Child> => {
    const targetHouseholdId = householdId ?? state.activeHousehold?.id;
    if (!targetHouseholdId) throw new Error('No active household');
    const child = await householdsApi.addChild(targetHouseholdId, dto);
    setState((s) => ({ ...s, children: [...s.children, child] }));
    return child;
  }, [state.activeHousehold?.id]);

  const completeOnboarding = useCallback((protectedInitialRoute?: keyof RootStackParamList, withDeviceSetup = false) => {
    writeOnboardingCompleteToStore(true);
    setState((s) => ({ ...s, onboardingComplete: true, pendingDeviceSetup: withDeviceSetup, protectedInitialRoute }));
  }, []);

  const clearPendingDeviceSetup = useCallback(() => {
    setState((s) => ({ ...s, pendingDeviceSetup: false }));
  }, []);

  // Resolve the active child: the persisted pick when it's still present,
  // otherwise children[0]. This keeps single-child households byte-identical to
  // the old children[0] reads (activeChild === children[0]).
  const activeChild =
    state.children.find((c) => c.id === state.activeChildId) ?? state.children[0] ?? null;

  const value = useMemo<HouseholdContextValue>(() => ({
    ...state,
    activeChild,
    setActiveChild,
    createHousehold,
    selectHousehold,
    addChild,
    refresh,
    completeOnboarding,
    clearPendingDeviceSetup,
  }), [state, activeChild, setActiveChild, createHousehold, selectHousehold, addChild, refresh, completeOnboarding, clearPendingDeviceSetup]);

  return (
    <HouseholdContext.Provider value={value}>
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
