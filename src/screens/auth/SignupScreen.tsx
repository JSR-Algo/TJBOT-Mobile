import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, ErrorMessage } from '../../components';
import { colors, spacing, typography } from '../../theme';
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
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      pendingCredentials.set(email, password);
      setError('');
      navigation.navigate('Coppa');
    } catch (err: unknown) {
      const e = err as { code?: string; status?: number };
      if (e?.code === 'USER_EXISTS') {
        setError('An account with this email already exists.');
      } else if (e?.status && e.status >= 500) {
        showToast({ severity: 'error', text: 'Server error. Please try again.' });
      } else {
        setError('Could not create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
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
