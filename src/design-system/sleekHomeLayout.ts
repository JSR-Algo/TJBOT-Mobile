export const SLEEK_HOME_REFERENCE_WIDTH = 430;
export const SLEEK_HOME_REFERENCE_HEIGHT = 932;
export const SLEEK_HOME_MAX_WIDTH = 520;

const SLEEK_TAB_BAR_WIDTH = 378;
const SLEEK_TAB_BAR_HEIGHT = 84;
const SLEEK_TAB_BAR_BOTTOM = 24;

export function getSleekHomeLayoutScale(
  width: number,
  height: number,
  topInset = 0,
): number {
  const widthScale =
    Math.min(width, SLEEK_HOME_MAX_WIDTH) / SLEEK_HOME_REFERENCE_WIDTH;
  const usableHeight = Math.max(1, height - topInset);
  const heightScale = usableHeight / SLEEK_HOME_REFERENCE_HEIGHT;
  return Math.min(widthScale, heightScale);
}

export function getSleekTabBarLayout(
  width: number,
  height: number,
): {
  scale: number;
  width: number;
  height: number;
  left: number;
  bottom: number;
} {
  const scale = getSleekHomeLayoutScale(width, height);
  const tabWidth = SLEEK_TAB_BAR_WIDTH * scale;

  return {
    scale,
    width: tabWidth,
    height: SLEEK_TAB_BAR_HEIGHT * scale,
    left: (width - tabWidth) / 2,
    bottom: SLEEK_TAB_BAR_BOTTOM * scale,
  };
}
