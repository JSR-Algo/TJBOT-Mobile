import { PermissionsAndroid, Platform } from 'react-native';
import type { Permission, PermissionStatus } from 'react-native';
import { requestBlePermissions } from '../../src/services/ble/permissions';

describe('BLE permissions', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  const setOS = (os: typeof Platform.OS) => {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  };

  const setVersion = (version: number) => {
    Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
  };

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: originalVersion, configurable: true });
  });

  describe('iOS', () => {
    test('returns granted on ios', async () => {
      setOS('ios');

      const result = await requestBlePermissions();
      expect(result).toBe('granted');
    });

    test('does not touch Android permission APIs on ios', async () => {
      setOS('ios');
      const requestSpy = jest.spyOn(PermissionsAndroid, 'request');
      const requestMultipleSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple');

      await requestBlePermissions();

      expect(requestSpy).not.toHaveBeenCalled();
      expect(requestMultipleSpy).not.toHaveBeenCalled();
    });
  });

  describe('unsupported platforms', () => {
    test.each(['windows', 'macos', 'web'] as const)(
      'returns unavailable when Platform.OS is %s',
      async (os) => {
        setOS(os as typeof Platform.OS);

        const result = await requestBlePermissions();
        expect(result).toBe('unavailable');
      },
    );

    test('does not request any permissions on an unsupported platform', async () => {
      setOS('web' as typeof Platform.OS);
      const requestSpy = jest.spyOn(PermissionsAndroid, 'request');
      const requestMultipleSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple');

      const result = await requestBlePermissions();

      expect(result).toBe('unavailable');
      expect(requestSpy).not.toHaveBeenCalled();
      expect(requestMultipleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Android < 31 (legacy: single ACCESS_FINE_LOCATION)', () => {
    test('returns granted when ACCESS_FINE_LOCATION is granted', async () => {
      setOS('android');
      setVersion(30);
      const requestSpy = jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);

      const result = await requestBlePermissions();

      expect(result).toBe('granted');
      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(requestSpy).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        expect.objectContaining({
          title: 'Bluetooth permission required',
          message: 'TBOT needs Bluetooth access to discover and pair with your Robot.',
          buttonPositive: 'Allow',
        }),
      );
    });

    test('returns denied when ACCESS_FINE_LOCATION is denied', async () => {
      setOS('android');
      setVersion(30);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

      const result = await requestBlePermissions();

      expect(result).toBe('denied');
    });

    test('returns denied when ACCESS_FINE_LOCATION is never_ask_again', async () => {
      setOS('android');
      setVersion(30);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

      const result = await requestBlePermissions();

      expect(result).toBe('denied');
    });

    test('uses the legacy single-permission path on the oldest Android (version 1)', async () => {
      setOS('android');
      setVersion(1);
      const requestSpy = jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
      const requestMultipleSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple');

      const result = await requestBlePermissions();

      expect(result).toBe('granted');
      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(requestMultipleSpy).not.toHaveBeenCalled();
    });

    test('uses the legacy path at the upper boundary (version 30) and never calls requestMultiple', async () => {
      setOS('android');
      setVersion(30);
      const requestSpy = jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
      const requestMultipleSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple');

      await requestBlePermissions();

      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(requestMultipleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Android >= 31 (BLUETOOTH_SCAN + BLUETOOTH_CONNECT + ACCESS_FINE_LOCATION)', () => {
    const buildResult = (
      overrides: Partial<Record<string, PermissionStatus>> = {},
    ): { [key in Permission]: PermissionStatus } =>
      ({
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: PermissionsAndroid.RESULTS.GRANTED,
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: PermissionsAndroid.RESULTS.GRANTED,
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.GRANTED,
        ...overrides,
      }) as { [key in Permission]: PermissionStatus };

    test('requests Android 12+ bluetooth permissions', async () => {
      setOS('android');
      setVersion(34);

      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(buildResult());

      const result = await requestBlePermissions();
      expect(result).toBe('granted');
      expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    });

    test('uses the multi-permission path at the lower boundary (version 31)', async () => {
      setOS('android');
      setVersion(31);
      const requestSpy = jest.spyOn(PermissionsAndroid, 'request');
      const requestMultipleSpy = jest
        .spyOn(PermissionsAndroid, 'requestMultiple')
        .mockResolvedValue(buildResult());

      const result = await requestBlePermissions();

      expect(result).toBe('granted');
      expect(requestMultipleSpy).toHaveBeenCalledTimes(1);
      expect(requestSpy).not.toHaveBeenCalled();
    });

    test('returns denied when BLUETOOTH_SCAN is denied (every === GRANTED false branch)', async () => {
      setOS('android');
      setVersion(34);
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(
        buildResult({
          [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: PermissionsAndroid.RESULTS.DENIED,
        }),
      );

      const result = await requestBlePermissions();
      expect(result).toBe('denied');
    });

    test('returns denied when BLUETOOTH_CONNECT is denied (every === GRANTED false branch)', async () => {
      setOS('android');
      setVersion(34);
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(
        buildResult({
          [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: PermissionsAndroid.RESULTS.DENIED,
        }),
      );

      const result = await requestBlePermissions();
      expect(result).toBe('denied');
    });

    test('returns denied when ACCESS_FINE_LOCATION is denied (every === GRANTED false branch)', async () => {
      setOS('android');
      setVersion(34);
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(
        buildResult({
          [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
        }),
      );

      const result = await requestBlePermissions();
      expect(result).toBe('denied');
    });

    test('returns denied when a permission is never_ask_again', async () => {
      setOS('android');
      setVersion(34);
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(
        buildResult({
          [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]:
            PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        }),
      );

      const result = await requestBlePermissions();
      expect(result).toBe('denied');
    });

    test('returns denied when all three permissions are denied', async () => {
      setOS('android');
      setVersion(34);
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(
        buildResult({
          [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: PermissionsAndroid.RESULTS.DENIED,
          [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: PermissionsAndroid.RESULTS.DENIED,
          [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
        }),
      );

      const result = await requestBlePermissions();
      expect(result).toBe('denied');
    });

    test('returns granted only when every requested permission is granted', async () => {
      setOS('android');
      setVersion(33);
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(buildResult());

      const result = await requestBlePermissions();
      expect(result).toBe('granted');
    });

    test('uses the multi-permission path on Android 31+ and never calls the legacy single request', async () => {
      setOS('android');
      setVersion(33);
      const requestSpy = jest.spyOn(PermissionsAndroid, 'request');
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(buildResult());

      await requestBlePermissions();

      expect(requestSpy).not.toHaveBeenCalled();
    });
  });

  describe('error propagation', () => {
    test('rejects when the legacy request rejects', async () => {
      setOS('android');
      setVersion(30);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockRejectedValue(new Error('native request failure'));

      await expect(requestBlePermissions()).rejects.toThrow('native request failure');
    });

    test('rejects when requestMultiple rejects', async () => {
      setOS('android');
      setVersion(34);
      jest
        .spyOn(PermissionsAndroid, 'requestMultiple')
        .mockRejectedValue(new Error('native requestMultiple failure'));

      await expect(requestBlePermissions()).rejects.toThrow('native requestMultiple failure');
    });
  });
});
