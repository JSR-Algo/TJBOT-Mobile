import { HOME_HUB_ROBOT_STAGE_TOP_PADDING } from '@/features/home/screens/HomeHubScreen';

describe('HomeHubScreen layout', () => {
  it('keeps the hero stage closer to the top chrome', () => {
    expect(HOME_HUB_ROBOT_STAGE_TOP_PADDING).toBe(116);
  });
});
