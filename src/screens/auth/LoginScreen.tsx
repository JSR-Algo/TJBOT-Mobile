import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bot } from 'lucide-react-native';
import { Button, Input, ErrorMessage } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { useToast } from '../../components/Toast';

// Error pattern: ErrorMessage for field-scoped validation errors (must persist
// until the user corrects them). useToast for network/transport/5xx failures
// (transient, no fixed render-location).

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const { login } = useAuth();
  const navigation = useNavigation<Nav>();
  const { show: showToast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) { setFieldError('Please enter your email and password.'); return; }
    setFieldError('');
    setLoading(true);
    try {
      await login(email, password);
      // RootNavigator handles redirect
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.message?.includes('Network') || e?.message?.includes('timeout')) {
        showToast({ severity: 'error', text: 'Network error. Please try again.' });
      } else {
        setFieldError('Incorrect email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="loginScreen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoCircle}>
            <Bot size={44} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your TBOT account</Text>

          {fieldError ? <ErrorMessage message={fieldError} /> : null}

          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="parent@email.com" testID="emailInput" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" testID="passwordInput" />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>

          <Button label="Sign In" onPress={handleLogin} loading={loading} testID="submitButton" />

          <View style={styles.signupRow}>
            <Text style={styles.mutedText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.link}>Sign up</Text>
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
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  logoCircle: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.md },
  link: { ...typography.body2, color: colors.primary, fontWeight: '600' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  mutedText: { ...typography.body2, color: colors.textSecondary },
});
