import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { DeviceSetupScreen } from '../screens/device/DeviceSetupScreen';
import { DeviceDetailScreen } from '../screens/device/DeviceDetailScreen';
import { InteractionScreen } from '../screens/interaction/InteractionScreen';
import { ParentControlsScreen } from '../screens/controls/ParentControlsScreen';
import { NotificationPrefsScreen } from '../screens/profile/NotificationPrefsScreen';
import { GeminiConversationScreen } from '../screens/gemini/GeminiConversationScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack(): React.JSX.Element {
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
      <Stack.Screen name="Interaction" component={InteractionScreen} options={{ title: 'Talk to TBOT' }} />
      <Stack.Screen name="GeminiConversation" component={GeminiConversationScreen} options={{ title: 'AI Voice Chat', headerShown: false }} />
      <Stack.Screen name="ParentControls" component={ParentControlsScreen} options={{ title: 'Parental Controls' }} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} options={{ title: 'Notification Settings' }} />
    </Stack.Navigator>
  );
}
