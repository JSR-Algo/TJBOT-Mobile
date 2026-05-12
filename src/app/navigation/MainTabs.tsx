import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../navigation/types';
import { colors, typography } from '@/design-system/tokens/legacy-semantic';
import HomeHubScreenReal from '@/features/home/screens/HomeHubScreen';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import { DeviceListScreen } from '../../screens/device/DeviceListScreen';

// Wrap HomeHubScreen so the BottomTab navigator's expected prop shape is
// satisfied. The underlying screen navigates the root stack via the parent
// navigator (acquired via useNavigation), not the tab-level prop.
function HomeHubScreen(): React.JSX.Element {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <HomeHubScreenReal navigation={rootNav as any} route={{ key: 'HomeHubScreen', name: 'HomeHubScreen' } as any} />;
}
import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { OfflineBanner } from '../../components/OfflineBanner';
import { Home, Bot, List, TrendingUp, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Home,
  Devices: Bot,
  Activity: List,
  Progress: TrendingUp,
  Profile: User,
};

// TODO(PR7): replace Activity + Progress stubs with real tbot-design feature
// screens (progress feature in PR7, activity in a follow-up feature).
function ActivityStub(): React.JSX.Element {
  return <View style={styles.stub} testID="activityTab-stub" />;
}
function ProgressStub(): React.JSX.Element {
  return <View style={styles.stub} testID="progressTab-stub" />;
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
        <Tab.Screen name="Devices" component={DeviceListScreen} options={{ title: 'Devices' }} />
        <Tab.Screen name="Activity" component={ActivityStub} options={{ title: 'Activity' }} />
        <Tab.Screen name="Progress" component={ProgressStub} options={{ title: 'Progress' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stub: { flex: 1 },
});
