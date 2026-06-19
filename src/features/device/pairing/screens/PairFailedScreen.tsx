import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { getClaimStatus } from '@/services/api/claim.api';
import { openAppSettings, openBluetoothSettings, openWifiSettings } from '../deviceSettings';
import { useAppLanguage } from '@/services/i18n/i18n';
import { savePendingPairingContext } from '../pendingPairingContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PairFailedScreen'>;

type GoScreen =
  | typeof ROUTES.PairIntroScreen
  | typeof ROUTES.PairWifiPasswordScreen
  | typeof ROUTES.PairSearchScreen;

type FailureParams = NonNullable<RootStackParamList['PairFailedScreen']>;

const REASONS: { ic: string; t: string; b: string; go: GoScreen }[] = [
  { ic: '🔋', t: 'Robot looks asleep', b: 'Hold the top button until you hear a chime.', go: ROUTES.PairIntroScreen },
  { ic: '📶', t: 'Wrong Wi-Fi password', b: 'Try entering it again — common typos: O vs 0.', go: ROUTES.PairWifiPasswordScreen },
  { ic: '📡', t: 'Robot is too far', b: 'Bring Robot within 1–2 m of your phone.', go: ROUTES.PairSearchScreen },
  { ic: '🔌', t: 'Battery is low', b: 'Plug Robot in for 5 minutes, then try again.', go: ROUTES.PairIntroScreen },
];

export default function PairFailedScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const params = route.params;
  const copy = copyForError(params?.errorCode);
  const settingsAction = settingsActionForError(params?.errorCode);
  const reasons = React.useMemo(() => {
    if (params?.errorCode === 'E-PROV-001') {
      // BLE timeout / connect failure — Wi-Fi password recovery is not relevant.
      return REASONS.filter((reason) => reason.t !== 'Wrong Wi-Fi password');
    }
    return REASONS;
  }, [params?.errorCode]);

  React.useEffect(() => {
    if (!canRecoverLateClaim(params)) return;
    let cancelled = false;
    void getClaimStatus(params.provisioningAttemptId)
      .then((status) => {
        if (cancelled) return;
        const deviceId = status.deviceId || params.deviceId;
        if (status.status === 'CLAIM_CONFIRMED') {
          void savePendingPairingContext({
            deviceId,
            serialNumber: params.serialNumber,
            provisioningAttemptId: params.provisioningAttemptId,
          });
          navigation.navigate(ROUTES.PairRenameScreen, {
            deviceId,
            serialNumber: params.serialNumber,
            provisioningAttemptId: params.provisioningAttemptId,
          });
        }
        if (status.status === 'CLAIMED') {
          // Reset (not navigate) to the success terminus so the finished/failed
          // pairing stack underneath is dropped — otherwise swipe-back lands on
          // this PairFailed screen, whose effect re-fetches CLAIMED and bounces
          // forward to PairSuccess again (an inescapable loop). Mirrors the happy
          // path's reset shape (PairRenameScreen [DeviceHome, PairSuccess]).
          navigation.reset({
            index: 1,
            routes: [
              { name: ROUTES.DeviceHomeScreen },
              {
                name: ROUTES.PairSuccessScreen,
                params: {
                  deviceId,
                  serialNumber: params.serialNumber,
                  provisioningAttemptId: params.provisioningAttemptId,
                },
              },
            ],
          });
        }
      })
      .catch(() => {
        // Keep the recovery screen usable when the status check is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [navigation, params]);

  return (
    <DeviceShell title="Pairing didn't work" onBack={() => navigation.navigate(ROUTES.PairIntroScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="gentle" size={160} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>{copy.heading}</Text>
        <Text style={styles.sub}>
          {copy.body}
        </Text>
      </Box>
      {shouldShowReasonCards(params?.errorCode) ? (
        <Box paddingHorizontal={16} paddingTop={20} gap={8}>
          {reasons.map(r => (
            <TouchableOpacity
              key={r.t}
              style={styles.reasonCard}
              activeOpacity={0.7}
              onPress={() => {
                if (r.go === ROUTES.PairWifiPasswordScreen) {
                  if (params) navigation.navigate(ROUTES.PairWifiPasswordScreen, params);
                  else navigation.navigate(ROUTES.PairWifiPasswordScreen);
                  return;
                }
                if (r.go === ROUTES.PairSearchScreen) {
                  navigation.navigate(ROUTES.PairSearchScreen);
                  return;
                }
                navigation.navigate(ROUTES.PairIntroScreen);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(r.t === 'Wrong Wi-Fi password' ? 'Fix wrong Wi-Fi password' : r.t)}
            >
              <Box style={styles.reasonIcon} alignItems="center" justifyContent="center">
                <Text style={{ fontSize: 16 }}>{r.ic}</Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.reasonTitle}>{r.t}</Text>
                <Text style={styles.reasonBody}>{r.b}</Text>
              </Box>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round">
                <Path d="M9 6l6 6-6 6" />
              </Svg>
            </TouchableOpacity>
          ))}
        </Box>
      ) : null}
      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        {settingsAction ? (
          <DeviceBigBtn accessibilityLabel={settingsAction.label} onClick={settingsAction.onPress}>
            {settingsAction.label}
          </DeviceBigBtn>
        ) : null}
        {canUseSetupHotspot(params) ? (
          <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.PairWifiScreen, setupHotspotParams(params))}>
            Use setup hotspot
          </DeviceBigBtn>
        ) : null}
        <DeviceBigBtn
          secondary
          accessibilityLabel="Scan QR or enter code"
          onClick={() => navigation.navigate(ROUTES.PairQrScanScreen)}
        >
          Scan QR or enter code
        </DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.PairSearchScreen)}>Try again</DeviceBigBtn>
        <DeviceBigBtn
          secondary
          accessibilityLabel="Contact support"
          onClick={() => navigation.navigate(ROUTES.SupportScreen, {
            context: { topic: 'wifi', errorFamily: 'robot_offline' },
          })}
        >
          Contact support
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

function canRecoverLateClaim(params: Props['route']['params']): params is FailureParams & {
  deviceId: string;
  serialNumber: string;
  provisioningAttemptId: string;
} {
  return !!(
    params?.deviceId
    && params.serialNumber
    && params.provisioningAttemptId
    && !params.code
  );
}

function shouldShowReasonCards(errorCode: string | undefined): boolean {
  return errorCode !== 'DEVICE_ALREADY_ASSIGNED' && errorCode !== 'DEVICE_ALREADY_CLAIMED';
}

function settingsActionForError(errorCode: string | undefined): { label: string; onPress: () => void } | undefined {
  switch (errorCode) {
    case 'WIFI_UNAVAILABLE':
      return { label: 'Open Wi-Fi settings', onPress: () => { void openWifiSettings(); } };
    case 'BLE_UNAVAILABLE':
    case 'BLE_POWERED_OFF':
      return { label: 'Open Bluetooth settings', onPress: () => { void openBluetoothSettings(); } };
    case 'BLE_PERMISSION_DENIED':
      return { label: 'Open app settings', onPress: () => { void openAppSettings(); } };
    default:
      return undefined;
  }
}

function copyForError(errorCode: string | undefined): { heading: string; body: string } {
  switch (errorCode) {
    case 'WIFI_UNAVAILABLE':
      return {
        heading: 'Turn on Wi-Fi first',
        body: 'Connect this phone to Wi-Fi before pairing, then keep Bluetooth on for the local Robot handoff.',
      };
    case 'BLE_UNAVAILABLE':
      return {
        heading: "Bluetooth can't be used here",
        body: 'This phone or app build cannot use Bluetooth setup. Keep this phone on Wi-Fi, or use setup hotspot if Robot already showed a code.',
      };
    case 'BLE_POWERED_OFF':
      return {
        heading: 'Turn on Bluetooth first',
        body: 'Bluetooth is required to find Robot nearby. Keep Wi-Fi on too, then try pairing again.',
      };
    case 'BLE_PERMISSION_DENIED':
      return {
        heading: 'Allow Bluetooth access',
        body: 'Allow Nearby devices and Location for this app so Android can scan for Robot over Bluetooth.',
      };
    case 'BLE_SERVICE_UNAVAILABLE':
      return {
        heading: "We couldn't start Bluetooth setup",
        body: 'Close and reopen the app, then try again. If this keeps happening, contact support.',
      };
    case 'BLE_SCAN_TIMEOUT':
      return {
        heading: "We couldn't see Robot nearby",
        body: 'Move Robot within 1-2 m, make sure it is in setup mode, then scan again.',
      };
    case 'DEVICE_NOT_FOUND':
      return {
        heading: "We couldn't find that Robot",
        body: 'Use the live code and serial from the Robot screen, then try scanning again.',
      };
    case 'DEVICE_ALREADY_ASSIGNED':
    case 'DEVICE_ALREADY_CLAIMED':
      return {
        heading: 'Robot is already paired',
        body: 'This Robot is assigned to another account. Contact support if this is your device.',
      };
    case 'INVALID_BLE_CODE':
      return {
        heading: "That code didn't match",
        body: 'Check the 6-digit code shown on Robot and enter the latest code.',
      };
    case 'PROVISIONING_ATTEMPT_NOT_READY':
    case 'DEVICE_AUTH_NOT_VERIFIED':
      return {
        heading: 'Robot is not ready yet',
        body: 'Keep Robot powered on and close by, then retry setup.',
      };
    case 'BLE_PROVISIONING_UNSUPPORTED':
    case 'BLE_PROVISIONING_FAILED':
    case 'PAIRING_CONNECT_FAILED':
      return {
        heading: "Robot didn't accept setup over Bluetooth",
        body: 'Retry nearby, or use setup hotspot with the same Robot code.',
      };
    case 'ESP_SERVER_UNAVAILABLE':
      return {
        heading: "We couldn't reach setup service",
        body: 'Robot setup service is unavailable right now. Try again shortly.',
      };
    case 'PROVISIONING_START_FAILED':
      return {
        heading: "We couldn't start pairing",
        body: 'Check your connection, keep Bluetooth on, then try scanning again.',
      };
    case 'PROVISIONING_TIMEOUT':
      return {
        heading: 'Setup timed out',
        body: 'Move Robot closer to Wi-Fi and your phone, then try again.',
      };
    case 'WIFI_AUTH_FAILED':
      return {
        heading: 'Wi-Fi password did not work',
        body: 'Re-enter the Wi-Fi password and check capitalization.',
      };
    default:
      return {
        heading: "We couldn't reach your Robot",
        body: 'Pairing usually works on the second try. Pick what likely happened:',
      };
  }
}

function canUseSetupHotspot(params: Props['route']['params']): params is FailureParams {
  return !!(
    params?.deviceId
    && params.serialNumber
    && params.provisioningAttemptId
    && params.code
  );
}

function setupHotspotParams(params: FailureParams): NonNullable<RootStackParamList['PairWifiScreen']> {
  return {
    deviceId: params.deviceId,
    serialNumber: params.serialNumber,
    provisioningAttemptId: params.provisioningAttemptId,
    code: params.code,
    provisioningTransport: 'legacy_backend',
  };
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, color: DV.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 20 },
  sub: { fontSize: 13, color: DV.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 6 },
  reasonCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  reasonIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF1F5', flexShrink: 0 },
  reasonTitle: { fontSize: 14, color: DV.ink },
  reasonBody: { fontSize: 12, color: DV.ink2, marginTop: 2, lineHeight: 20 },
});
