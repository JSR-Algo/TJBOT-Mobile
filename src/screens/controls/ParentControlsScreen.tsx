import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Minus, MoonStar, Plus } from 'lucide-react-native';
import { controlsApi, ParentControls } from '../../api/controls';
import { Button, Card, ErrorMessage } from '../../components';
import theme from '../../theme';
import { normalizeError } from '../../utils/errors';
import type { MainStackScreenProps } from '../../navigation/types';

interface ControlsFormState {
  dailyLimit: number;
  quietStart: string;
  quietEnd: string;
  storiesEnabled: boolean;
  gamesEnabled: boolean;
  stemEnabled: boolean;
}

interface QuietHoursPreset {
  label: string;
  start: string;
  end: string;
  note: string;
}

const LIMIT_PRESETS = [15, 30, 45, 60, 90, 120] as const;
const QUIET_HOURS_PRESETS: QuietHoursPreset[] = [
  { label: 'School night', start: '21:00', end: '07:00', note: '10 quiet hours' },
  { label: 'Early bedtime', start: '20:00', end: '07:00', note: '11 quiet hours' },
  { label: 'Weekend', start: '21:30', end: '08:00', note: '10.5 quiet hours' },
];
const MIN_DAILY_LIMIT = 5;
const MAX_DAILY_LIMIT = 120;
const DAILY_LIMIT_STEP = 5;

const DEFAULT_FORM: ControlsFormState = {
  dailyLimit: 30,
  quietStart: '21:00',
  quietEnd: '07:00',
  storiesEnabled: true,
  gamesEnabled: true,
  stemEnabled: true,
};

function buildFormState(data: ParentControls): ControlsFormState {
  return {
    dailyLimit: data.daily_limit_minutes,
    quietStart: data.quiet_hours_start,
    quietEnd: data.quiet_hours_end,
    storiesEnabled: data.content_categories_enabled.stories,
    gamesEnabled: data.content_categories_enabled.games,
    stemEnabled: data.content_categories_enabled.stem,
  };
}

function serializeFormState(form: ControlsFormState): Partial<ParentControls> {
  return {
    daily_limit_minutes: form.dailyLimit,
    quiet_hours_start: form.quietStart,
    quiet_hours_end: form.quietEnd,
    content_categories_enabled: {
      stories: form.storiesEnabled,
      games: form.gamesEnabled,
      stem: form.stemEnabled,
    },
  };
}

function areFormsEqual(a: ControlsFormState | null, b: ControlsFormState | null): boolean {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function formatQuietHoursSummary(start: string, end: string): string {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === null || endMinutes === null) {
    return 'Enter quiet hours in HH:MM format.';
  }

  const duration = endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : 24 * 60 - startMinutes + endMinutes;

  const hours = duration / 60;
  const hoursLabel = Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
  return `${start} to ${end} • ${hoursLabel} hours protected`;
}

function formatDailyLimitSummary(value: number): string {
  if (value <= 15) return 'Short check-in window';
  if (value <= 45) return 'Balanced daily rhythm';
  if (value <= 90) return 'Longer exploration window';
  return 'Extended play day';
}

function clampDailyLimit(value: number): number {
  return Math.min(MAX_DAILY_LIMIT, Math.max(MIN_DAILY_LIMIT, value));
}

function limitStepLabel(value: number): string {
  return `${value} min`;
}

function ContentToggleRow({
  label,
  description,
  value,
  onChange,
  accessibilityLabel,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}): React.JSX.Element {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <View style={styles.toggleTitleRow}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <View style={[styles.toggleBadge, value ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
            <Text style={[styles.toggleBadgeText, value ? styles.toggleBadgeTextOn : styles.toggleBadgeTextOff]}>
              {value ? 'On' : 'Off'}
            </Text>
          </View>
        </View>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
        thumbColor={value ? theme.colors.primary : theme.colors.textSecondary}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

export function ParentControlsScreen({ route }: MainStackScreenProps<'ParentControls'>): React.JSX.Element {
  const { deviceId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ControlsFormState>(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState<ControlsFormState | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await controlsApi.getControls(deviceId);
        if (!isMounted) return;
        const nextForm = buildFormState(data);
        setForm(nextForm);
        setInitialForm(nextForm);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(normalizeError(err).message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  const isDirty = !initialForm || !areFormsEqual(form, initialForm);

  const updateForm = (patch: Partial<ControlsFormState>) => {
    setError(null);
    setSuccessMessage(null);
    setForm((current) => ({ ...current, ...patch }));
  };

  const adjustDailyLimit = (delta: number) => {
    updateForm({ dailyLimit: clampDailyLimit(form.dailyLimit + delta) });
  };

  const applyQuietHoursPreset = (preset: QuietHoursPreset) => {
    updateForm({ quietStart: preset.start, quietEnd: preset.end });
  };

  const handleReset = () => {
    if (!initialForm) return;
    setError(null);
    setSuccessMessage(null);
    setForm(initialForm);
  };

  const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!isValidTime(form.quietStart) || !isValidTime(form.quietEnd)) {
      setError('Quiet hours must use HH:MM format, for example 21:00.');
      return;
    }

    if (form.quietStart === form.quietEnd) {
      setError('Quiet hours need a start and end time that are different.');
      return;
    }

    setSaving(true);

    try {
      const payload = serializeFormState(form);
      await controlsApi.updateControls(deviceId, payload);
      setInitialForm(form);
      setSuccessMessage('Controls updated. TBOT will use these guardrails on the next sync.');
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <MoonStar size={18} color={theme.colors.primary} strokeWidth={2.3} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>For this device</Text>
            <Text style={styles.heroTitle}>Tonight&apos;s guardrails</Text>
            <Text style={styles.heroSubtitle}>
              {isDirty ? 'You have unsaved changes.' : 'Everything below is synced.'}
            </Text>
          </View>
        </View>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Daily limit</Text>
            <Text style={styles.heroPillValue}>{form.dailyLimit} min</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Quiet hours</Text>
            <Text style={styles.heroPillValue}>{form.quietStart} - {form.quietEnd}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Daily limit</Text>
        <Text style={styles.sectionDescription}>
          Set a clear daily play window so parents can tune the device in seconds.
        </Text>
        <View style={styles.limitHero}>
          <Text style={styles.limitValue}>{form.dailyLimit}</Text>
          <Text style={styles.limitValueUnit}>minutes per day</Text>
          <Text style={styles.limitSummary}>{formatDailyLimitSummary(form.dailyLimit)}</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => adjustDailyLimit(-DAILY_LIMIT_STEP)}
            accessibilityRole="button"
            accessibilityLabel="Reduce daily limit by five minutes"
          >
            <Minus size={18} color={theme.colors.primary} strokeWidth={2.3} />
            <Text style={styles.stepperButtonText}>-5 min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => adjustDailyLimit(DAILY_LIMIT_STEP)}
            accessibilityRole="button"
            accessibilityLabel="Increase daily limit by five minutes"
          >
            <Plus size={18} color={theme.colors.primary} strokeWidth={2.3} />
            <Text style={styles.stepperButtonText}>+5 min</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipRow}>
          {LIMIT_PRESETS.map((preset) => {
            const active = form.dailyLimit === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => updateForm({ dailyLimit: preset })}
                accessibilityRole="button"
                accessibilityLabel={`Set daily limit to ${preset} minutes`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{limitStepLabel(preset)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quiet hours</Text>
        <Text style={styles.sectionDescription}>
          Keep late-night sessions offline without forcing parents through extra setup.
        </Text>
        <View style={styles.quietHoursSummary}>
          <Text style={styles.quietHoursSummaryText}>{formatQuietHoursSummary(form.quietStart, form.quietEnd)}</Text>
        </View>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>Start</Text>
            <TextInput
              style={styles.timeInput}
              value={form.quietStart}
              onChangeText={(quietStart) => updateForm({ quietStart })}
              placeholder="21:00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              accessibilityLabel="Quiet hours start time"
            />
          </View>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>End</Text>
            <TextInput
              style={styles.timeInput}
              value={form.quietEnd}
              onChangeText={(quietEnd) => updateForm({ quietEnd })}
              placeholder="07:00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              accessibilityLabel="Quiet hours end time"
            />
          </View>
        </View>
        <View style={styles.chipRow}>
          {QUIET_HOURS_PRESETS.map((preset) => {
            const active = form.quietStart === preset.start && form.quietEnd === preset.end;
            return (
              <TouchableOpacity
                key={preset.label}
                style={[styles.presetCard, active && styles.presetCardActive]}
                onPress={() => applyQuietHoursPreset(preset)}
                accessibilityRole="button"
                accessibilityLabel={`Apply ${preset.label.toLowerCase()} quiet hours preset`}
              >
                <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{preset.label}</Text>
                <Text style={[styles.presetValue, active && styles.presetValueActive]}>
                  {preset.start} - {preset.end}
                </Text>
                <Text style={[styles.presetNote, active && styles.presetNoteActive]}>{preset.note}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Content categories</Text>
        <Text style={styles.sectionDescription}>
          Tailor the tone of play without hiding what each switch actually changes.
        </Text>
        <ContentToggleRow
          label="Stories"
          description="Narratives, bedtime stories, and guided adventures."
          value={form.storiesEnabled}
          onChange={(storiesEnabled) => updateForm({ storiesEnabled })}
          accessibilityLabel="Enable stories"
        />
        <View style={styles.divider} />
        <ContentToggleRow
          label="Games"
          description="Playful prompts, quick challenges, and interactive mini-games."
          value={form.gamesEnabled}
          onChange={(gamesEnabled) => updateForm({ gamesEnabled })}
          accessibilityLabel="Enable games"
        />
        <View style={styles.divider} />
        <ContentToggleRow
          label="STEM"
          description="Science, numbers, logic, and curiosity-driven prompts."
          value={form.stemEnabled}
          onChange={(stemEnabled) => updateForm({ stemEnabled })}
          accessibilityLabel="Enable STEM"
        />
      </Card>

      {error ? <ErrorMessage message={error} /> : null}
      {successMessage ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Reset changes"
          variant="secondary"
          onPress={handleReset}
          disabled={!isDirty || saving}
          accessibilityLabel="Reset parental controls changes"
          style={styles.actionButton}
        />
        <Button
          label={saving ? 'Saving…' : isDirty ? 'Save changes' : 'All changes saved'}
          onPress={handleSave}
          loading={saving}
          disabled={!isDirty}
          accessibilityLabel="Save changes"
          style={styles.actionButton}
        />
      </View>
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
    gap: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  heroCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: '#F5F7FF',
    borderWidth: 1,
    borderColor: '#DDE3FF',
  },
  heroHeader: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  heroTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  heroSubtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  heroPills: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  heroPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  heroPillLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  heroPillValue: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  sectionCard: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  limitHero: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  limitValue: {
    ...theme.typography.h1,
    color: theme.colors.primary,
  },
  limitValueUnit: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  limitSummary: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  stepperButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
  },
  stepperButtonText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.divider,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  quietHoursSummary: {
    backgroundColor: '#FFF7ED',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  quietHoursSummaryText: {
    ...theme.typography.body2,
    color: '#9A3412',
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  timeField: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
  },
  presetCard: {
    minWidth: 108,
    flexGrow: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.divider,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetCardActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary + '30',
  },
  presetLabel: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  presetLabelActive: {
    color: theme.colors.primary,
  },
  presetValue: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  presetValueActive: {
    color: theme.colors.primaryDark,
  },
  presetNote: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  presetNoteActive: {
    color: theme.colors.primaryDark,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  toggleLabel: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  toggleDescription: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  toggleBadge: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  toggleBadgeOn: {
    backgroundColor: theme.colors.primary + '15',
  },
  toggleBadgeOff: {
    backgroundColor: theme.colors.border,
  },
  toggleBadgeText: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  toggleBadgeTextOn: {
    color: theme.colors.primary,
  },
  toggleBadgeTextOff: {
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  successBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  successText: {
    ...theme.typography.body2,
    color: '#166534',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
