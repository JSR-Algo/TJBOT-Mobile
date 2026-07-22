import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { FeatureTabName, FeatureTabScreen } from './types';

const SLEEK = {
  primarySoft: 'rgba(255,107,107,0.1)',
} as const;

export const SLEEK_TAB_ICONS: Record<FeatureTabName, string> = {
  Home: 'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/PXjVCPzUvhp.png',
  Devices:
    'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/fQZCerpIKya.png',
  Library:
    'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/OWCzyfe01f8.png',
  Progress:
    'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/NpznCUpnBV4.png',
  Profile:
    'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/VeUK4fwA0aM.png',
};

type MainTabIconProps = {
  Icon: FeatureTabScreen['tabIcon'];
  color: string;
  focused: boolean;
  imageUri?: string;
  layoutScale?: number;
};

export function MainTabIcon({
  Icon,
  color,
  focused,
  imageUri,
  layoutScale = 1,
}: MainTabIconProps): React.JSX.Element {
  return (
    <View
      testID="mainTabIconContainer"
      style={[
        styles.tabIconContainer,
        {
          width: 32 * layoutScale,
          height: 32 * layoutScale,
          borderRadius: 16 * layoutScale,
        },
        focused ? styles.tabIconContainerFocused : styles.tabIconContainerIdle,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            { width: 28 * layoutScale, height: 28 * layoutScale },
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
    opacity: 0.6,
  },
});
