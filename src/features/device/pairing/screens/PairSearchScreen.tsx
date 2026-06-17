import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { getDeviceStatus, startDeviceProvisioning, type DeviceStatus } from '@/services/api/device.api';
import { listAvailableClaimDevices, type AvailableClaimDevice } from '@/services/api/claim.api';
import { initializeBle, scanForTJBotDevices } from '@/services/ble/service';
import type { BleDeviceCandidate } from '@/services/ble/types';
import { isZeroCodeClaimEnabled } from '@/config/feature-flags';
import { serialFromCandidate } from '../serialFromCandidate';

type Props = NativeStackScreenProps<RootStackParamList, 'PairSearchScreen'>;

// A nearby robot the BLE scan resolved to a serial, optionally labelled with the
// backend's display name when the zero-code claim list is available. A valid
// zero-code candidate must keep its BLE identity so the app can deliver the
// claim bootstrap token over BluFi.
interface RobotCandidate {
  key: string;
  candidate: BleDeviceCandidate;
  serialNumber: string;
  displayName: string;
}

type SearchState = 'searching' | 'choosing' | 'provisioning';
const MAX_BLE_DISCOVERY_ATTEMPTS = 3;

export default function PairSearchScreen({ navigation, route }: Props) {
  const cancelledRef = React.useRef(false);
  const [searchState, setSearchState] = React.useState<SearchState>('searching');
  const [candidates, setCandidates] = React.useState<RobotCandidate[]>([]);
  const reconnectMode = route.params?.reconnectMode === true;

  // Run BLE provisioning for a chosen candidate and forward to PairFound. Shared
  // by the single-device fast path and the multi-device picker so both reach the
  // identical downstream flow.
  const provisionAndGoToFound = React.useCallback(
    async (chosen: RobotCandidate): Promise<void> => {
      setSearchState('provisioning');
      try {
        logDevPairSearchEvent('provision start requested', { serialNumber: chosen.serialNumber });
        const attempt = await startDeviceProvisioning({ serialNumber: chosen.serialNumber });
        if (cancelledRef.current) return;
        logDevPairSearchEvent('provision start succeeded', {
          serialNumber: chosen.serialNumber,
          deviceId: attempt.deviceId,
          provisioningAttemptId: attempt.provisioningAttemptId,
          deviceStatus: attempt.deviceStatus,
        });
        navigation.navigate(ROUTES.PairFoundScreen, {
          serialNumber: chosen.serialNumber,
          deviceId: attempt.deviceId,
          provisioningAttemptId: attempt.provisioningAttemptId,
          bleDeviceId: chosen.candidate.id,
          provisioningTransport: 'ble',
        });
      } catch (error) {
        if (cancelledRef.current) return;
        const errorCode = errorCodeFrom(error, 'PROVISIONING_START_FAILED');
        logDevPairSearchEvent('provision start failed', {
          serialNumber: chosen.serialNumber,
          errorCode,
          ...devErrorSummary(error),
        });
        navigation.navigate(ROUTES.PairFailedScreen, {
          errorCode,
        });
      }
    },
    [navigation],
  );

  const reconnectAndGoToWifi = React.useCallback(
    async (chosen: RobotCandidate, knownPrimaryDevice?: DeviceStatus): Promise<void> => {
      setSearchState('provisioning');
      try {
        const device = knownPrimaryDevice ?? await getDeviceStatus('primary');
        if (cancelledRef.current) return;
        if (!device.id) {
          throw Object.assign(new Error('Primary device is missing'), { code: 'RECONNECT_DEVICE_NOT_FOUND' });
        }
        navigation.navigate(ROUTES.PairWifiScreen, {
          deviceId: device.id,
          serialNumber: chosen.serialNumber,
          provisioningAttemptId: `reconnect:${device.id}`,
          bleDeviceId: chosen.candidate.id,
          provisioningTransport: 'ble_reconnect',
        });
      } catch (error) {
        if (cancelledRef.current) return;
        navigation.navigate(ROUTES.PairFailedScreen, {
          errorCode: errorCodeFrom(error, 'RECONNECT_DEVICE_LOOKUP_FAILED'),
        });
      }
    },
    [navigation],
  );

  const routeResolvedCandidate = React.useCallback(
    async (chosen: RobotCandidate): Promise<void> => {
      if (reconnectMode) {
        await reconnectAndGoToWifi(chosen);
        return;
      }
      await provisionAndGoToFound(chosen);
    },
    [provisionAndGoToFound, reconnectAndGoToWifi, reconnectMode],
  );

  React.useEffect(() => {
    cancelledRef.current = false;

    async function scanAndResolveCandidates(): Promise<void> {
      const phoneOnline = await isPhoneOnline();
      if (cancelledRef.current) return;
      if (!phoneOnline) {
        navigation.navigate(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' });
        return;
      }

      let bleBootstrapFailed = false;
      const bootstrap = await initializeBle().catch((error: unknown) => {
        bleBootstrapFailed = true;
        logDevPairSearchEvent('ble bootstrap failed', devErrorSummary(error));
        return undefined;
      });
      if (cancelledRef.current) return;
      if (!bootstrap?.available) {
        navigation.navigate(ROUTES.PairFailedScreen, {
          errorCode: bleBootstrapErrorCode(bootstrap, bleBootstrapFailed),
        });
        return;
      }

      let resolved: RobotCandidate[] = [];
      for (let attempt = 1; attempt <= MAX_BLE_DISCOVERY_ATTEMPTS; attempt += 1) {
        const scan = await scanForTJBotDevices().catch((error: unknown) => {
          logDevPairSearchEvent('ble scan failed', { scanAttempt: attempt, ...devErrorSummary(error) });
          return undefined;
        });
        if (cancelledRef.current) return;

        resolved = resolveRobotCandidates(scan?.allowed ?? []);
        if (__DEV__) {
          console.info('[TBOT PairSearch] candidates', {
            scanAttempt: attempt,
            allowedCount: scan?.allowed.length ?? 0,
            resolvedCount: resolved.length,
            blockedCount: scan?.blocked.length ?? 0,
          });
        }
        if (resolved.length > 0) break;
      }

      if (resolved.length === 0 && isZeroCodeClaimEnabled()) {
        const available = await listAvailableClaimDevicesForDiscovery();
        if (cancelledRef.current) return;
        if (__DEV__) {
          console.info('[TBOT PairSearch] backend claim candidates', {
            availableCount: available.length,
            resolvedCount: 0,
          });
        }
      }

      if (resolved.length === 0) {
        navigation.navigate(ROUTES.PairFailedScreen, { errorCode: 'BLE_SCAN_TIMEOUT' });
        return;
      }

      // Single nearby robot → keep the fast path (no extra tap).
      if (resolved.length === 1) {
        await routeResolvedCandidate(resolved[0]);
        return;
      }

      // Multiple nearby robots → let the user choose to avoid claiming the wrong
      // one in a multi-robot household. Enrich labels from the backend claim list
      // when the zero-code flow is enabled (the list route is live then);
      // labelling failure is non-fatal and falls back to the serial.
      const labelled = await labelCandidates(resolved);
      if (cancelledRef.current) return;
      setCandidates(labelled);
      setSearchState('choosing');
    }

    void scanAndResolveCandidates();
    return () => {
      cancelledRef.current = true;
    };
  }, [navigation, routeResolvedCandidate]);

  const chooseCandidate = React.useCallback(
    (item: RobotCandidate): void => {
      void routeResolvedCandidate(item);
    },
    [routeResolvedCandidate],
  );

  const cancelSearchToIntro = React.useCallback(() => {
    cancelledRef.current = true;
    navigation.navigate(ROUTES.PairIntroScreen);
  }, [navigation]);

  const cancelSearchToFailed = React.useCallback(() => {
    cancelledRef.current = true;
    navigation.navigate(ROUTES.PairFailedScreen, { errorCode: 'BLE_SCAN_TIMEOUT' });
  }, [navigation]);

  if (searchState === 'choosing') {
    return (
      <DeviceShell title="Choose your Robot" onBack={cancelSearchToIntro}>
        <Box paddingTop={20} paddingHorizontal={20}>
          <Text style={styles.pickerIntro}>
            We found more than one Robot nearby. Pick the one you want to pair.
          </Text>
        </Box>
        <ScrollView contentContainerStyle={styles.pickerList}>
          {candidates.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.robotRow}
              activeOpacity={0.7}
              onPress={() => chooseCandidate(item)}
              accessibilityRole="button"
              accessibilityLabel={`${reconnectMode ? 'Reconnect' : 'Pair'} Robot ${item.displayName}`}
            >
              <Box flex={1}>
                <Text fontWeight="600" style={styles.robotName}>{item.displayName}</Text>
                {item.displayName !== item.serialNumber ? (
                  <Text style={styles.robotSerial}>{item.serialNumber}</Text>
                ) : null}
              </Box>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round">
                <Path d="M9 6l6 6-6 6" />
              </Svg>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Box paddingHorizontal={24} paddingBottom={30}>
          <TouchableOpacity onPress={cancelSearchToFailed} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text fontWeight="500" style={styles.link}>I don't see my Robot</Text>
          </TouchableOpacity>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title="Looking for Robot…" onBack={cancelSearchToIntro}>
      <Box paddingTop={40} paddingHorizontal={24} paddingBottom={30} alignItems="center" gap={24}>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          {[0, 1, 2].map(i => (
            <Box key={i} style={styles.pulseRing} />
          ))}
          <Svg width={60} height={60} viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="1.6" strokeLinecap="round">
            <Path d="M5 12.55a11 11 0 0114 0" />
            <Path d="M8.5 16.5a7 7 0 017 0" />
            <Path d="M12 20l.01 0" />
            <Path d="M2 8.82a15 15 0 0120 0" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Looking nearby…</Text>
        <Text style={styles.sub}>
          {reconnectMode
            ? 'Hold the top button for 5 seconds to open setup mode, then keep Robot within 3 meters.'
            : 'Make sure Robot is in setup mode and within 3 meters of your phone.'}
        </Text>
        <TouchableOpacity onPress={cancelSearchToFailed} style={{ marginTop: 20 }}>
          <Text fontWeight="500" style={styles.link}>I don't see my Robot</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

// Resolve BLE scan candidates to those with a parseable serial, de-duplicated by
// serial (the same robot can appear under multiple BLE ids).
function resolveRobotCandidates(allowed: BleDeviceCandidate[]): RobotCandidate[] {
  const bySerial = new Map<string, RobotCandidate>();
  for (const candidate of allowed) {
    const serialNumber = serialFromCandidate(candidate);
    if (!serialNumber || bySerial.has(serialNumber)) continue;
    bySerial.set(serialNumber, {
      key: candidate.id,
      candidate,
      serialNumber,
      displayName: serialNumber,
    });
  }
  return [...bySerial.values()];
}

// Confirm a resolved candidate against the backend's claimable list when the
// zero-code flow is enabled (the list route is live then). The list keys on a
// device UUID + a serial-shaped display_name, while a BLE candidate is only
// resolvable to its serial at scan time — so the sound join is the human-facing
// display_name. A match keeps the serial label (already shown) and is currently
// confirmation-only; no match leaves the candidate untouched. Gated behind the
// flag so the ship build never calls the server-flag-gated (503) route. Backend
// lookup failure is dev-logged and non-fatal so labelling never blocks the picker.
async function labelCandidates(resolved: RobotCandidate[]): Promise<RobotCandidate[]> {
  if (!isZeroCodeClaimEnabled()) return resolved;
  const available = await listAvailableClaimDevicesForDiscovery();
  if (available.length === 0) return resolved;
  const labelBySerial = new Map(
    available
      .filter((device) => device.displayName.length > 0)
      .map((device) => [device.displayName, device.displayName] as const),
  );
  return resolved.map((item) => {
    const displayName = labelBySerial.get(item.serialNumber);
    return displayName ? { ...item, displayName } : item;
  });
}

async function listAvailableClaimDevicesForDiscovery(): Promise<AvailableClaimDevice[]> {
  try {
    return await listAvailableClaimDevices();
  } catch (error) {
    logDevPairSearchEvent('backend claim candidate lookup failed', devErrorSummary(error));
    return [];
  }
}

async function isPhoneOnline(): Promise<boolean> {
  const state = await NetInfo.fetch().catch(() => undefined);
  return state?.isConnected === true && state.isInternetReachable !== false;
}

function errorCodeFrom(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as { code?: unknown; response?: { data?: { code?: unknown; error?: { code?: unknown } } } };
    const data = record.response?.data;
    if (typeof data?.error?.code === 'string') return data.error.code;
    if (typeof data?.code === 'string') return data.code;
    if (typeof record.code === 'string') return record.code;
  }
  return fallback;
}

function bleBootstrapErrorCode(
  bootstrap: Awaited<ReturnType<typeof initializeBle>> | undefined,
  bootstrapFailed: boolean,
): string {
  if (bootstrapFailed) return 'BLE_SERVICE_UNAVAILABLE';
  if (bootstrap?.permission === 'denied') return 'BLE_PERMISSION_DENIED';
  if (bootstrap?.reason === 'Bluetooth is off.') return 'BLE_POWERED_OFF';
  return 'BLE_UNAVAILABLE';
}

function logDevPairSearchEvent(message: string, payload: Record<string, unknown>): void {
  if (__DEV__) {
    console.info(`[TBOT PairSearch] ${message}`, payload);
  }
}

function devErrorSummary(error: unknown): Record<string, unknown> {
  if (!isRecord(error)) return { kind: typeof error };
  const summary: Record<string, unknown> = {};
  if (typeof error.name === 'string') summary.name = error.name;
  if (typeof error.code === 'string' || typeof error.code === 'number') summary.code = error.code;
  if (typeof error.status === 'number') summary.status = error.status;
  if (typeof error.traceId === 'string') summary.traceId = error.traceId;
  if (isRecord(error.response) && typeof error.response.status === 'number') {
    summary.status = error.response.status;
  }
  if (isRecord(error.response) && isRecord(error.response.data)) {
    const data = error.response.data;
    if (typeof data.code === 'string') summary.backendCode = data.code;
    if (isRecord(data.error) && typeof data.error.code === 'string') summary.backendCode = data.error.code;
    if (typeof data.traceId === 'string') summary.traceId = data.traceId;
  }
  return Object.keys(summary).length > 0 ? summary : { kind: 'object' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const styles = StyleSheet.create({
  pulseWrap: { width: 200, height: 200 },
  pulseRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: DV.accent, opacity: 0.5 },
  heading: { fontSize: 18, color: DV.ink, textAlign: 'center' },
  sub: { fontSize: 13, color: DV.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  link: { fontSize: 14, color: DV.accent },
  pickerIntro: { fontSize: 13, color: DV.ink2, lineHeight: 22 },
  pickerList: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  robotRow: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  robotName: { fontSize: 15, color: DV.ink },
  robotSerial: { fontSize: 12, color: DV.ink3, marginTop: 2 },
});
