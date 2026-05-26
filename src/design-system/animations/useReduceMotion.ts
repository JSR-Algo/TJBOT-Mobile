import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(override?: boolean): boolean {
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    if (override !== undefined) return undefined;

    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [override]);

  return override ?? systemReduceMotion;
}
