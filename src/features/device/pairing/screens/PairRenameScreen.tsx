import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { finalizeDevicePairing } from '../finalizeDevicePairing';
import { getPendingPairingContext } from '../pendingPairingContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PairRenameScreen'>;

export default function PairRenameScreen({ navigation, route }: Props) {
  const [authTimedOut, setAuthTimedOut] = React.useState(false);
  const inFlightRef = React.useRef(false);
  const inFlightRunSeqRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);
  const focusedRef = React.useRef(true);
  const runSeqRef = React.useRef(0);
  const finishPairingRef = React.useRef<(() => Promise<void>) | null>(null);

  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
      runSeqRef.current += 1;
    };
  }, []);

  const finishPairing = React.useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    if (!mountedRef.current || !focusedRef.current) return;
    inFlightRef.current = true;
    const runSeq = ++runSeqRef.current;
    inFlightRunSeqRef.current = runSeq;
    const isCurrentRun = () => mountedRef.current && runSeqRef.current === runSeq;
    const isActiveRun = () => isCurrentRun() && focusedRef.current;

    try {
      setAuthTimedOut(false);

      const pendingContext = await getPendingPairingContext().catch(() => null);
      if (!isActiveRun()) return;
      const deviceId = route.params?.deviceId ?? pendingContext?.deviceId;
      const provisioningAttemptId = route.params?.provisioningAttemptId ?? pendingContext?.provisioningAttemptId;
      const serialNumber = route.params?.serialNumber ?? pendingContext?.serialNumber;

      if (!deviceId || !provisioningAttemptId) {
        if (isActiveRun()) {
          navigation.navigate(ROUTES.PairFailedScreen, {
            deviceId,
            serialNumber,
            provisioningAttemptId,
            errorCode: 'PAIRING_CONTEXT_MISSING',
          });
        }
        return;
      }

      try {
        const guardedNavigation: Pick<NavigationProp<RootStackParamList>, 'reset'> = {
          reset: (state) => {
            if (isActiveRun()) navigation.reset(state as Parameters<typeof navigation.reset>[0]);
          },
        };
        await finalizeDevicePairing(guardedNavigation, { deviceId, provisioningAttemptId, serialNumber });
      } catch (error) {
        const code = errorCodeFrom(error, 'PROVISIONING_COMPLETE_FAILED');
        if (code === 'DEVICE_AUTH_TIMEOUT') {
          if (isActiveRun()) setAuthTimedOut(true);
          return;
        }
        if (!isActiveRun()) return;
        navigation.navigate(ROUTES.PairFailedScreen, {
          deviceId,
          serialNumber,
          provisioningAttemptId,
          errorCode: code,
        });
      }
    } finally {
      if (mountedRef.current && inFlightRunSeqRef.current === runSeq) {
        inFlightRef.current = false;
        inFlightRunSeqRef.current = null;
        if (focusedRef.current && !isCurrentRun()) {
          void Promise.resolve().then(() => finishPairingRef.current?.());
        }
      }
    }
  }, [navigation, route.params?.deviceId, route.params?.provisioningAttemptId, route.params?.serialNumber]);

  finishPairingRef.current = finishPairing;

  React.useEffect(() => {
    const removeBlurListener = navigation.addListener?.('blur', () => {
      focusedRef.current = false;
      runSeqRef.current += 1;
    });
    const removeFocusListener = navigation.addListener?.('focus', () => {
      focusedRef.current = true;
      if (!inFlightRef.current) void finishPairing();
    });
    return () => {
      removeBlurListener?.();
      removeFocusListener?.();
    };
  }, [finishPairing, navigation]);

  React.useEffect(() => {
    void finishPairing();
  }, [finishPairing]);

  return (
    <DeviceShell title="Finishing setup">
      <Box paddingHorizontal={20} paddingTop={32} paddingBottom={30} style={styles.content}>
        <ActivityIndicator color={DV.accent} size="large" />
        {authTimedOut ? (
          <Text testID="pairing-auth-timeout-message" style={styles.retryMessage}>
            Robot is still finishing its Wi-Fi connection. Wait a moment, then try again.
          </Text>
        ) : (
          <Text style={styles.status}>
            Preparing
          </Text>
        )}
        {authTimedOut ? (
          <DeviceBigBtn onClick={() => void finishPairing()}>
            Try again
          </DeviceBigBtn>
        ) : null}
      </Box>
    </DeviceShell>
  );
}

function errorCodeFrom(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as { code?: unknown; response?: { data?: { code?: unknown; error?: { code?: unknown } } } };
    if (typeof record.code === 'string') return record.code;
    if (typeof record.response?.data?.code === 'string') return record.response.data.code;
    if (typeof record.response?.data?.error?.code === 'string') return record.response.data.error.code;
  }
  return fallback;
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 18 },
  status: { fontSize: 14, color: DV.ink2, lineHeight: 22, textAlign: 'center' },
  retryMessage: { fontSize: 13, color: '#9A4D00', lineHeight: 20, textAlign: 'center' },
});
