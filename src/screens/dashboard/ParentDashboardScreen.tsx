import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../../components';
import { useHousehold } from '../../contexts/HouseholdContext';
import * as learningApi from '../../services/api/learning';
import theme from '../../theme';

type ParentDashboardNavigation = {
  navigate: (screen: string, params?: Record<string, string>) => void;
};

interface ParentDashboardScreenProps {
  navigation: ParentDashboardNavigation;
  route?: unknown;
}

function toMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Progress unavailable';
}

export function ParentDashboardScreen({
  navigation,
}: ParentDashboardScreenProps): React.JSX.Element {
  const { children } = useHousehold();
  const activeChild = children[0] ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProgress(): Promise<void> {
      if (!activeChild) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          learningApi.getKPIs(activeChild.id),
          learningApi.getPronunciationTrend(activeChild.id),
        ]);
      } catch (progressError) {
        if (mounted) {
          setError(toMessage(progressError));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProgress();
    return () => {
      mounted = false;
    };
  }, [activeChild]);

  const childId = activeChild?.id;
  const childName = activeChild?.name ?? 'your child';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Progress</Text>
      <Text style={styles.title}>{childName}'s learning</Text>
      <Text style={styles.subtitle}>Open today's lesson or preview the six-month lesson demo.</Text>

      {loading ? (
        <View style={styles.statusRow}>
          <LoadingSpinner />
          <Text style={styles.statusText}>Loading progress</Text>
        </View>
      ) : null}

      {error ? <ErrorMessage message={error} /> : null}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Lesson entry</Text>
        <Text style={styles.cardBody}>Keep practice available even when progress data is delayed.</Text>
        <Button
          label="View today's lesson"
          onPress={() => {
            if (childId) {
              navigation.navigate('LessonPlanner', { childId });
            } else {
              navigation.navigate('LessonPlanner');
            }
          }}
          style={styles.primaryButton}
        />
        <Button
          label="Open lesson demo"
          variant="secondary"
          onPress={() => navigation.navigate('LessonDemo')}
          style={styles.secondaryButton}
        />
      </Card>
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
    gap: theme.spacing.md,
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  card: {
    gap: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  cardBody: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  primaryButton: {
    marginTop: theme.spacing.md,
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
  },
});

export default ParentDashboardScreen;
