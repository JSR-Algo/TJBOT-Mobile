import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MainTabParamList } from './types';
import { colors, typography } from '../theme';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { DeviceListScreen } from '../screens/device/DeviceListScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { ParentDashboardScreen } from '../screens/dashboard/ParentDashboardScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Devices: '🤖',
  Activity: '📋',
  Progress: '📈',
  Profile: '👤',
};

export function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name] ?? '●'}</Text>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarLabelStyle: { ...typography.caption },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Devices" component={DeviceListScreen} options={{ title: 'Devices' }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
      <Tab.Screen name="Progress" component={ParentDashboardScreen} options={{ title: 'Progress' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
