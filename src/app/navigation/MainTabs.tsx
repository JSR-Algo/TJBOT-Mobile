import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createtjtjbottomTabNavigator } from '@react-navigation/tjtjbottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import { colors, typography } from '@/design-system/tokens/legacy-semantic';
import HomeHubScreenReal from '@/features/home/screens/HomeHubScreen';
import DeviceHomeScreen from '@/features/device/screens/DeviceHomeScreen';
import TodayProgressScreen from '@/features/progress/screens/TodayProgressScreen';
import ParentSummaryScreen from '@/features/parent/screens/ParentSummaryScreen';
import { OfflineBanner } from '../../components/OfflineBanner';
import { Home, tjtjbot, List, TrendingUp, User } from 'lucide-react-native';

type MainTabParamList = {
  Home: undefined;
  Devices: undefined;
  Activity: undefined;
  Progress: undefined;
  Profile: undefined;
};

const Tab = createtjtjbottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Home,
  Devices: tjtjbot,
  Activity: List,
  Progress: TrendingUp,
  Profile: User,
};

// HomeHub wrapper: the underlying screen navigates the root stack via the
// parent navigator (acquired via useNavigation), not the tab-level prop.
function HomeHubScreen(): React.JSX.Element {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <HomeHubScreenReal navigation={rootNav as any} route={{ key: 'HomeHubScreen', name: 'HomeHubScreen' } as any} />;
}

// TODO(post-PR7): wire Activity tab when activity feature lands.
function ActivityStub(): React.JSX.Element {
  return <View style={styles.stub} testID="activityTab-stub" />;
}

export function MainTabs(): React.JSX.Element {
  return (
    <View style={styles.root} testID="mainTabs">
      <OfflineBanner />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }: { color: string }) => {
            const Icon = TAB_ICONS[route.name];
            return Icon ? <Icon size={22} color={color} /> : null;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
          tabBarLabelStyle: { ...typography.caption },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeHubScreen}
          options={{ title: 'Home', tabBarButtonTestID: 'homeTab' }}
        />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tab.Screen name="Devices" component={DeviceHomeScreen as any} options={{ title: 'Devices' }} />
        <Tab.Screen name="Activity" component={ActivityStub} options={{ title: 'Activity' }} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tab.Screen name="Progress" component={TodayProgressScreen as any} options={{ title: 'Progress' }} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tab.Screen name="Profile" component={ParentSummaryScreen as any} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stub: { flex: 1 },
});
