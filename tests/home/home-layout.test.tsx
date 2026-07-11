import { HOME_HUB_ROBOT_STAGE_TOP_PADDING } from '@/features/home/screens/HomeHubScreen';

describe('HomeHubScreen layout', () => {
  it('keeps the Sleek robot stage directly under the ready pill', () => {
    expect(HOME_HUB_ROBOT_STAGE_TOP_PADDING).toBe(32);
  });
});
