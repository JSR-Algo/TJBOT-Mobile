import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Button, ErrorMessage } from '../../components';
import { colors, spacing, typography, radius } from '../../theme';
import * as authApi from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { pendingCredentials } from '../../auth/pendingCredentials';

export default function CoppaScreen(): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleConsent = async () => {
    setError('');
    setLoading(true);
    try {
      const { email, password } = pendingCredentials.get();
      if (!email || !password) {
        setError('Session expired. Please sign up again.');
        return;
      }
      // Must login first to get a token, then call /auth/consent with that token
      await login(email, password);
      await authApi.sendConsent();
      pendingCredentials.clear();
      // isAuthenticated becomes true → RootNavigator redirects to OnboardingStack
    } catch {
      setError('Could not record consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Parent Consent Required</Text>
        <Text style={styles.subtitle}>
          TBOT collects limited data about your child's interactions to provide AI-powered responses.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What we collect</Text>
          {['Voice recordings (processed, not stored)', 'Conversation transcripts', 'Session metadata (timing, duration)'].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How we use it</Text>
          {['AI response generation only', 'Never sold to third parties', 'Deleted after processing'].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={styles.bullet}>✓</Text>
              <Text style={[styles.bulletText, styles.green]}>{item}</Text>
            </View>
          ))}
        </View>

        {error ? <ErrorMessage message={error} /> : null}

        <Button
          label="I Consent as Parent / Guardian"
          onPress={handleConsent}
          loading={loading}
          style={styles.consentBtn}
        />

        <Text style={styles.legal}>
          By tapping above, you confirm you are the parent or legal guardian and consent to data collection as described.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg },
  emoji: { fontSize: 48, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body1, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { ...typography.body1, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  bulletRow: { flexDirection: 'row', marginBottom: spacing.xs },
  bullet: { color: colors.textSecondary, marginRight: spacing.sm, width: 12 },
  bulletText: { ...typography.body2, color: colors.textSecondary, flex: 1 },
  green: { color: colors.success },
  consentBtn: { marginTop: spacing.lg },
  legal: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
