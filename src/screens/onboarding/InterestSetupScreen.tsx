import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as learningApi from '../../services/api/learning';
import { Button, ErrorMessage, OnboardingHeader } from '../../components';
import theme from '@/design-system/tokens/legacy-semantic';
import type { OnboardingScreenProps } from '../../navigation/types';
import { normalizeError } from '../../utils/errors';

const INTERESTS = [
  { key: 'animals', label: 'Animals', emoji: '🦁' },
  { key: 'cars', label: 'Cars', emoji: '🚗' },
  { key: 'princess', label: 'Princess', emoji: '👸' },
  { key: 'space', label: 'Space', emoji: '🚀' },
  { key: 'dinosaurs', label: 'Dinosaurs', emoji: '🦕' },
  { key: 'music', label: 'Music', emoji: '🎵' },
  { key: 'cooking', label: 'Cooking', emoji: '🍳' },
  { key: 'sports', label: 'Sports', emoji: '⚽' },
  { key: 'art', label: 'Art', emoji: '🎨' },
];

export function InterestSetupScreen({ route, navigation }: OnboardingScreenProps<'InterestSetup'>): React.JSX.Element {
  const { childId } = route.params;
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await learningApi.updateChildProfile(childId, { interests: selected });
      navigation.navigate('DeviceSetupIntro');
    } catch (err: unknown) {
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <OnboardingHeader
        currentStep={5}
        totalSteps={7}
        hero={<Text style={styles.heroEmoji}>🌟</Text>}
        title="What does your child love?"
        subtitle="Choose a few interests so TBOT starts with topics that already feel familiar and fun."
      />

      <View style={styles.grid}>
        {INTERESTS.map((item) => {
          const isSelected = selected.includes(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleInterest(item.key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}${isSelected ? ', selected' : ''}`}
            >
              <Text style={styles.chipEmoji}>{item.emoji}</Text>
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <ErrorMessage message={error} />}

      <Button
        label={selected.length === 0 ? 'Skip for now' : `Save ${selected.length} interest${selected.length > 1 ? 's' : ''}`}
        onPress={selected.length === 0 ? () => navigation.navigate('DeviceSetupIntro') : handleSave}
        loading={loading}
        disabled={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  heroEmoji: {
    fontSize: 56,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.xs,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
