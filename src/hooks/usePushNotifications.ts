import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as notificationsApi from '../api/notifications';

// expo-notifications requires a native rebuild — guard all calls so the app
// runs without crashing in JS-only (Expo Go / Metro) builds.
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Device = require('expo-device');

  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Native module not available in this build — push notifications disabled
}

export function usePushNotifications() {
  const notificationListener = useRef<{ remove: () => void } | undefined>(undefined);
  const responseListener = useRef<{ remove: () => void } | undefined>(undefined);

  useEffect(() => {
    if (!Notifications) return;

    void registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Notification received while app is foregrounded — handled by setNotificationHandler
      },
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // User tapped notification — navigate if needed
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

async function registerForPushNotificationsAsync(): Promise<void> {
  if (!Notifications || !Device) return;
  if (!Device.isDevice) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await notificationsApi.registerPushToken(tokenData.data, platform);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch {
    // Non-fatal — push token registration failed (simulator, missing entitlements, etc.)
  }
}
