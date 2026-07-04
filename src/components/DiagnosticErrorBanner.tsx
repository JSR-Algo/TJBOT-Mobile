import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { navigationRef } from '@/navigation/AppNavigator';
import {
  clearPendingDiagnosticError,
  getPendingDiagnosticError,
  subscribePendingDiagnosticError,
} from '@/services/observability/diagnosticErrorState';
import { sendPendingDiagnosticManually } from '@/services/observability/installDiagnosticErrorRelay';

export function DiagnosticErrorBanner(): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const pending = getPendingDiagnosticError();

  React.useEffect(() => subscribePendingDiagnosticError(bump), []);

  if (!pending) return null;

  const { entry, relayStatus, relayError } = pending;
  const sending = relayStatus === 'sending';

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + 12 }]}
      pointerEvents="box-none"
      testID="diagnostic-error-banner"
    >
      <View style={styles.card}>
        <Text fontWeight="700" style={styles.title} i18n={false}>
          Something went wrong
        </Text>
        <Text style={styles.message} i18n={false} numberOfLines={2}>
          {entry.message}
        </Text>
        {relayStatus === 'sent' ? (
          <Text style={styles.statusOk} i18n={false}>Diagnostic sent to Telegram.</Text>
        ) : null}
        {relayStatus === 'failed' ? (
          <Text style={styles.statusFail} i18n={false}>
            Could not send diagnostic{relayError ? `: ${relayError}` : ''}.
          </Text>
        ) : null}
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send diagnostic to Telegram"
            style={[styles.primaryBtn, sending && styles.primaryBtnDisabled]}
            disabled={sending}
            onPress={() => { void sendPendingDiagnosticManually(); }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text fontWeight="700" style={styles.primaryBtnText} i18n={false}>
                Send diagnostic
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open diagnostic log"
            style={styles.secondaryBtn}
            onPress={() => {
              if (navigationRef.isReady()) {
                navigationRef.navigate(ROUTES.ParentDiagnosticLogScreen);
              }
            }}
          >
            <Text fontWeight="600" style={styles.secondaryBtnText} i18n={false}>View log</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Dismiss diagnostic banner"
            style={styles.dismissBtn}
            onPress={clearPendingDiagnosticError}
          >
            <Text style={styles.dismissText} i18n={false}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#1f1f24',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: { color: '#fff', fontSize: 15, marginBottom: 4 },
  message: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18 },
  statusOk: { color: '#7dcea0', fontSize: 12, marginTop: 6 },
  statusFail: { color: '#f5b7b1', fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#4f7cff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 14 },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryBtnText: { color: '#fff', fontSize: 13 },
  dismissBtn: { padding: 8 },
  dismissText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
});