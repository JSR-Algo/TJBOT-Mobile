import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, ErrorMessage } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigation = useNavigation<Nav>();

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // RootNavigator handles redirect
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🤖</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your TBOT account</Text>

          {error ? <ErrorMessage message={error} /> : null}

          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="parent@email.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>

          <Button label="Sign In" onPress={handleLogin} loading={loading} />

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
  logo: { fontSize: 64, textAlign: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.md },
  link: { ...typography.body2, color: colors.primary, fontWeight: '600' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  mutedText: { ...typography.body2, color: colors.textSecondary },
});
