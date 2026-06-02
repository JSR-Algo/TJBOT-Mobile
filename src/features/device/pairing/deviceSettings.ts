import { Linking, Platform } from 'react-native';

type LinkingAdapter = Pick<typeof Linking, 'openSettings'> & Partial<Pick<typeof Linking, 'sendIntent'>>;
type PlatformOS = typeof Platform.OS;

const ANDROID_SETTINGS_ACTION = {
  wifi: 'android.settings.WIFI_SETTINGS',
  bluetooth: 'android.settings.BLUETOOTH_SETTINGS',
} as const;

export async function openWifiSettings(
  platformOS: PlatformOS = Platform.OS,
  linking: LinkingAdapter = Linking,
): Promise<void> {
  await openDeviceSettings('wifi', platformOS, linking);
}

export async function openBluetoothSettings(
  platformOS: PlatformOS = Platform.OS,
  linking: LinkingAdapter = Linking,
): Promise<void> {
  await openDeviceSettings('bluetooth', platformOS, linking);
}

export async function openAppSettings(linking: LinkingAdapter = Linking): Promise<void> {
  await linking.openSettings().catch(() => undefined);
}

async function openDeviceSettings(
  target: keyof typeof ANDROID_SETTINGS_ACTION,
  platformOS: PlatformOS,
  linking: LinkingAdapter,
): Promise<void> {
  if (platformOS === 'android' && typeof linking.sendIntent === 'function') {
    try {
      await linking.sendIntent(ANDROID_SETTINGS_ACTION[target]);
      return;
    } catch {
      // Fall through to app settings when Android cannot open the direct panel.
    }
  }

  await linking.openSettings().catch(() => undefined);
}
