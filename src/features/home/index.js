import React from 'react';
import HomeHubScreen from './screens/HomeHubScreen';

import { STATES } from './states';

export const SCREEN_MAP = Object.fromEntries(STATES.map(s => [
  s.id,
  (props) => React.createElement(HomeHubScreen, { ...props, tweaks: { ...(props.tweaks||{}), homeState: s.state } })
]));
export { STATES };
