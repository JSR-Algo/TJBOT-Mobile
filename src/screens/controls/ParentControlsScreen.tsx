import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { controlsApi, ParentControls } from '../../api/controls';
import { normalizeError } from '../../utils/errors';
import theme from '../../theme';
import type { MainStackScreenProps } from '../../navigation/types';

export function ParentControlsScreen({ route }: MainStackScreenProps<'ParentControls'>): React.JSX.Element {
  const { deviceId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [dailyLimit, setDailyLimit] = useState('30');
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [storiesEnabled, setStoriesEnabled] = useState(true);
  const [gamesEnabled, setGamesEnabled] = useState(true);
  const [stemEnabled, setStemEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await controlsApi.getControls(deviceId);
        setDailyLimit(String(data.daily_limit_minutes));
        setQuietStart(data.quiet_hours_start);
        setQuietEnd(data.quiet_hours_end);
        setStoriesEnabled(data.content_categories_enabled.stories);
        setGamesEnabled(data.content_categories_enabled.games);
        setStemEnabled(data.content_categories_enabled.stem);
      } catch (err: unknown) {
        setError(normalizeError(err).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [deviceId]);

  const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!isValidTime(quietStart) || !isValidTime(quietEnd)) {
      setError('Quiet hours must be in HH:MM format (e.g. 21:00)');
      return;
    }

    setSaving(true);

    const parsed = parseInt(dailyLimit, 10);
    const limitMinutes = isNaN(parsed) ? 30 : Math.min(120, Math.max(5, parsed));

    const controls: Partial<ParentControls> = {
      daily_limit_minutes: limitMinutes,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      content_categories_enabled: {
        stories: storiesEnabled,
        games: gamesEnabled,
        stem: stemEnabled,
      },
    };

    try {
      await controlsApi.updateControls(deviceId, controls);
      setSuccessMessage('Settings saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(normalizeError(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Limit</Text>
        <Text style={styles.sectionDescription}>
          Maximum screen time per day
        </Text>
        <View style={styles.limitRow}>
          <TextInput
            style={styles.limitInput}
            value={dailyLimit}
            onChangeText={setDailyLimit}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel="Daily limit in minutes"
          />
          <Text style={styles.limitLabel}>minutes per day</Text>
        </View>
        <Text style={styles.limitHint}>Enter a value between 5 and 120</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <Text style={styles.sectionDescription}>
          Device will be inactive during these hours
        </Text>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>Start</Text>
            <TextInput
              style={styles.timeInput}
              value={quietStart}
              onChangeText={setQuietStart}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={5}
              accessibilityLabel="Quiet hours start time"
            />
          </View>
          <Text style={styles.timeSeparator}>to</Text>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>End</Text>
            <TextInput
              style={styles.timeInput}
              value={quietEnd}
              onChangeText={setQuietEnd}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={5}
              accessibilityLabel="Quiet hours end time"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Categories</Text>
        <Text style={styles.sectionDescription}>
          Choose which content types are available
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Stories</Text>
          <Switch
            value={storiesEnabled}
            onValueChange={setStoriesEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
            thumbColor={storiesEnabled ? theme.colors.primary : theme.colors.textSecondary}
            accessibilityLabel="Enable stories"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Games</Text>
          <Switch
            value={gamesEnabled}
            onValueChange={setGamesEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
            thumbColor={gamesEnabled ? theme.colors.primary : theme.colors.textSecondary}
            accessibilityLabel="Enable games"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>STEM</Text>
          <Switch
            value={stemEnabled}
            onValueChange={setStemEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
            thumbColor={stemEnabled ? theme.colors.primary : theme.colors.textSecondary}
            accessibilityLabel="Enable STEM"
          />
        </View>
      </View>

      {error && (
        <View style={styles.messageBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {successMessage && (
        <View style={[styles.messageBanner, styles.successBanner]}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save changes"
      >
        {saving ? (
          <ActivityIndicator size="small" color={theme.colors.surface} />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  limitInput: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 72,
    textAlign: 'center',
    backgroundColor: theme.colors.background,
  },
  limitLabel: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
  },
  limitHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  timeField: {
    flex: 1,
  },
  fieldLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  timeInput: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    textAlign: 'center',
  },
  timeSeparator: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    paddingBottom: theme.spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  switchLabel: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  messageBanner: {
    backgroundColor: theme.colors.error + '15',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  successBanner: {
    backgroundColor: theme.colors.success + '15',
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
  },
  successText: {
    ...theme.typography.body2,
    color: theme.colors.success,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...theme.typography.body1,
    color: theme.colors.surface,
    fontWeight: '700',
  },
});
