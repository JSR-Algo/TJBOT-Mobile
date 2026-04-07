import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Household, Child } from '../types';
import * as householdsApi from '../api/households';
import { useAuth } from './AuthContext';
import { normalizeError } from '../utils/errors';

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

    // Safety timeout: unblock navigation if API is unreachable
    const timeout = setTimeout(() => {
      setState((s) => s.isLoading ? { ...s, isLoading: false } : s);
    }, 5000);

    try {
      const households = await householdsApi.list();
      clearTimeout(timeout);
      const active = households[0] ?? null;
      let childList: Child[] = [];
      if (active) {
        childList = await householdsApi.listChildren(active.id);
      }
      setState((s) => ({
        ...s,
        households,
        activeHousehold: active,
        children: childList,
        isLoading: false,
        // Returning user already has a household → onboarding was previously completed
        onboardingComplete: s.onboardingComplete || households.length > 0,
      }));
    } catch (err) {
      clearTimeout(timeout);
      const normalized = normalizeError(err);
      setState((s) => ({ ...s, error: normalized.message, isLoading: false }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) refresh();
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
