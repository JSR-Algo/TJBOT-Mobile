import React from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import type { FeatureTabName, FeatureTabScreen } from './types';

const SLEEK = {
  primarySoft: 'rgba(255, 107, 107, 0.16)',
} as const;

/**
 * Colorful tab icons — SOT for the authenticated bottom menu.
 * Selected = full-color artwork + soft coral pill.
 * Idle = dedicated greyscale artwork (never residual color).
 */
export const SLEEK_TAB_ICON_SOURCES: Record<FeatureTabName, ImageSourcePropType> = {
  Home: require('@/assets/tab-icons/home.png'),
  Devices: require('@/assets/tab-icons/devices.png'),
  Library: require('@/assets/tab-icons/library.png'),
  Progress: require('@/assets/tab-icons/progress.png'),
  Profile: require('@/assets/tab-icons/profile.png'),
};

export const SLEEK_TAB_IDLE_ICON_SOURCES: Record<FeatureTabName, ImageSourcePropType> = {
  Home: require('@/assets/tab-icons/home-idle.png'),
  Devices: require('@/assets/tab-icons/devices-idle.png'),
  Library: require('@/assets/tab-icons/library-idle.png'),
  Progress: require('@/assets/tab-icons/progress-idle.png'),
  Profile: require('@/assets/tab-icons/profile-idle.png'),
};

type MainTabIconProps = {
  Icon: FeatureTabScreen['tabIcon'];
  color: string;
  focused: boolean;
  imageSource?: ImageSourcePropType;
  idleImageSource?: ImageSourcePropType;
  layoutScale?: number;
  tabName?: FeatureTabName;
};

export function MainTabIcon({
  Icon,
  color,
  focused,
  imageSource,
  idleImageSource,
  layoutScale = 1,
  tabName,
}: MainTabIconProps): React.JSX.Element {
  const iconSize = (focused ? 30 : 26) * layoutScale;
  const resolvedColorSource = imageSource
    ?? (tabName ? SLEEK_TAB_ICON_SOURCES[tabName] : undefined);
  const resolvedIdleSource = idleImageSource
    ?? (tabName ? SLEEK_TAB_IDLE_ICON_SOURCES[tabName] : undefined)
    ?? resolvedColorSource;
  const source = focused ? resolvedColorSource : resolvedIdleSource;

  return (
    <View
      testID="mainTabIconContainer"
      style={[
        styles.tabIconContainer,
        {
          width: 40 * layoutScale,
          height: 40 * layoutScale,
          borderRadius: 20 * layoutScale,
        },
        focused ? styles.tabIconContainerFocused : styles.tabIconContainerIdle,
      ]}
    >
      {source ? (
        <Image
          testID="mainTabColorIcon"
          source={source}
          style={[
            { width: iconSize, height: iconSize },
            !focused && styles.sleekTabImageIdle,
          ]}
          resizeMode="contain"
        />
      ) : (
        <Icon
          size={22 * layoutScale}
          color={color}
          strokeWidth={focused ? 2.8 : 2.2}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerFocused: {
    backgroundColor: SLEEK.primarySoft,
  },
  tabIconContainerIdle: {
    backgroundColor: 'transparent',
  },
  sleekTabImageIdle: {
    opacity: 0.92,
  },
});
