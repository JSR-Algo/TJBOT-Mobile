import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Home } from 'lucide-react-native';
import { useHousehold } from '../../contexts/HouseholdContext';
import { Button, Input, ErrorMessage } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';
import { normalizeError } from '../../utils/errors';

export function HouseholdCreateScreen({ navigation }: OnboardingScreenProps<'HouseholdCreate'>): React.JSX.Element {
  const { createHousehold } = useHousehold();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a household name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const household = await createHousehold(name.trim());
      navigation.navigate('AddChild', { householdId: household.id });
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string; config?: { baseURL?: string; url?: string } };
      console.warn('[HOUSEHOLD_CREATE_DEBUG]', JSON.stringify({
        msg: e?.message,
        code: e?.code,
        status: e?.response?.status,
        data: e?.response?.data,
        baseURL: e?.config?.baseURL,
        url: e?.config?.url,
      }));
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCircle}>
          <Home size={48} color={theme.colors.primary} strokeWidth={2} />
        </View>
        <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm }}>
          Step 1 of 3
        </Text>
        <Text style={styles.title}>Create your household</Text>
        <Text style={styles.subtitle}>
          Give your family a name — you can always change it later.
        </Text>

        <Input
          label="Household name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. The Smith Family"
          error={error ?? undefined}
        />

        {error && <ErrorMessage message={error} />}

        <Button
          label="Create Household"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  heroCircle: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});
