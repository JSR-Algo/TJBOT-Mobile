import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';

type ProtectedParentRoute =
  | typeof ROUTES.ParentSummaryScreen
  | typeof ROUTES.ParentTodayScreen
  | typeof ROUTES.ParentHistoryScreen
  | typeof ROUTES.ParentSettingsScreen
  | typeof ROUTES.ParentDiagnosticLogScreen
  | typeof ROUTES.ParentSafetyScreen
  | typeof ROUTES.ParentAccountPrivacyScreen;

type ParentGateNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList, ProtectedParentRoute>,
  'replace'
>;

/**
 * Compatibility hook for parent screens.
 *
 * Parent PIN is no longer part of the mobile app flow; the app is now a
 * parent-only surface. Existing screens still call this hook, so keep the
 * typed boundary but intentionally do not redirect.
 */
export function useParentGateGuard<T extends ProtectedParentRoute>(
  navigation: ParentGateNavigation,
  thisScreen: T,
): void {
  void navigation;
  void thisScreen;
}
