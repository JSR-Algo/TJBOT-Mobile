import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, ErrorMessage } from '../../components';
import { colors, spacing, typography } from '../../theme';
import * as authApi from '../../api/auth';
import { AuthStackParamList } from '../../navigation/types';
import { useToast } from '../../components/Toast';

// Error pattern: ErrorMessage for field-scoped validation errors.
// useToast for network/transport/5xx failures (transient).

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { show: showToast } = useToast();

  const handleSend = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e?.status && e.status >= 500) {
        showToast({ severity: 'error', text: 'Server error. Please try again.' });
      } else {
        setError('Could not send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <Text style={styles.successEmoji}>📬</Text>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.subtitle}>We sent a reset link to {email}</Text>
          <Button label="Back to Login" onPress={() => navigation.navigate('Login')} style={styles.backBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send a reset link.</Text>

        {error ? <ErrorMessage message={error} /> : null}

        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="your@email.com" />
        <Button label="Send Reset Link" onPress={handleSend} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  centerContainer: { flex: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.xl },
  successEmoji: { fontSize: 64, marginBottom: spacing.lg },
  backBtn: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
