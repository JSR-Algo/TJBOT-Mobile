import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Config } from '../config';
import * as notificationsApi from '../services/api/notifications';

// expo-notifications requires a native rebuild — guard all calls so the app
// runs without crashing in JS-only (Expo Go / Metro) builds.
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

try {
  Notifications = Config.QA_MODE ? null : require('expo-notifications');
  Device = Config.QA_MODE ? null : require('expo-device');

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

export interface PushTokenRegistrarDeps {
  getExistingPermissionStatus: () => Promise<string>;
  requestPermissionStatus: () => Promise<string>;
  getToken: () => Promise<string>;
  registerToken: (token: string, platform: 'ios' | 'android' | 'web') => Promise<void>;
  platform: 'ios' | 'android' | 'web';
  isDevice: boolean;
}

export type RegisterResult =
  | { status: 'registered'; token: string; replayed: boolean }
  | { status: 'permission-denied' }
  | { status: 'no-device' }
  | { status: 'retry'; retryable: boolean; error: unknown }
  | { status: 'error'; error: unknown };

export function createPushTokenRegistrar(deps: PushTokenRegistrarDeps): {
  registerCurrentToken: () => Promise<RegisterResult>;
  registerRefreshedToken: (token: string) => Promise<RegisterResult>;
} {
  let lastRegistered: string | null = null;

  async function register(token: string): Promise<RegisterResult> {
    if (lastRegistered === token) {
      return { status: 'registered', token, replayed: true };
    }
    try {
      await deps.registerToken(token, deps.platform);
      lastRegistered = token;
      return { status: 'registered', token, replayed: false };
    } catch (err) {
      const e = err as { retryable?: boolean; status?: number };
      if (e?.retryable) return { status: 'retry', retryable: true, error: err };
      return { status: 'error', error: err };
    }
  }

  return {
    async registerCurrentToken(): Promise<RegisterResult> {
      if (!deps.isDevice) return { status: 'no-device' };
      const existing = await deps.getExistingPermissionStatus();
      let granted = existing;
      if (granted !== 'granted') granted = await deps.requestPermissionStatus();
      if (granted !== 'granted') return { status: 'permission-denied' };
      const token = await deps.getToken();
      return register(token);
    },
    async registerRefreshedToken(token: string): Promise<RegisterResult> {
      return register(token);
    },
  };
}

export function notificationPayloadToUrl(payload: {
  deviceId?: string;
  summaryDate?: string;
  deepLink?: string;
}): string | null {
  if (payload.deepLink) {
    return payload.deepLink.startsWith('TJBot://') ? payload.deepLink : null;
  }
  if (payload.deviceId && payload.summaryDate) {
    return `TJBot://device/${payload.deviceId}/summary/${payload.summaryDate}`;
  }
  if (payload.deviceId) {
    return `TJBot://device/${payload.deviceId}`;
  }
  return null;
}

export async function getInitialNotificationUrl(notifications: {
  getLastNotificationResponseAsync: () => Promise<{
    notification?: { request?: { content?: { data?: Record<string, unknown> } } };
  } | null>;
}): Promise<string | null> {
  const response = await notifications.getLastNotificationResponseAsync();
  const data = response?.notification?.request?.content?.data as
    | { deviceId?: string; summaryDate?: string; deepLink?: string }
    | undefined;
  if (!data) return null;
  return notificationPayloadToUrl(data);
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
