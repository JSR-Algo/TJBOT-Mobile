import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { DeviceSetupScreen } from '../screens/device/DeviceSetupScreen';
import { DeviceDetailScreen } from '../screens/device/DeviceDetailScreen';
import { ParentControlsScreen } from '../screens/controls/ParentControlsScreen';
import { NotificationPrefsScreen } from '../screens/profile/NotificationPrefsScreen';
import { GeminiConversationScreen } from '../screens/gemini/GeminiConversationScreen';
import { AddChildScreen } from '../screens/onboarding/AddChildScreen';
import {
  RobotDemoScreen,
  isRobotDemoScreenEnabled,
} from '../screens/robot-demo/RobotDemoScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack(): React.JSX.Element {
  // RM-01: RobotDemoScreen is registered only when EXPO_PUBLIC_DEMO_SCREEN=true.
  // React Navigation accepts conditional children; the route is simply absent
  // from the param list at runtime when the flag is off.
  const demoEnabled = isRobotDemoScreenEnabled();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="DeviceSetup" component={DeviceSetupScreen} options={{ title: 'Register Device' }} />
      <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Device' }} />
      <Stack.Screen name="GeminiConversation" component={GeminiConversationScreen} options={{ title: 'AI Voice Chat', headerShown: false }} />
      <Stack.Screen name="ParentControls" component={ParentControlsScreen} options={{ title: 'Parental Controls' }} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} options={{ title: 'Notification Settings' }} />
      <Stack.Screen name="AddChild" component={AddChildScreen} options={{ title: 'Add a Child' }} />
      {demoEnabled ? (
        <Stack.Screen
          name="RobotDemo"
          component={RobotDemoScreen}
          options={{ title: 'Robot Demo (twin)' }}
        />
      ) : null}
    </Stack.Navigator>
  );
}
