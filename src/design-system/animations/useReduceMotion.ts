import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAccessibilityPreferences } from '@/services/accessibility/preferences';

export function useReduceMotion(override?: boolean): boolean {
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const { reduceMotion: appReduceMotion } = useAccessibilityPreferences();

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

  return override ?? (appReduceMotion || systemReduceMotion);
}
