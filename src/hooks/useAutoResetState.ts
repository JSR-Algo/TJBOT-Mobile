import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useAutoResetState — state that can optionally revert to its initial value
 * after a delay. The timer lives here in src/hooks/ (the sanctioned place for
 * timers per eslint-rule no-voice-timing-in-shared), with useEffect cleanup, so
 * UI components stay timer-free.
 *
 * set(next)            → set value, no auto-reset (e.g. an in-flight state)
 * set(next, resetMs)   → set value, then revert to `initial` after resetMs ms
 */
export function useAutoResetState<T>(
  initial: T,
): readonly [T, (next: T, resetMs?: number) => void] {
  const [value, setValue] = useState<T>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const set = useCallback(
    (next: T, resetMs?: number) => {
      clear();
      setValue(next);
      if (resetMs != null) {
        timer.current = setTimeout(() => setValue(initial), resetMs);
      }
    },
    [clear, initial],
  );

  return [value, set] as const;
}

export default useAutoResetState;
