import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Household, Child } from '../types';
import * as householdsApi from '../api/households';
import { useAuth } from './AuthContext';
import { normalizeError } from '../utils/errors';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete_v1';

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
}

interface HouseholdContextValue extends HouseholdState {
  createHousehold: (name: string) => Promise<Household>;
  selectHousehold: (id: string) => void;
  addChild: (dto: { name: string; date_of_birth: string }) => Promise<Child>;
  refresh: () => Promise<void>;
  completeOnboarding: (withDeviceSetup?: boolean) => void;
  clearPendingDeviceSetup: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<HouseholdState>({
    households: [],
    activeHousehold: null,
    children: [],
    isLoading: false,
    error: null,
    onboardingComplete: false,
    pendingDeviceSetup: false,
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
  // start of a returning user doesn't briefly show OnboardingStack while
  // the API call is in flight.
  useEffect(() => {
    readOnboardingCompleteFromStore().then((persisted) => {
      if (persisted) setState((s) => (s.onboardingComplete ? s : { ...s, onboardingComplete: true }));
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      // On logout / 401 force-logout, clear persisted onboarding flag too.
      // Otherwise the next user who logs in on the same device would land
      // on Main instead of Onboarding.
      clearOnboardingCompleteStore();
      setState((s) => ({
        ...s,
        households: [],
        activeHousehold: null,
        children: [],
        onboardingComplete: false,
        pendingDeviceSetup: false,
      }));
    }
  }, [isAuthenticated, refresh]);

  const createHousehold = async (name: string): Promise<Household> => {
    const household = await householdsApi.create(name);
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

  const addChild = async (dto: { name: string; date_of_birth: string }): Promise<Child> => {
    if (!state.activeHousehold) throw new Error('No active household');
    const child = await householdsApi.addChild(state.activeHousehold.id, dto);
    setState((s) => ({ ...s, children: [...s.children, child] }));
    return child;
  };

  const completeOnboarding = (withDeviceSetup = false) => {
    writeOnboardingCompleteToStore(true);
    setState((s) => ({ ...s, onboardingComplete: true, pendingDeviceSetup: withDeviceSetup }));
  };

  const clearPendingDeviceSetup = () => {
    setState((s) => ({ ...s, pendingDeviceSetup: false }));
  };

  return (
    <HouseholdContext.Provider value={{ ...state, createHousehold, selectHousehold, addChild, refresh, completeOnboarding, clearPendingDeviceSetup }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
