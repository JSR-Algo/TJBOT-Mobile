import React, { useEffect, useState } from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { PARENT_MOTION, finalMetricValue } from './parentMotion';
import { useReduceMotion } from './useReduceMotion';

export type CountUpProps = {
  value: number;
  durationMs?: number;
  delayMs?: number;
  /** Optional formatter (e.g. locale string). Defaults to String(n). */
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  reduceMotion?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * Animates a numeric metric from 0 → source value.
 * Never exceeds the source. Reduced motion shows the final value immediately.
 */
export function CountUp({
  value,
  durationMs = PARENT_MOTION.slowMs,
  delayMs = 0,
  format = defaultFormat,
  style,
  reduceMotion: reduceMotionOverride,
  testID,
  accessibilityLabel,
}: CountUpProps): React.JSX.Element {
  const reduceMotion = useReduceMotion(reduceMotionOverride);
  const target = finalMetricValue(value);
  const [display, setDisplay] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(target);
      return undefined;
    }

    let raf = 0;
    let startAt = 0;
    let cancelled = false;

    const tick = (now: number): void => {
      if (cancelled) return;
      if (startAt === 0) startAt = now + delayMs;
      const elapsed = now - startAt;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - (1 - t) ** 3;
      const next = target * eased;
      setDisplay(Number.isInteger(target) ? Math.round(next) : next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };

    setDisplay(0);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [delayMs, durationMs, reduceMotion, target]);

  return (
    <RNText
      accessibilityLabel={accessibilityLabel ?? format(target)}
      style={style}
      testID={testID}
    >
      {format(display)}
    </RNText>
  );
}

function defaultFormat(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export default CountUp;
