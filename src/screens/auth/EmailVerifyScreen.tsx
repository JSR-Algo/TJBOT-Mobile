import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, ErrorMessage } from '../../components';
import { colors, spacing, typography } from '../../theme';
import * as authApi from '../../api/auth';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailVerify'>;

export default function EmailVerifyScreen({ route, navigation }: Props): React.JSX.Element {
  const email = route.params?.email ?? '';
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
    } catch {
      setError('Could not resend email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>
          We sent a verification email to your address. Click the link in the email to activate your account.
        </Text>

        {error ? <ErrorMessage message={error} /> : null}

        {resent ? (
          <Text style={styles.resentText}>✓ Email resent successfully</Text>
        ) : (
          <Button label="Resend Email" onPress={handleResend} variant="secondary" loading={loading} />
        )}

        <TouchableOpacity style={styles.skipLink} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.skipText}>I'll verify later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 72, marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body1, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  resentText: { ...typography.body1, color: colors.success },
  skipLink: { marginTop: spacing.lg },
  skipText: { ...typography.body2, color: colors.textMuted },
});
