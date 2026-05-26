import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  NAVIGATION_LINKING_CONFIG,
  navigationTargetForDeepLinkUrl,
  routeNameForDeepLinkUrl,
  shouldHandleDeepLinkManually,
} from '../../src/navigation/linking';
import { ROUTES } from '../../src/navigation/routes';

describe('notification linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the cold-start notification payload when no URL opened the app', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValueOnce(null);
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValueOnce({
      actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
      notification: {
        date: 1778918400000,
        request: {
          identifier: 'notification-1',
          content: {
            title: null,
            subtitle: null,
            body: null,
            data: { deviceId: 'device-1', summaryDate: '2026-05-16' },
            categoryIdentifier: null,
            sound: null,
          },
          trigger: null,
        },
      },
    });

    await expect(NAVIGATION_LINKING_CONFIG.getInitialURL?.()).resolves.toBe(
      'TJBot://device/device-1/summary/2026-05-16',
    );
  });

  it('resolves notification device URLs to registered routes with params', () => {
    expect(navigationTargetForDeepLinkUrl('TJBot://device/device-1')).toEqual({
      name: ROUTES.DeviceOverviewScreen,
      params: { deviceId: 'device-1' },
    });
    expect(navigationTargetForDeepLinkUrl('TJBot://device/device-1/summary/2026-05-16')).toEqual({
      name: ROUTES.ParentSummaryScreen,
      params: { deviceId: 'device-1', summaryDate: '2026-05-16' },
    });
  });

  it('prefers exact feature routes before dynamic notification device links', () => {
    expect(navigationTargetForDeepLinkUrl('TJBot://device/device-home')).toEqual({
      name: ROUTES.DeviceHomeScreen,
    });
  });

  it('lets React Navigation own configured route paths and manually handles only dynamic notification paths', () => {
    expect(shouldHandleDeepLinkManually('TJBot://device/device-home')).toBe(false);
    expect(shouldHandleDeepLinkManually('TJBot://device/device-1')).toBe(true);
  });

  it('keeps legacy notification settings links on registered parent routes', () => {
    expect(navigationTargetForDeepLinkUrl('TJBot://settings/account')).toEqual({
      name: ROUTES.ParentSettingsScreen,
    });
    expect(navigationTargetForDeepLinkUrl('TJBot://settings/data-privacy')).toEqual({
      name: ROUTES.ParentAccountPrivacyScreen,
    });
  });

  it('keeps route-name compatibility for existing deep link callers', () => {
    expect(routeNameForDeepLinkUrl('TJBot://device/device-1')).toBe(ROUTES.DeviceOverviewScreen);
  });
});
