import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { MainTabParamList } from './types';
import { colors, typography } from '../theme';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { DeviceListScreen } from '../screens/device/DeviceListScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { ParentDashboardScreen } from '../screens/dashboard/ParentDashboardScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { OfflineBanner } from '../components/OfflineBanner';
import { Home, Bot, List, TrendingUp, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Home,
  Devices: Bot,
  Activity: List,
  Progress: TrendingUp,
  Profile: User,
};

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
          component={DashboardScreen}
          options={{ title: 'Home', tabBarButtonTestID: 'homeTab' }}
        />
        <Tab.Screen name="Devices" component={DeviceListScreen} options={{ title: 'Devices' }} />
        <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
        <Tab.Screen name="Progress" component={ParentDashboardScreen} options={{ title: 'Progress' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
