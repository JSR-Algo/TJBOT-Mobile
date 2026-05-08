export const AndroidImportance = { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 };

export const setNotificationHandler = jest.fn();
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test-token]' });
export const setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
export const addNotificationReceivedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addNotificationResponseReceivedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const scheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id');
export const cancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
export const cancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
export const getBadgeCountAsync = jest.fn().mockResolvedValue(0);
export const setBadgeCountAsync = jest.fn().mockResolvedValue(true);
