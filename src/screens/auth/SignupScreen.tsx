import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, ErrorMessage } from '../../components';
import { colors, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { pendingCredentials } from '../../auth/pendingCredentials';
import { useToast } from '../../components/Toast';

// Error pattern: ErrorMessage for field-scoped validation errors.
// useToast for network/transport/5xx failures (transient).

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export default function SignupScreen(): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigation = useNavigation<Nav>();
  const { show: showToast } = useToast();

  const handleSignup = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    // Mirror tbot-backend signup contract (DTO at tbot-backend src/auth/dto/signup.dto.ts):
    // password must contain ≥1 uppercase, ≥1 digit, and ≥1 from !@#$%^&*. Without this
    // local guard the user round-trips to Render only to see a generic "Could not create
    // account" toast (the swallowed server message used to live behind that fallback).
    if (!/[A-Z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      setError('Password must include at least one uppercase letter, one number, and one special character (!@#$%^&*).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      pendingCredentials.set(email, password);
      setError('');
      navigation.navigate('Coppa');
    } catch (err: unknown) {
      // The axios response interceptor (api/client.ts) hands us a normalized
      // AppError (utils/errors.ts: { code, message, retryable }) — the raw
      // axios `status` is dropped during normalization, so the previous
      // `e.status === 400` check never matched and the user only ever saw
      // the generic "Could not create account" toast even when the server
      // had returned a precise message (e.g. password-rule failure).
      // We branch on `code` instead and surface `message` for any other
      // server-side validation failure.
      const e = err as { code?: string; message?: string };
      if (e?.code === 'USER_EXISTS') {
        setError('An account with this email already exists.');
      } else if (e?.code === 'INTERNAL_ERROR' || e?.code === 'NETWORK_ERROR') {
        showToast({ severity: 'error', text: e.message ?? 'Server error. Please try again.' });
      } else if (e?.message && e.message !== 'An unexpected error occurred. Please try again.') {
        // SERVER_ERROR with status 400 (validation), or any other normalized
        // error with a real message attached — surface it directly.
        setError(e.message);
      } else {
        setError('Could not create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join thousands of families using TBOT</Text>

          {error ? <ErrorMessage message={error} /> : null}

          <Input label="Full name" value={name} onChangeText={setName} placeholder="Jane Smith" autoCapitalize="words" />
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="jane@email.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min. 8 characters" />
          <Input label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" />

          <Button label="Create Account" onPress={handleSignup} loading={loading} style={styles.btn} />

          <View style={styles.loginRow}>
            <Text style={styles.mutedText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.xl },
  btn: { marginTop: spacing.sm },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  link: { ...typography.body2, color: colors.primary, fontWeight: '600' },
  mutedText: { ...typography.body2, color: colors.textSecondary },
});
