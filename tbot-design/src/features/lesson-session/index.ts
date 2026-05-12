import AbandonedDisconnectScreen from './screens/AbandonedDisconnectScreen';
import CostCappedScreen from './screens/CostCappedScreen';
import ParentStoppedScreen from './screens/ParentStoppedScreen';
import TimedOutScreen from './screens/TimedOutScreen';

export { STATES } from './states';

export const STUB_SCREEN_MAP = {
  abandoned_disconnect: AbandonedDisconnectScreen,
  cost_capped: CostCappedScreen,
  parent_stopped: ParentStoppedScreen,
  timed_out: TimedOutScreen,
};
