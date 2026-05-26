import React from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useParentSession } from '../context/ParentSessionContext';

type ProtectedParentRoute =
  | typeof ROUTES.ParentSummaryScreen
  | typeof ROUTES.ParentTodayScreen
  | typeof ROUTES.ParentHistoryScreen
  | typeof ROUTES.ParentSettingsScreen
  | typeof ROUTES.ParentSafetyScreen
  | typeof ROUTES.ParentAccountPrivacyScreen;

/**
 * Gate-freshness guard for protected parent screens.
 *
 * On every focus:
 *   - if the parent session is fresh (within 30-min absolute + 5-min idle)
 *     → call `touchActivity()` to extend the idle window
 *   - if not fresh → redirect to ParentGateScreen with `next` = this screen
 *     so the user lands back here after re-entering the PIN
 *
 * Mount this at the top of any screen reachable only after parent-gate.
 *
 * The generic `T` is the caller's own screen name — needed because each
 * NativeStackScreenProps narrows `setParams` to its own route's param type,
 * which makes the unconstrained `NativeStackNavigationProp<RootStackParamList>`
 * fail contravariance. Letting `T` flow in from the caller keeps both
 * sides honest.
 */
export function useParentGateGuard<T extends ProtectedParentRoute>(
  navigation: NativeStackNavigationProp<RootStackParamList, T>,
  thisScreen: T,
): void {
  const parentSession = useParentSession();

  React.useEffect(() => {
    const enforceGate = (): void => {
      if (parentSession.isFresh()) {
        parentSession.touchActivity();
        return;
      }
      // Stale gate — bounce back to ParentGate. Use replace so the back
      // stack doesn't accumulate a chain of stale-protected screens.
      navigation.replace(ROUTES.ParentGateScreen, { next: thisScreen });
    };

    const focusUnsubscribe = navigation.addListener?.('focus', enforceGate);
    if (!focusUnsubscribe) enforceGate();

    return () => {
      focusUnsubscribe?.();
    };
  }, [navigation, parentSession, thisScreen]);
}
