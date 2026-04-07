import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useHousehold } from '../../contexts/HouseholdContext';
import { Button, Input, ErrorMessage } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';
import { normalizeError } from '../../utils/errors';

export function AddChildScreen({ navigation }: OnboardingScreenProps<'AddChild'>): React.JSX.Element {
  const { addChild } = useHousehold();
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter a name';
    const year = parseInt(birthYear, 10);
    if (isNaN(year) || birthYear.length !== 4) return 'Enter a valid 4-digit birth year';
    if (year < 2000) return 'Birth year must be 2000 or later';
    const currentYear = new Date().getFullYear();
    if (year > currentYear) return 'Birth year cannot be in the future';
    const age = currentYear - year;
    if (age > 18) return 'Child must be 18 years old or younger';
    return null;
  };

  const handleAdd = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const year = parseInt(birthYear, 10);
      // API expects date_of_birth; we construct a representative date from year
      const addedChild = await addChild({ name: name.trim(), date_of_birth: `${year}-01-01` });
      Alert.alert('', `${name.trim()} is added!`, [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('InterestSetup', {
            childId: addedChild.id,
            householdId: addedChild.household_id,
          }),
        },
      ]);
    } catch (err: unknown) {
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>👶</Text>
        <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm }}>
          Step 2 of 3
        </Text>
        <Text style={styles.title}>Add a child</Text>
        <Text style={styles.subtitle}>
          We need their name and birth year to personalise the experience.
        </Text>

        <Input
          label="Child's name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Emma"
        />

        <Input
          label="Birth year"
          value={birthYear}
          onChangeText={setBirthYear}
          placeholder="e.g. 2018"
          keyboardType="number-pad"
          maxLength={4}
        />

        {error && <ErrorMessage message={error} />}

        <Button
          label="Add Child"
          onPress={handleAdd}
          loading={loading}
          disabled={loading}
        />

        <Button
          label="Skip for now"
          onPress={() => navigation.navigate('DeviceSetupIntro')}
          variant="ghost"
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
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
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
