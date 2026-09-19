import React from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';

// Screens stay mounted in the stack. A background/blur/context transition makes
// every previous read ineligible, including callbacks before effect cleanup.
export function useScreenActivity(scope: string) {
  const focused = useIsFocused();
  const auth = useOptionalAuth();
  const household = useOptionalHousehold();
  const [app, setApp] = React.useState({ foreground: AppState.currentState == null || AppState.currentState === 'active', revision: 0 });
  const foreground = React.useRef(app.foreground);
  const selected = React.useRef<string | null>(null);
  const active = focused && app.foreground && auth?.isAuthenticated !== false;
  const input = JSON.stringify([scope, auth?.user?.id, household?.activeHousehold?.id, active, app.revision]);
  const generation = React.useRef({ input, revision: 0 });
  if (generation.current.input !== input) {
    generation.current = { input, revision: generation.current.revision + 1 };
  }
  // A -> B -> A must not revive a request from the first A.
  const key = JSON.stringify([input, generation.current.revision]);
  selected.current = active ? key : null;
  const latest = React.useRef(selected.current);
  latest.current = selected.current;

  React.useEffect(() => {
    selected.current = latest.current;
    const subscription = AppState.addEventListener('change', state => {
      const next = state === 'active';
      if (next === foreground.current) return;
      foreground.current = next;
      selected.current = null;
      setApp(previous => ({ foreground: next, revision: previous.revision + 1 }));
    });
    return () => { selected.current = null; subscription.remove(); };
  }, []);

  const isCurrent = React.useCallback((expected: string) => selected.current === expected, []);
  return { active, key, isCurrent };
}
