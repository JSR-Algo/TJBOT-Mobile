import { HOME_HUB_ROBOT_STAGE_TOP_PADDING } from "@/features/home/screens/HomeHubScreen";
import {
  getSleekHomeLayoutScale,
  getSleekTabBarLayout,
  SLEEK_HOME_MAX_WIDTH,
  SLEEK_HOME_REFERENCE_WIDTH,
} from "@/design-system/sleekHomeLayout";

describe("HomeHubScreen layout", () => {
  it("keeps the Sleek robot stage directly under the ready pill", () => {
    expect(HOME_HUB_ROBOT_STAGE_TOP_PADDING).toBe(32);
  });

  it("scales the 430x932 Sleek artboard proportionally on iPad", () => {
    expect(getSleekHomeLayoutScale(744, 1133)).toBeCloseTo(
      SLEEK_HOME_MAX_WIDTH / SLEEK_HOME_REFERENCE_WIDTH,
    );
  });

  it("centers the floating tab bar on iPad", () => {
    const layout = getSleekTabBarLayout(744, 1133);
    expect(layout.left).toBeCloseTo((744 - layout.width) / 2);
    expect(layout.left).toBeGreaterThan(100);
  });

  it("keeps iPhone compact while expanding the same layout on iPad", () => {
    const iphone = getSleekTabBarLayout(393, 852);
    const ipad = getSleekTabBarLayout(744, 1133);

    expect(iphone.scale).toBeLessThan(1);
    expect(ipad.scale).toBeGreaterThan(1);
    expect(ipad.width).toBeGreaterThan(iphone.width);
    expect(iphone.left).toBeCloseTo((393 - iphone.width) / 2);
    expect(ipad.left).toBeCloseTo((744 - ipad.width) / 2);
  });

  it("reserves the iPhone Dynamic Island safe area before scaling", () => {
    const withoutInset = getSleekHomeLayoutScale(393, 852);
    const withInset = getSleekHomeLayoutScale(393, 852, 59);

    expect(withInset).toBeLessThan(withoutInset);
    expect(SLEEK_HOME_REFERENCE_WIDTH * withInset).toBeLessThan(393);
  });

  it("uses height as the limiting dimension in landscape", () => {
    expect(getSleekHomeLayoutScale(1366, 1024)).toBeCloseTo(1024 / 932);
  });
});
