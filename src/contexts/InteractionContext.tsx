import React, { createContext, useContext, useState, useCallback } from 'react';
import * as learningApi from '../api/learning';

export interface Interaction {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

interface InteractionContextValue {
  interactions: Interaction[];
  addInteraction: (message: string, response: string) => void;
  clearInteractions: () => void;
  loadInteractions: (childId: string) => Promise<void>;
}

const InteractionContext = createContext<InteractionContextValue | undefined>(undefined);

export function InteractionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const addInteraction = useCallback((message: string, response: string) => {
    const entry: Interaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      response,
      created_at: new Date().toISOString(),
    };
    setInteractions((prev) => [entry, ...prev]);
  }, []);

  const clearInteractions = useCallback(() => {
    setInteractions([]);
  }, []);

  const loadInteractions = useCallback(async (childId: string) => {
    try {
      const fetched = await learningApi.getInteractions(childId, 20);
      setInteractions(fetched.map((item) => ({
        id: item.id,
        message: item.user_message,
        response: item.ai_response,
        created_at: item.created_at,
      })));
    } catch {
      // Non-blocking: leave interactions as-is on failure
    }
  }, []);

  return (
    <InteractionContext.Provider value={{ interactions, addInteraction, clearInteractions, loadInteractions }}>
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteractions(): InteractionContextValue {
  const ctx = useContext(InteractionContext);
  if (!ctx) throw new Error('useInteractions must be used within InteractionProvider');
  return ctx;
}
