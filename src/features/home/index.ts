import HomeHubScreen from './screens/HomeHubScreen';
import { STATES } from './states';

export const SCREEN_MAP = {
  home_hub_idle: HomeHubScreen,
  home_hub_greet: HomeHubScreen,
  home_hub_daily: HomeHubScreen,
  home_hub_done: HomeHubScreen,
  home_hub_mic: HomeHubScreen,
  home_hub_offline: HomeHubScreen,
  home_hub_zero_child: HomeHubScreen,
  home_hub_multiple_children: HomeHubScreen,
  home_hub_unpaired_robot: HomeHubScreen,
  home_hub_offline_24h: HomeHubScreen,
  home_hub_paused: HomeHubScreen,
  home_hub_quiet_hours: HomeHubScreen,
  home_hub_error: HomeHubScreen,
};

export { STATES };
