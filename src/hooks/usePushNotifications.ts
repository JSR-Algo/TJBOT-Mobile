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

} catch {
  // Native module not available in this build — push notifications disabled
}

type NotificationDedupe = {
  claim: (scope: 'presentation' | 'foreground' | 'navigation', notificationId: string) => Promise<boolean>;
};

type PushNotificationOptions = {
  readonly dedupe?: NotificationDedupe;
  readonly onForeground?: (payload: Record<string, unknown>) => Promise<void> | void;
  readonly onTap?: (payload: Record<string, unknown>) => Promise<void> | void;
};

function notificationPayload(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stableNotificationId(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const value = payload.notificationId ?? payload.notification_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function createNotificationPresentationHandler(dedupe: NotificationDedupe) {
  return async (notification: { request?: { content?: { data?: unknown } } }) => {
    const payload = notificationPayload(notification.request?.content?.data);
    const notificationId = stableNotificationId(payload);
    const present = !notificationId || await dedupe.claim('presentation', notificationId);
    return {
      shouldShowAlert: present,
      shouldPlaySound: present,
      shouldSetBadge: present,
      shouldShowBanner: present,
      shouldShowList: present,
    };
  };
}

export function usePushNotifications(options: PushNotificationOptions = {}) {
  const notificationListener = useRef<{ remove: () => void } | undefined>(undefined);
  const responseListener = useRef<{ remove: () => void } | undefined>(undefined);
  const { dedupe, onForeground, onTap } = options;

  useEffect(() => {
    if (!Notifications) return;

    if (dedupe) {
      Notifications.setNotificationHandler({
        handleNotification: createNotificationPresentationHandler(dedupe),
      });
    }

    void registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const payload = notificationPayload(notification.request.content.data);
        if (payload) void onForeground?.(payload);
      },
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const payload = notificationPayload(response.notification.request.content.data);
        if (payload) void onTap?.(payload);
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [dedupe, onForeground, onTap]);
}

export async function getLastPushNotificationPayload(): Promise<Record<string, unknown> | null> {
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return notificationPayload(response?.notification.request.content.data);
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
