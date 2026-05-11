import LoginScreen from './screens/LoginScreen';
import LoginErrorScreen from './screens/LoginErrorScreen';
import ChildProfileScreen from './screens/ChildProfileScreen';

import { STATES } from './states';

export const SCREEN_MAP = {
  onb_login:       LoginScreen,
  onb_login_error: LoginErrorScreen,
  onb_child:       ChildProfileScreen,
};
export { STATES };
