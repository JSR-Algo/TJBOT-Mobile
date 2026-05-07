import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Button, ErrorMessage, OnboardingHeader } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';
import { sendConsent } from '../../api/auth';

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
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!agreed) {
      setError('You must agree to the terms to continue.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // POST consent timestamp to backend before navigating. Without this
      // the user reaches AddChild and the create-child API rejects with
      // "COPPA parental consent is required before creating a child profile"
      // because the backend has no record of the parent ever agreeing.
      // Endpoint is `POST /v1/auth/consent` (auth.ts::sendConsent).
      //
      // DEV NOTE: COPPA Verifiable Parental Consent requires charging a
      // payment method (typical $0.50 fee) — backend validates a Stripe
      // token. We pass Stripe's published test token `tok_visa` here so
      // the dev/staging build can complete onboarding. Production MUST
      // replace this with a real Stripe Elements / @stripe/stripe-react-native
      // card-collection flow that tokenizes the parent's card client-side
      // and forwards the resulting one-time token to the backend.
      await sendConsent('tok_visa');
      navigation.navigate('HouseholdCreate');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setError(e?.message ?? 'Could not record consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <OnboardingHeader
        currentStep={2}
        totalSteps={7}
        hero={<Text style={styles.heroEmoji}>🔒</Text>}
        title="Parental consent"
        subtitle="Review how TBOT handles your child's data before you continue. This step keeps the setup compliant and clear."
      />

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
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="Agree to TBOT parental consent terms"
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
        label={submitting ? 'Recording consent…' : 'Agree & Continue'}
        onPress={handleContinue}
        disabled={!agreed || submitting}
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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  heroEmoji: {
    fontSize: 56,
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
    gap: theme.spacing.md,
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
