import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useHousehold } from '../../contexts/HouseholdContext';
import { Button, Input, ErrorMessage, OnboardingHeader } from '../../components';
import { useToast } from '../../components/Toast';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';
import { normalizeError } from '../../utils/errors';

export function AddChildScreen({ navigation }: OnboardingScreenProps<'AddChild'>): React.JSX.Element {
  const { addChild } = useHousehold();
  const { show: showToast } = useToast();
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
      // Was: native Alert.alert dialog with a "Continue" button — looked
      // unbranded and, more importantly, the user could only proceed via the
      // alert callback, during which the navigator's parent stack could
      // unmount mid-flow (the "NAVIGATE InterestSetup not handled" bug).
      // Direct navigation in the same microtask as the API success keeps the
      // navigator state stable, and a non-blocking toast confirms the action.
      showToast({ severity: 'info', text: `${name.trim()} đã được thêm!` });
      navigation.navigate('InterestSetup', {
        childId: addedChild.id,
        householdId: addedChild.household_id,
      });
    } catch (err: unknown) {
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <OnboardingHeader
          currentStep={4}
          totalSteps={7}
          hero={<Text style={styles.heroEmoji}>👶</Text>}
          title="Add a child"
          subtitle="We only ask for the basics we need to personalise the experience and keep the account organised."
        />

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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  heroEmoji: {
    fontSize: 56,
  },
});
