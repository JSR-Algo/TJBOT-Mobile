import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Button, ErrorMessage } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';

const CONSENT_ITEMS = [
  "TBOT collects limited data about your child's learning interactions to personalise their experience.",
  'No personal information (name, address, photo) is shared with third parties.',
  'You can request deletion of all data at any time from your account settings.',
  'Audio recordings are deleted within 30 days.',
  'You must be the parent or legal guardian of the child using TBOT.',
];

export function CoppaConsentScreen({ navigation }: OnboardingScreenProps<'CoppaConsent'>): React.JSX.Element {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!agreed) {
      setError('You must agree to the terms to continue.');
      return;
    }
    setError(null);
    navigation.navigate('HouseholdCreate');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.emoji}>🔒</Text>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm }}>
        Step 1 of 5
      </Text>
      <Text style={styles.title}>Parental Consent</Text>
      <Text style={styles.subtitle}>
        TBOT is designed for children under 13. As a parent or guardian, please review and agree to our COPPA-compliant data practices.
      </Text>

      <View style={styles.consentBox}>
        {CONSENT_ITEMS.map((item, i) => (
          <View key={i} style={styles.consentItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.consentText}>{item}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => {
          setAgreed((v) => !v);
          setError(null);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>
          I am the parent or guardian and I agree to the above terms.
        </Text>
      </TouchableOpacity>

      {error && <ErrorMessage message={error} />}

      <Button
        label="Agree & Continue"
        onPress={handleContinue}
        disabled={!agreed}
      />
      <Button
        label="View Full Privacy Policy"
        variant="ghost"
        onPress={() => Linking.openURL('https://tbot.ai/privacy')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
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
    marginBottom: theme.spacing.lg,
  },
  consentBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  bullet: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  consentText: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    flex: 1,
  },
});
