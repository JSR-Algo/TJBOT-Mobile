import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/design-system/primitives/Text';
import { sendDiagnosticReport } from '@/services/observability/diagnosticRelay';
import { useAutoResetState } from '@/hooks/useAutoResetState';

/**
 * DiagnosticOverlayButton — always-visible floating button on every screen that
 * captures the current page and sends it (log + screenshot) to Telegram on tap.
 *
 * Reuses the existing capture + relay pipeline (DiagnosticCaptureRoot →
 * sendDiagnosticReport → backend /dev/diagnostic-report → Telegram sendPhoto).
 *
 * Gated: shown only in dev/QA builds (`__DEV__`) or when
 * EXPO_PUBLIC_DIAGNOSTIC_OVERLAY === '1'. In a production store build it renders
 * nothing, so it never appears in front of a child. Named boundary: when the
 * flag is off, the button is absent (visible failure = no button, no surprise).
 */
type SendState = 'idle' | 'sending' | 'sent' | 'failed';

const OVERLAY_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY === '1';
const RESET_MS = 2500;

export function DiagnosticOverlayButton(): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const [state, setState] = useAutoResetState<SendState>('idle');

  if (!OVERLAY_ENABLED) {
    return null;
  }

  const onPress = async (): Promise<void> => {
    if (state === 'sending') {
      return;
    }
    setState('sending');
    const result = await sendDiagnosticReport({
      trigger: 'manual-overlay',
      includeScreenshot: true,
    });
    setState(result.ok && Boolean(result.sent) ? 'sent' : 'failed', RESET_MS);
  };

  const tint =
    state === 'sent' ? styles.sent : state === 'failed' ? styles.failed : styles.idle;
  const label = state === 'sent' ? 'SENT' : state === 'failed' ? 'FAIL' : 'DIAG';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Send diagnostic screenshot to Telegram"
      activeOpacity={0.8}
      style={[styles.btn, tint, { bottom: insets.bottom + 78 }]}
      onPress={() => {
        void onPress();
      }}
      testID="diagnostic-overlay-button"
    >
      {state === 'sending' ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text fontWeight="800" style={styles.label} i18n={false}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 12,
    width: 54,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    opacity: 0.82,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  idle: { backgroundColor: '#4f7cff' },
  sent: { backgroundColor: '#2e9e5b' },
  failed: { backgroundColor: '#d6443c' },
  label: { color: '#fff', fontSize: 11, letterSpacing: 0.4 },
});

export default DiagnosticOverlayButton;
