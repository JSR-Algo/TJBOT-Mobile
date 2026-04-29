import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as notificationsApi from '../../api/notifications';
import type { NotificationPreferences, NotificationHistoryItem } from '../../api/notifications';
import { Card, LoadingSpinner, ErrorMessage } from '../../components';
import theme from '../../theme';
import type { MainStackScreenProps } from '../../navigation/types';
import { normalizeError } from '../../utils/errors';

type Frequency = 'daily' | 'weekly' | 'never';

export function NotificationPrefsScreen(
  _props: MainStackScreenProps<'NotificationPrefs'>,
): React.JSX.Element {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  // Local edited state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [safetyEnabled, setSafetyEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([
        notificationsApi.getPreferences().catch(() => null),
        notificationsApi.getHistory(5).catch(() => [] as typeof history),
      ]);
      if (p) {
        setPrefs(p);
        setEmailEnabled(p.email_digest_enabled);
        setFrequency(p.email_digest_frequency);
        setSafetyEnabled(p.safety_alerts_enabled);
      }
      setHistory(h ?? []);
    } catch (err: unknown) {
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessBanner(false);
    try {
      await notificationsApi.updatePreferences({
        email_digest_enabled: emailEnabled,
        email_digest_frequency: frequency,
        safety_alerts_enabled: safetyEnabled,
      });
      setSuccessBanner(true);
      // Auto-clear notification-prefs success banner after 3s.
      // Presentation-only — does not affect the voice FSM.
      // eslint-disable-next-line tbot-voice/no-voice-timing-in-shared
      setTimeout(() => setSuccessBanner(false), 3000);
    } catch (err: unknown) {
      Alert.alert('Error', normalizeError(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner />
      </View>
    );
  }

  // Don't block render on API error — show defaults with inline error banner instead

  const FREQUENCY_OPTIONS: Frequency[] = ['daily', 'weekly', 'never'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notification Settings</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Could not load preferences — showing defaults</Text>
        </View>
      )}

      {successBanner && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>Preferences saved</Text>
        </View>
      )}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Email Notifications</Text>

        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={styles.rowTitle}>Email session summaries</Text>
            <Text style={styles.rowSubtitle}>Receive a summary after each session</Text>
          </View>
          <Switch
            value={emailEnabled}
            onValueChange={setEmailEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
            thumbColor={emailEnabled ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>

        {emailEnabled && (
          <View style={styles.frequencySection}>
            <Text style={styles.frequencyLabel}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.freqButton, frequency === opt && styles.freqButtonActive]}
                  onPress={() => setFrequency(opt)}
                >
                  <Text style={[styles.freqButtonText, frequency === opt && styles.freqButtonTextActive]}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.rowLabel}>
            <Text style={styles.rowTitle}>Safety alerts</Text>
            <Text style={styles.rowSubtitle}>Immediate alert on safety filter trigger</Text>
          </View>
          <Switch
            value={safetyEnabled}
            onValueChange={setSafetyEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
            thumbColor={safetyEnabled ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>
      </Card>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save preferences'}</Text>
      </TouchableOpacity>

      {/* Notification history */}
      <Text style={styles.historyTitle}>Recent Notifications</Text>
      {history.length === 0 ? (
        <Text style={styles.emptyHistory}>No notifications sent yet</Text>
      ) : (
        history.map((item) => (
          <Card key={item.id} style={styles.historyItem}>
            <View style={styles.historyRow}>
              <Text style={styles.historyType}>{item.type.replace(/_/g, ' ')}</Text>
              <View style={[styles.statusBadge, item.status === 'sent' ? styles.statusSent : item.status === 'failed' ? styles.statusFailed : styles.statusSkipped]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.historyDate}>
              {new Date(item.sent_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  title: { ...theme.typography.h2, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  sectionTitle: { ...theme.typography.caption, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, marginTop: theme.spacing.sm },
  rowLabel: { flex: 1, marginRight: theme.spacing.md },
  rowTitle: { ...theme.typography.body1, color: theme.colors.textPrimary },
  rowSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  frequencySection: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  frequencyLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  frequencyRow: { flexDirection: 'row', gap: theme.spacing.sm },
  freqButton: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  freqButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  freqButtonText: { ...theme.typography.body2, color: theme.colors.textSecondary },
  freqButtonTextActive: { color: '#FFFFFF', fontWeight: '600' },
  saveButton: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: theme.spacing.md, alignItems: 'center', marginBottom: theme.spacing.xl },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...theme.typography.button, color: '#FFFFFF' },
  errorBanner: { backgroundColor: theme.colors.error + '15', borderRadius: theme.radius.sm, padding: theme.spacing.sm, marginBottom: theme.spacing.md, alignItems: 'center' },
  errorBannerText: { ...theme.typography.body2, color: theme.colors.error },
  successBanner: { backgroundColor: theme.colors.success + '20', borderRadius: theme.radius.sm, padding: theme.spacing.sm, marginBottom: theme.spacing.md, alignItems: 'center' },
  successText: { ...theme.typography.body2, color: theme.colors.success, fontWeight: '600' },
  historyTitle: { ...theme.typography.h3, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  emptyHistory: { ...theme.typography.body2, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: theme.spacing.lg },
  historyItem: { marginBottom: theme.spacing.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  historyType: { ...theme.typography.body2, color: theme.colors.textPrimary, textTransform: 'capitalize' },
  historyDate: { ...theme.typography.caption, color: theme.colors.textSecondary },
  statusBadge: { borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.xs, paddingVertical: 2 },
  statusSent: { backgroundColor: theme.colors.success + '20' },
  statusFailed: { backgroundColor: theme.colors.error + '20' },
  statusSkipped: { backgroundColor: theme.colors.border },
  statusText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textPrimary },
});
