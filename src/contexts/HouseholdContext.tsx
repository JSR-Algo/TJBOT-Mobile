import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Household, Child } from '../types';
import * as householdsApi from '../services/api/households';
import { useAuth } from './AuthContext';
import { normalizeError } from '../utils/errors';
import type { RootStackParamList } from '../navigation/routes';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete_v1';
const HOUSEHOLDS_CACHE_KEY = '@tbot/household-context:households';

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
  isLoading: boolean;
  error: string | null;
  onboardingComplete: boolean;
  pendingDeviceSetup: boolean;
  protectedInitialRoute?: keyof RootStackParamList;
}

interface HouseholdContextValue extends HouseholdState {
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<HouseholdState>({
    households: [],
    activeHousehold: null,
    children: [],
    isLoading: false,
    error: null,
    onboardingComplete: false,
    pendingDeviceSetup: false,
    protectedInitialRoute: undefined,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hydrate persisted household list and onboarding flag before any API call,
  // so returning users see cached data immediately while fresh data refreshes.
  useEffect(() => {
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
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));

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
      const completed = households.length > 0;
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
  }, [isAuthenticated, state.activeHousehold?.id]);

  useEffect(() => {
    // Wait for AuthContext to finish hydrating SecureStore before deciding
    // whether to refresh or clear account-scoped household data. The device
    // first-run flag remains independent from auth state.
    if (authLoading) return;
    if (isAuthenticated) {
      refresh();
    } else {
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
  }, [isAuthenticated, authLoading, refresh]);

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

  const addChild = useCallback(async (
    dto: { name: string; date_of_birth: string; vocabulary_level?: string; learning_style?: string },
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

  const value = useMemo<HouseholdContextValue>(() => ({
    ...state,
    createHousehold,
    selectHousehold,
    addChild,
    refresh,
    completeOnboarding,
    clearPendingDeviceSetup,
  }), [state, createHousehold, selectHousehold, addChild, refresh, completeOnboarding, clearPendingDeviceSetup]);

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
