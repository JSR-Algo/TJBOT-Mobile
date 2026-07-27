import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { CLAIM_COPY } from '../claimCopy';
import { describeClaimFailure, type ClaimStatusDescriptor } from '../claimStatus';
import { savePendingPairingContext } from '../pendingPairingContext';
import { useZeroCodeClaimFlow } from '../useZeroCodeClaimFlow';
import { isZeroCodeClaimEnabled } from '@/config/feature-flags';
import { requestClaim } from '@/services/api/claim.api';

type Props = NativeStackScreenProps<RootStackParamList, 'PairFoundScreen'>;

export default function PairFoundScreen({ navigation, route }: Props) {
  const params = route.params;
  // When the zero-code physical-confirm flow is explicitly disabled, PairFound
  // still offers a working forward path: route into the existing device.api
  // Wi-Fi pairing path via the QR/code code-funnel (PairQrScan -> PairWifi ->
  // PairWifiPassword -> PairConnecting -> PairSuccess). That path requires the
  // robot's 6-digit code, which only the QR/code screens produce, so the
  // primary CTA funnels there rather than jumping straight to PairWifi. With
  // the default flag ON we keep the zero-code claim path below. Neither state
  // may dead-end (plan §4 C2/C5).
  const zeroCodeEnabled = isZeroCodeClaimEnabled();
  const deviceId = params?.deviceId ?? '';
  const serialNumber = params?.serialNumber ?? params?.deviceId ?? 'Robot nearby';
  const provisioningAttemptId = params?.provisioningAttemptId;
  const [wifiClaimBusy, setWifiClaimBusy] = React.useState(false);
  const [wifiClaimError, setWifiClaimError] = React.useState<ClaimStatusDescriptor | null>(null);
  const bleDevice = React.useMemo(() => {
    if (!params?.bleDeviceId) return undefined;
    return {
      id: params.bleDeviceId,
      name: serialNumber,
      localName: serialNumber,
      serviceUUIDs: [],
    };
  }, [params?.bleDeviceId, serialNumber]);
  const [claimState, claimActions] = useZeroCodeClaimFlow({
    deviceId,
    bleDevice,
    onConnected: (result) => {
      void savePendingPairingContext({
        deviceId: result.deviceId,
        serialNumber,
        provisioningAttemptId: provisioningAttemptId ?? '',
      });
      navigation.navigate(ROUTES.PairRenameScreen, {
        deviceId: result.deviceId,
        serialNumber,
        provisioningAttemptId,
      });
    },
  });

  const startClaim = React.useCallback(() => {
    // Flag OFF, or no deviceId to claim against: forward into the QR/code
    // code-funnel that feeds the device.api Wi-Fi pairing path.
    if (!zeroCodeEnabled || !deviceId) {
      navigation.navigate(ROUTES.PairQrScanScreen, params);
      return;
    }
    // Zero-code requires the nearby BLE identity so the app can deliver the
    // claim-bound bootstrap token. If route state lost it, avoid creating a
    // backend pending claim that the robot can never confirm.
    if (!bleDevice) {
      navigation.navigate(ROUTES.PairQrScanScreen, params);
      return;
    }
    if (params?.provisioningTransport === 'ble' || params?.provisioningTransport === 'ble_claim') {
      if (wifiClaimBusy) return;
      if (params.provisioningTransport === 'ble' && provisioningAttemptId) {
        navigation.navigate(ROUTES.PairWifiScreen, {
          ...(params ?? {}),
          deviceId,
          serialNumber,
          provisioningAttemptId,
          bleDeviceId: bleDevice.id,
          provisioningTransport: 'ble',
        });
        return;
      }
      setWifiClaimBusy(true);
      setWifiClaimError(null);
      void (async () => {
        try {
          const claimed = await requestClaim({ deviceId });
          if (!claimed.claimId) {
            throw Object.assign(new Error('Claim request did not return a claim id'), { code: 'CLAIM_REQUEST_MALFORMED' });
          }
          if (claimed.status === 'CLAIM_CONFIRMED' || claimed.status === 'CLAIMED') {
            void savePendingPairingContext({
              deviceId: claimed.deviceId || deviceId,
              serialNumber,
              provisioningAttemptId: claimed.claimId,
            });
            navigation.navigate(ROUTES.PairRenameScreen, {
              deviceId: claimed.deviceId || deviceId,
              serialNumber,
              provisioningAttemptId: claimed.claimId,
            });
            return;
          }
          navigation.navigate(ROUTES.PairWifiScreen, {
            ...(params ?? {}),
            deviceId: claimed.deviceId || deviceId,
            serialNumber,
            provisioningAttemptId: claimed.claimId,
            bleDeviceId: bleDevice.id,
            provisioningTransport: 'ble_claim',
          });
        } catch (error) {
          setWifiClaimError(describeClaimFailure(error));
        } finally {
          setWifiClaimBusy(false);
        }
      })();
      return;
    }
    claimActions.connect();
  }, [bleDevice, claimActions, deviceId, navigation, params, provisioningAttemptId, serialNumber, wifiClaimBusy, zeroCodeEnabled]);

  const openFallback = React.useCallback(() => {
    navigation.navigate(ROUTES.PairQrScanScreen, params);
  }, [navigation, params]);

  const isClaiming = wifiClaimBusy || claimState.phase === 'claiming' || claimState.phase === 'waitingPhysicalConfirm';
  const primaryLabel = isClaiming ? CLAIM_COPY.connectingCta : 'This is my Robot';
  // CTA is force-disabled only while a zero-code claim is genuinely in flight or
  // the claim flow cannot start (flag ON + deviceId present). When the flag is
  // OFF the CTA always routes forward (QR/code funnel), so it stays enabled.
  const primaryDisabled = isClaiming || (zeroCodeEnabled && deviceId ? !claimState.canConnect : false);
  // The QR/code fallback is a DISTINCT affordance only when the primary CTA is
  // doing something else — i.e. flag ON + a deviceId-bound claim that failed, so
  // the parent can switch to QR/code. When the flag is OFF (or there is no
  // deviceId), the primary CTA is already the QR funnel, so a second identical
  // button would be redundant. PairFound never dead-ends in either case.
  const showFallbackButton = zeroCodeEnabled && deviceId !== '' && (claimState.phase === 'failed' || wifiClaimError !== null);
  const statusTitle = claimState.phase === 'waitingPhysicalConfirm'
    ? CLAIM_COPY.waitingTitle
    : wifiClaimError?.title ?? claimState.error?.title;
  const statusBody = claimState.phase === 'waitingPhysicalConfirm'
    ? CLAIM_COPY.waitingBody
    : wifiClaimError?.body ?? claimState.error?.body;

  return (
    <DeviceShell title="We found your Robot" onBack={() => navigation.navigate(ROUTES.PairIntroScreen)}>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.card} flexDirection="row" gap={14} alignItems="center">
          <RobotDevice emotion="paired" size={84} accent="#FF6F61" />
          <Box flex={1}>
            <Text fontWeight="600" style={styles.robotName}>Robot · {serialNumber}</Text>
            <Box flexDirection="row" alignItems="center" gap={6} style={{ marginTop: 2 }}>
              <Box style={styles.greenDot} />
              <Text style={styles.readyText}>Ready to pair</Text>
            </Box>
            <Text style={styles.signalText}>Signal: strong · Battery: 78%</Text>
          </Box>
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text style={styles.warning}>
          Make sure this is <Text fontWeight="600" style={{ color: DV.ink }}>your</Text> Robot before pairing.
        </Text>
        {statusTitle ? (
          <Box style={styles.statusBox} gap={4}>
            <Text fontWeight="600" style={styles.statusTitle}>{statusTitle}</Text>
            {statusBody ? <Text style={styles.statusBody}>{statusBody}</Text> : null}
          </Box>
        ) : null}
      </Box>
      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={startClaim} disabled={primaryDisabled}>
          {primaryLabel}
        </DeviceBigBtn>
        {claimState.phase === 'failed' && claimState.error?.retryable ? (
          <DeviceBigBtn secondary onClick={claimActions.retry}>Try again</DeviceBigBtn>
        ) : null}
        {showFallbackButton ? (
          <DeviceBigBtn secondary onClick={openFallback}>Scan QR or enter code</DeviceBigBtn>
        ) : null}
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.PairSearchScreen)}>Search again</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, padding: 16 },
  robotName: { fontSize: 15, color: DV.ink, marginBottom: 2 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DV.good },
  readyText: { fontSize: 13, color: DV.ink2 },
  signalText: { fontSize: 12, color: DV.ink3, marginTop: 2 },
  warning: { fontSize: 13, color: DV.ink2, lineHeight: 22 },
  statusBox: { marginTop: 14, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, backgroundColor: DV.card, padding: 12 },
  statusTitle: { fontSize: 14, color: DV.ink },
  statusBody: { fontSize: 12, color: DV.ink2, lineHeight: 20 },
});
