import ParentGateScreen from './screens/ParentGateScreen';
import ParentSummaryScreen from './screens/ParentSummaryScreen';
import ParentTodayScreen from './screens/ParentTodayScreen';
import ParentHistoryScreen from './screens/ParentHistoryScreen';
import ParentSafetyScreen from './screens/ParentSafetyScreen';
import ParentSettingsScreen from './screens/ParentSettingsScreen';

import { STATES } from './states';

export const SCREEN_MAP = {
  parent_gate:     ParentGateScreen,
  parent_summary:  ParentSummaryScreen,
  parent_today:    ParentTodayScreen,
  parent_history:  ParentHistoryScreen,
  parent_safety:   ParentSafetyScreen,
  parent_settings: ParentSettingsScreen,
};
export { STATES };
