import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createPushTokenRegistrar,
  getInitialNotificationUrl,
  notificationPayloadToUrl,
} from '../../src/hooks/usePushNotifications';

describe('push notification registration', () => {
  it('does not initialize expo-notifications in QA harness builds', () => {
    const source = readFileSync(join(__dirname, '../../src/hooks/usePushNotifications.ts'), 'utf8');

    expect(source).toContain("Notifications = Config.QA_MODE ? null : require('expo-notifications')");
  });

  it('registers the current push token once', async () => {
    const registerToken = jest.fn<Promise<void>, [string, 'ios' | 'android' | 'web']>().mockResolvedValue(undefined);
    const registrar = createPushTokenRegistrar({
      getExistingPermissionStatus: jest.fn().mockResolvedValue('granted'),
      requestPermissionStatus: jest.fn().mockResolvedValue('granted'),
      getToken: jest.fn().mockResolvedValue('ExponentPushToken[abc]'),
      registerToken,
      platform: 'ios',
      isDevice: true,
    });

    await expect(registrar.registerCurrentToken()).resolves.toEqual({
      status: 'registered',
      token: 'ExponentPushToken[abc]',
      replayed: false,
    });

    expect(registerToken).toHaveBeenCalledTimes(1);
    expect(registerToken).toHaveBeenCalledWith('ExponentPushToken[abc]', 'ios');
  });

  it('does not replay the same registered token', async () => {
    const registerToken = jest.fn<Promise<void>, [string, 'ios' | 'android' | 'web']>().mockResolvedValue(undefined);
    const registrar = createPushTokenRegistrar({
      getExistingPermissionStatus: jest.fn().mockResolvedValue('granted'),
      requestPermissionStatus: jest.fn().mockResolvedValue('granted'),
      getToken: jest.fn().mockResolvedValue('ExponentPushToken[abc]'),
      registerToken,
      platform: 'ios',
      isDevice: true,
    });

    await registrar.registerCurrentToken();
    await expect(registrar.registerCurrentToken()).resolves.toEqual({
      status: 'registered',
      token: 'ExponentPushToken[abc]',
      replayed: true,
    });

    expect(registerToken).toHaveBeenCalledTimes(1);
  });

  it('reports permission denied before token lookup', async () => {
    const getToken = jest.fn<Promise<string>, []>().mockResolvedValue('ExponentPushToken[abc]');
    const registrar = createPushTokenRegistrar({
      getExistingPermissionStatus: jest.fn().mockResolvedValue('denied'),
      requestPermissionStatus: jest.fn().mockResolvedValue('denied'),
      getToken,
      registerToken: jest.fn().mockResolvedValue(undefined),
      platform: 'ios',
      isDevice: true,
    });

    await expect(registrar.registerCurrentToken()).resolves.toEqual({ status: 'permission-denied' });

    expect(getToken).not.toHaveBeenCalled();
  });

  it('returns retry state for backend 429 failures', async () => {
    const registrar = createPushTokenRegistrar({
      getExistingPermissionStatus: jest.fn().mockResolvedValue('granted'),
      requestPermissionStatus: jest.fn().mockResolvedValue('granted'),
      getToken: jest.fn().mockResolvedValue('ExponentPushToken[abc]'),
      registerToken: jest.fn().mockRejectedValue({ status: 429, retryable: true }),
      platform: 'ios',
      isDevice: true,
    });

    await expect(registrar.registerCurrentToken()).resolves.toMatchObject({
      status: 'retry',
      retryable: true,
    });
  });

  it('re-registers a refreshed token and skips unchanged refreshes', async () => {
    const registerToken = jest.fn<Promise<void>, [string, 'ios' | 'android' | 'web']>().mockResolvedValue(undefined);
    const registrar = createPushTokenRegistrar({
      getExistingPermissionStatus: jest.fn().mockResolvedValue('granted'),
      requestPermissionStatus: jest.fn().mockResolvedValue('granted'),
      getToken: jest.fn().mockResolvedValue('ExponentPushToken[old]'),
      registerToken,
      platform: 'ios',
      isDevice: true,
    });

    await registrar.registerCurrentToken();
    await expect(registrar.registerRefreshedToken('ExponentPushToken[new]')).resolves.toMatchObject({
      status: 'registered',
      token: 'ExponentPushToken[new]',
      replayed: false,
    });
    await expect(registrar.registerRefreshedToken('ExponentPushToken[new]')).resolves.toMatchObject({
      status: 'registered',
      token: 'ExponentPushToken[new]',
      replayed: true,
    });

    expect(registerToken).toHaveBeenCalledTimes(2);
  });
});

describe('notification deep links', () => {
  it('builds summary and device URLs from push payloads', () => {
    expect(notificationPayloadToUrl({ deviceId: 'device-1', summaryDate: '2026-05-16' })).toBe(
      'TJBot://device/device-1/summary/2026-05-16',
    );
    expect(notificationPayloadToUrl({ deviceId: 'device-1' })).toBe('TJBot://device/device-1');
  });

  it('uses explicit safe TJBot deep links from payloads', () => {
    expect(notificationPayloadToUrl({ deepLink: 'TJBot://settings/account' })).toBe('TJBot://settings/account');
    expect(notificationPayloadToUrl({ deepLink: 'https://example.test/phish' })).toBeNull();
  });

  it('returns cold-start notification URLs from last notification response', async () => {
    const notifications = {
      getLastNotificationResponseAsync: jest.fn().mockResolvedValue({
        notification: {
          request: {
            content: {
              data: { deviceId: 'device-1', summaryDate: '2026-05-16' },
            },
          },
        },
      }),
    };

    await expect(getInitialNotificationUrl(notifications)).resolves.toBe('TJBot://device/device-1/summary/2026-05-16');
  });
});
