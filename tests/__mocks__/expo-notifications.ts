import { vi } from 'vitest';

export const AndroidImportance = { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 };

export const setNotificationHandler = vi.fn();
export const getPermissionsAsync = vi.fn().mockResolvedValue({ status: 'granted' });
export const requestPermissionsAsync = vi.fn().mockResolvedValue({ status: 'granted' });
export const getExpoPushTokenAsync = vi.fn().mockResolvedValue({ data: 'ExponentPushToken[test-token]' });
export const setNotificationChannelAsync = vi.fn().mockResolvedValue(null);
export const addNotificationReceivedListener = vi.fn().mockReturnValue({ remove: vi.fn() });
export const addNotificationResponseReceivedListener = vi.fn().mockReturnValue({ remove: vi.fn() });
export const scheduleNotificationAsync = vi.fn().mockResolvedValue('notification-id');
export const cancelScheduledNotificationAsync = vi.fn().mockResolvedValue(undefined);
export const cancelAllScheduledNotificationsAsync = vi.fn().mockResolvedValue(undefined);
export const getBadgeCountAsync = vi.fn().mockResolvedValue(0);
export const setBadgeCountAsync = vi.fn().mockResolvedValue(true);
