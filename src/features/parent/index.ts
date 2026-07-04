import ParentAccountPrivacyScreen from './screens/ParentAccountPrivacyScreen';
import ParentGateScreen from './screens/ParentGateScreen';
import ParentHistoryScreen from './screens/ParentHistoryScreen';
import ParentLockedOutScreen from './screens/ParentLockedOutScreen';
import ParentSafetyScreen from './screens/ParentSafetyScreen';
import ParentSettingsScreen from './screens/ParentSettingsScreen';
import ParentDiagnosticLogScreen from './screens/ParentDiagnosticLogScreen';
import ParentSummaryScreen from './screens/ParentSummaryScreen';
import ParentTodayScreen from './screens/ParentTodayScreen';

export { STATES } from './states';

export const SCREEN_MAP = {
  parent_gate: ParentGateScreen,
  parent_locked_out: ParentLockedOutScreen,
  parent_summary: ParentSummaryScreen,
  parent_today: ParentTodayScreen,
  parent_history: ParentHistoryScreen,
  parent_safety: ParentSafetyScreen,
  parent_settings: ParentSettingsScreen,
  parent_diagnostic_log: ParentDiagnosticLogScreen,
  parent_account_privacy: ParentAccountPrivacyScreen,
};
