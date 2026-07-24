import React from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import type { FeatureTabName, FeatureTabScreen } from './types';

const SLEEK = {
  primarySoft: 'rgba(255,107,107,0.12)',
} as const;

/**
 * Colorful tab icons — SOT for the authenticated bottom menu.
 * Selected = full color. Idle = the same artwork rendered neutral gray.
 */
export const SLEEK_TAB_ICON_SOURCES: Record<FeatureTabName, ImageSourcePropType> = {
  Home: require('@/assets/tab-icons/home.png'),
  Devices: require('@/assets/tab-icons/devices.png'),
  Library: require('@/assets/tab-icons/library.png'),
  Progress: require('@/assets/tab-icons/progress.png'),
  Profile: require('@/assets/tab-icons/profile.png'),
};

type MainTabIconProps = {
  Icon: FeatureTabScreen['tabIcon'];
  color: string;
  focused: boolean;
  imageSource?: ImageSourcePropType;
  layoutScale?: number;
};

export function MainTabIcon({
  Icon,
  color,
  focused,
  imageSource,
  layoutScale = 1,
}: MainTabIconProps): React.JSX.Element {
  const iconSize = (focused ? 30 : 26) * layoutScale;

  return (
    <View
      testID="mainTabIconContainer"
      style={[
        styles.tabIconContainer,
        {
          width: 36 * layoutScale,
          height: 36 * layoutScale,
          borderRadius: 18 * layoutScale,
        },
        focused ? styles.tabIconContainerFocused : styles.tabIconContainerIdle,
      ]}
    >
      {imageSource ? (
        <Image
          testID="mainTabColorIcon"
          source={imageSource}
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
    opacity: 0.72,
    tintColor: '#A6A3A0',
  },
});
