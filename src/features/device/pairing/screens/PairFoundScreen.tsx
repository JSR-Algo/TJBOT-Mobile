import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { Icon } from '@/design-system/icons';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';
import { CLAIM_COPY } from '../claimCopy';
import { describeClaimFailure, type ClaimStatusDescriptor } from '../claimStatus';
import { putPairingBootstrapToken } from '../pairingSecretHandoff';
import { savePendingPairingContext } from '../pendingPairingContext';
import { useZeroCodeClaimFlow } from '../useZeroCodeClaimFlow';
import { isZeroCodeClaimEnabled } from '@/config/feature-flags';
import { requestClaim } from '@/services/api/claim.api';
import { mintBootstrapToken } from '@/services/api/device.api';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'PairFoundScreen'>;

const PAIRING_STEPS = [
  { title: 'Prepare', meta: 'Bluetooth and local network allowed', state: 'complete' },
  { title: 'Confirm identity', meta: 'Match the code shown on TeeBot', state: 'current' },
  { title: 'Connect Wi-Fi', meta: 'Securely hand off home network', state: 'upcoming' },
  { title: 'Name and assign', meta: 'Choose a room and child', state: 'upcoming' },
  { title: 'Verify', meta: 'Run speaker, screen and network checks', state: 'upcoming' },
] as const;

export default function PairFoundScreen({ navigation, route }: Props) {
  const params = route.params;
  const { t } = useAppLanguage();
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
  const serialNumber = params?.serialNumber ?? params?.deviceId ?? t('Robot nearby');
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
    if (params?.provisioningTransport === 'ble') {
      if (wifiClaimBusy) return;
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
          const bootstrap = await mintBootstrapToken({ provisioningAttemptId: claimed.claimId });
          putPairingBootstrapToken(claimed.claimId, bootstrap.token);
          navigation.navigate(ROUTES.PairWifiScreen, {
            ...(params ?? {}),
            deviceId: claimed.deviceId || deviceId,
            serialNumber,
            provisioningAttemptId: claimed.claimId,
            bleDeviceId: bleDevice.id,
            provisioningTransport: 'ble',
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
  }, [bleDevice, claimActions, deviceId, navigation, params, serialNumber, wifiClaimBusy, zeroCodeEnabled]);

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
    <DeviceShell
      screenTestID="pairingSetupPage"
      scrollTestID="pairingSetupScroll"
      hideHeader
    >
      <Box paddingHorizontal={20}>
        <Text fontWeight="800" style={styles.eyebrow}>Add a TeeBot</Text>
        <Text fontWeight="800" style={styles.pageTitle}>Pairing setup</Text>
        <Text style={styles.summary}>Search, confirm identity, connect Wi-Fi, name and verify the robot.</Text>

        <Box style={styles.hero} flexDirection="row" alignItems="center" gap={16}>
          <Box style={styles.heroDecoration} />
          <Box style={styles.heroDecorationInner} />
          <Box style={styles.heroIcon} alignItems="center" justifyContent="center">
            <Icon name="Bluetooth" size={34} strokeWidth={2.7} color={referenceColors.primaryDeep} testID="pairingBluetoothIcon" />
          </Box>
          <Box flex={1} style={styles.heroContent}>
            <Text fontWeight="800" style={styles.heroMetric}>Step 2 of 5</Text>
            <Text fontWeight="700" style={styles.heroLabel}>Confirm the robot</Text>
            <Box style={styles.heroProgress}>
              <Box style={styles.heroProgressFill} />
            </Box>
          </Box>
        </Box>

        <Box style={styles.stepsCard}>
          {PAIRING_STEPS.map((step, index) => {
            const current = step.state === 'current';
            return (
              <Box key={step.title} style={styles.stepRow} flexDirection="row" gap={12}>
                <Box style={styles.stepRail} alignItems="center">
                  <Box
                    style={[styles.stepNumber, current && styles.stepNumberCurrent]}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text
                      i18n={false}
                      fontWeight="800"
                      style={[styles.stepNumberText, current && styles.stepNumberTextCurrent]}
                    >
                      {index + 1}
                    </Text>
                  </Box>
                  {index < PAIRING_STEPS.length - 1 ? <Box style={styles.stepConnector} /> : null}
                </Box>
                <Box flex={1} paddingTop={4}>
                  <Text fontWeight="800" style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepMeta}>{step.meta}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box style={styles.robotCard}>
          <Text i18n={false} fontWeight="800" style={styles.robotName}>{`TeeBot · ${serialNumber}`}</Text>
          <Text style={styles.robotMeta}>Nearby · ready to confirm</Text>
        </Box>

        <Box style={styles.notice} flexDirection="row" gap={12}>
          <Icon name="ShieldCheck" size={22} color={referenceColors.primaryDeep} />
          <Box flex={1}>
            <Text fontWeight="800" style={styles.noticeTitle}>Check the physical robot</Text>
            <Text style={styles.noticeBody}>Only continue when the robot shown here is the one beside you.</Text>
          </Box>
        </Box>

        {statusTitle ? (
          <Box style={styles.statusBox} gap={4}>
            <Text fontWeight="600" style={styles.statusTitle}>{statusTitle}</Text>
            {statusBody ? <Text style={styles.statusBody}>{statusBody}</Text> : null}
          </Box>
        ) : null}

        <Box paddingTop={20} paddingBottom={30} gap={10}>
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
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: referenceColors.primaryDeep, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  pageTitle: { color: DV.ink, fontSize: 29, letterSpacing: -0.9, lineHeight: 34, marginTop: 6 },
  summary: { color: DV.ink2, fontSize: 12, lineHeight: 18, marginTop: 7 },
  hero: { backgroundColor: referenceColors.primarySoft, borderRadius: 28, marginTop: 18, minHeight: 126, overflow: 'hidden', padding: 18 },
  heroDecoration: { borderColor: 'rgba(255,255,255,0.52)', borderRadius: 70, borderWidth: 18, bottom: -52, height: 118, position: 'absolute', right: -38, width: 118 },
  heroDecorationInner: { borderColor: 'rgba(255,255,255,0.45)', borderRadius: 54, borderWidth: 12, bottom: -37, height: 90, position: 'absolute', right: -24, width: 90 },
  heroIcon: { backgroundColor: referenceColors.card, borderRadius: 22, height: 68, width: 68, ...referenceShadow.card },
  heroContent: { zIndex: 1 },
  heroMetric: { color: DV.ink, fontSize: 25, letterSpacing: -0.8, lineHeight: 29 },
  heroLabel: { color: DV.ink2, fontSize: 12, marginTop: 4 },
  heroProgress: { backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 99, height: 7, marginTop: 12, overflow: 'hidden' },
  heroProgressFill: { backgroundColor: referenceColors.primary, borderRadius: 99, height: 7, width: '40%' },
  stepsCard: { backgroundColor: referenceColors.card, borderRadius: 25, marginTop: 16, paddingHorizontal: 18, paddingVertical: 16, ...referenceShadow.card },
  stepRow: { minHeight: 62 },
  stepRail: { width: 38 },
  stepNumber: { backgroundColor: referenceColors.bgWarm, borderColor: DV.hair, borderRadius: 19, borderWidth: 1, height: 38, width: 38, zIndex: 1 },
  stepNumberCurrent: { backgroundColor: referenceColors.card, borderColor: referenceColors.primary, borderWidth: 2, shadowColor: referenceColors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 2 },
  stepNumberText: { color: DV.ink3, fontSize: 10 },
  stepNumberTextCurrent: { color: referenceColors.primaryDeep },
  stepConnector: { backgroundColor: DV.hair, flex: 1, marginVertical: -1, width: 2 },
  stepTitle: { color: DV.ink, fontSize: 12 },
  stepMeta: { color: DV.ink3, fontSize: 9, lineHeight: 13, marginTop: 3 },
  robotCard: { backgroundColor: referenceColors.card, borderColor: referenceColors.primary, borderRadius: 20, borderWidth: 1, marginTop: 14, padding: 16 },
  robotName: { color: DV.ink, fontSize: 13 },
  robotMeta: { color: DV.ink2, fontSize: 11, marginTop: 5 },
  notice: { backgroundColor: referenceColors.primarySoft, borderRadius: 18, marginTop: 14, padding: 14 },
  noticeTitle: { color: DV.ink, fontSize: 12 },
  noticeBody: { color: DV.ink2, fontSize: 10, lineHeight: 15, marginTop: 4 },
  statusBox: { marginTop: 14, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, backgroundColor: DV.card, padding: 12 },
  statusTitle: { fontSize: 14, color: DV.ink },
  statusBody: { fontSize: 12, color: DV.ink2, lineHeight: 20 },
});
