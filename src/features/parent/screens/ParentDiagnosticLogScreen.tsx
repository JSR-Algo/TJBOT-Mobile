import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import {
  clearDiagnosticLog,
  formatDiagnosticExport,
  getDiagnosticEntries,
  getDiagnosticSessionHeader,
  subscribeDiagnosticLog,
} from '@/services/observability/diagnosticLog';
import { sendDiagnosticReport } from '@/services/observability/diagnosticRelay';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentDiagnosticLogScreen'>;

export default function ParentDiagnosticLogScreen({ navigation }: Props): React.JSX.Element {
  useParentGateGuard(navigation, ROUTES.ParentDiagnosticLogScreen);
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const [sending, setSending] = React.useState(false);
  const entries = getDiagnosticEntries();
  const header = getDiagnosticSessionHeader();

  React.useEffect(() => subscribeDiagnosticLog(bump), []);

  const handleSendTelegram = React.useCallback(async () => {
    if (sending) return;
    setSending(true);
    try {
      const result = await sendDiagnosticReport({
        trigger: 'parent_manual',
        includeScreenshot: true,
      });
      if (result.ok && result.sent !== false) {
        Alert.alert('Diagnostic sent', 'Log and screenshot were relayed to Telegram via the VPS.');
        return;
      }
      Alert.alert(
        'Could not send diagnostic',
        result.error ?? result.skipped ?? 'The VPS relay did not accept this report.',
      );
    } catch {
      Alert.alert('Could not send diagnostic', 'Check network and try again.');
    } finally {
      setSending(false);
    }
  }, [sending]);

  const handleClear = React.useCallback(() => {
    Alert.alert(
      'Clear diagnostic log?',
      'This removes captured problems from this session. Send to Telegram first if you need them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearDiagnosticLog(),
        },
      ],
    );
  }, []);

  return (
    <ParentScroll title="Diagnostic log" onBack={() => navigation.navigate(ROUTES.ParentSettingsScreen)}>
      <Box style={styles.metaCard}>
        <Text fontWeight="700" style={styles.metaTitle}>Session</Text>
        {Object.entries(header).map(([key, value]) => (
          <Text key={key} style={styles.metaLine} i18n={false}>
            {key}: {value}
          </Text>
        ))}
        <Text style={styles.metaLine} i18n={false}>
          entries: {entries.length}
        </Text>
      </Box>

      <Box style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send diagnostic to Telegram"
          disabled={sending}
          onPress={() => { void handleSendTelegram(); }}
          style={[styles.primaryBtn, sending && styles.primaryBtnDisabled]}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text fontWeight="700" style={styles.primaryBtnText} i18n={false}>Send to Telegram</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={handleClear} style={styles.secondaryBtn}>
          <Text fontWeight="600" style={styles.secondaryBtnText} i18n={false}>Clear</Text>
        </TouchableOpacity>
      </Box>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {entries.length === 0 ? (
          <Text style={styles.empty} i18n={false}>
            No problems captured yet. Open a lesson or talk to Robot — errors will appear here and auto-send to Telegram.
          </Text>
        ) : (
          [...entries].reverse().map((entry) => (
            <Box key={entry.id} style={styles.row}>
              <Text style={styles.rowMeta} i18n={false}>
                {entry.at} · {entry.severity} · {entry.category}.{entry.event}
              </Text>
              <Text style={styles.rowMessage} i18n={false}>{entry.message}</Text>
              {entry.detail ? (
                <Text style={styles.rowDetail} i18n={false}>
                  {JSON.stringify(entry.detail)}
                </Text>
              ) : null}
            </Box>
          ))
        )}
      </ScrollView>
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PA.hair,
  },
  metaTitle: { fontSize: 15, color: PA.ink, marginBottom: 6 },
  metaLine: { fontSize: 12, color: 'rgba(0,0,0,0.55)', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: PA.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 15 },
  secondaryBtn: {
    paddingHorizontal: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PA.hair,
    backgroundColor: '#fff',
  },
  secondaryBtnText: { color: PA.ink, fontSize: 15 },
  list: { maxHeight: 420 },
  listContent: { paddingBottom: 24, gap: 8 },
  empty: { fontSize: 14, color: 'rgba(0,0,0,0.55)', lineHeight: 20 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: PA.hair,
  },
  rowMeta: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginBottom: 4 },
  rowMessage: { fontSize: 13, color: PA.ink, lineHeight: 18, fontWeight: '600' },
  rowDetail: { fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 6, lineHeight: 16 },
});