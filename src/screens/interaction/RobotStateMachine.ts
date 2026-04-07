import { useState, useCallback } from 'react';

export type RobotState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'low_battery'
  | 'charging'
  | 'offline';

export type RobotMode =
  | 'learning'
  | 'playful'
  | 'focus'
  | 'parent_mode'
  | 'sleep_mode';

// Allowed transitions: from state -> set of valid next states
const TRANSITIONS: Record<RobotState, ReadonlySet<RobotState>> = {
  idle: new Set<RobotState>(['listening', 'low_battery', 'charging', 'offline', 'error']),
  listening: new Set<RobotState>(['thinking', 'idle', 'error', 'offline']),
  thinking: new Set<RobotState>(['speaking', 'idle', 'error', 'offline']),
  speaking: new Set<RobotState>(['idle', 'listening', 'error', 'offline']),
  error: new Set<RobotState>(['idle', 'offline']),
  low_battery: new Set<RobotState>(['charging', 'idle', 'offline']),
  charging: new Set<RobotState>(['idle', 'low_battery']),
  offline: new Set<RobotState>(['idle']),
};

export interface RobotStateMachineReturn {
  state: RobotState;
  mode: RobotMode;
  canTransitionTo: (next: RobotState) => boolean;
  transition: (next: RobotState) => boolean;
  setMode: (mode: RobotMode) => void;
  reset: () => void;
}

export function useRobotStateMachine(
  initialState: RobotState = 'idle',
  initialMode: RobotMode = 'learning',
): RobotStateMachineReturn {
  const [state, setState] = useState<RobotState>(initialState);
  const [mode, setModeState] = useState<RobotMode>(initialMode);

  const canTransitionTo = useCallback(
    (next: RobotState): boolean => {
      return TRANSITIONS[state].has(next);
    },
    [state],
  );

  const transition = useCallback(
    (next: RobotState): boolean => {
      if (!TRANSITIONS[state].has(next)) {
        if (__DEV__) {
          console.warn(`[RobotStateMachine] Invalid transition: ${state} → ${next}`);
        }
        return false;
      }
      setState(next);
      return true;
    },
    [state],
  );

  const setMode = useCallback((newMode: RobotMode) => {
    setModeState(newMode);
  }, []);

  const reset = useCallback(() => {
    setState('idle');
  }, []);

  return { state, mode, canTransitionTo, transition, setMode, reset };
}
