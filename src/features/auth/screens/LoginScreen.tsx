import React from 'react';
import { Keyboard, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeError } from '@/utils/errors';
import * as authApi from '@/services/api/auth';
import PasswordInput from '../components/PasswordInput';
import PasswordChecklist from '../components/PasswordChecklist';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginScreen'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL_RE = /[!@#$%^&*]/;
const PASSWORD_UPPER_RE = /[A-Z]/;
const PASSWORD_DIGIT_RE = /\d/;

function validateInputs(
  email: string,
  password: string,
  confirmPassword: string,
  mode: 'signup' | 'login',
): { emailError: string | null; passwordError: string | null; generalError: string | null } {
  if (!email) return { emailError: 'Enter your email to continue.', passwordError: null, generalError: null };
  if (!EMAIL_RE.test(email)) return { emailError: 'Enter a valid email address.', passwordError: null, generalError: null };
  if (!password) return { emailError: null, passwordError: 'Enter your password to continue.', generalError: null };
  if (mode === 'login') return { emailError: null, passwordError: null, generalError: null };
  const issues: string[] = [];
  if (password.length < 8) issues.push('at least 8 characters');
  if (!PASSWORD_UPPER_RE.test(password)) issues.push('one uppercase letter');
  if (!PASSWORD_DIGIT_RE.test(password)) issues.push('one number');
  if (!PASSWORD_SPECIAL_RE.test(password)) issues.push('one special character (!@#$%^&*)');
  if (issues.length > 0) {
    return { emailError: null, passwordError: `Password must contain ${issues.join(', ')}.`, generalError: null };
  }
  if (confirmPassword !== password) {
    return { emailError: null, passwordError: 'Passwords do not match.', generalError: null };
  }
  return { emailError: null, passwordError: null, generalError: null };
}

export default function LoginScreen(_: Props) {
  const { login, signup } = useAuth();
  const [mode, setMode] = React.useState<'signup' | 'login'>('signup');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [forgotMode, setForgotMode] = React.useState(false);
  const [resetSending, setResetSending] = React.useState(false);
  const [resetMessage, setResetMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);
  };

  const switchMode = (newMode: 'signup' | 'login') => {
    setMode(newMode);
    setForgotMode(false);
    setResetMessage(null);
    clearErrors();
  };

  const onSubmit = async (): Promise<void> => {
    Keyboard.dismiss();

    if (forgotMode) {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        setEmailError('Enter your email to reset your password.');
        return;
      }
      setResetSending(true);
      clearErrors();
      try {
        await authApi.forgotPassword(cleanEmail);
        setResetMessage('Password reset email sent.');
      } catch (_err) {
        setGeneralError('Could not send reset email. Check your connection and try again.');
      } finally {
        setResetSending(false);
      }
      return;
    }

    const cleanEmail = email.trim();
    const result = validateInputs(cleanEmail, password, confirmPassword, mode);
    if (result.emailError || result.passwordError || result.generalError) {
      setEmailError(result.emailError);
      setPasswordError(result.passwordError);
      setGeneralError(result.generalError);
      return;
    }
    clearErrors();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(cleanEmail, password);
      } else {
        await signup(cleanEmail, cleanEmail, password);
      }
    } catch (err) {
      const { code, message, status, traceId } = normalizeError(err);
      if (code === 'USER_EXISTS' || code === 'ACCOUNT_ALREADY_EXISTS') {
        setMode('login');
        setForgotMode(false);
        setConfirmPassword('');
        setEmailError(null);
        setPasswordError(null);
        setGeneralError(message);
        return;
      }
      const isServerFault = typeof status === 'number' && status >= 500;
      const suffix = isServerFault && traceId ? ` (Error ID: ${traceId.slice(0, 8)})` : '';
      const hint = isServerFault ? ' If this keeps happening, contact support with the Error ID.' : '';
      setGeneralError(`${message}${hint}${suffix}`);
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel = forgotMode
    ? (resetSending ? 'Sending…' : 'Send reset email')
      : submitting
      ? '…'
      : mode === 'signup'
        ? 'Create account'
        : 'Log in';

  return (
    <OnbShell title="Parent account">
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text fontWeight="600" style={styles.heading}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </Text>
        <Text style={styles.sub}>
          We use your account to save progress and manage privacy.
        </Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18}>
        <Box style={styles.tabBar} flexDirection="row">
          {([{ id: 'signup', label: 'Sign up' }, { id: 'login', label: 'Log in' }] as const).map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => switchMode(t.id)}
              style={[styles.tab, mode === t.id && styles.tabActive]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${t.label} mode`}
              accessibilityState={{ selected: mode === t.id }}
            >
              <Text
                fontWeight="600"
                style={{ fontSize: 14, color: mode === t.id ? OB.ink : OB.ink2 }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={20} gap={10}>
        <Box gap={8}>
          <TextInput
            placeholder="Email"
            testID="emailInput"
            placeholderTextColor={OB.ink3}
            style={[styles.input, emailError ? styles.inputError : null]}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (emailError) setEmailError(null);
              if (resetMessage) setResetMessage(null);
            }}
            editable={!submitting && !resetSending}
          />
          {emailError ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>{emailError}</Text>
          ) : null}

          {!forgotMode ? (
            <PasswordInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (passwordError) setPasswordError(null);
              }}
              placeholder="Password"
              testID="passwordInput"
              hasError={!!passwordError}
              editable={!submitting}
            />
          ) : null}

          {mode === 'signup' && !forgotMode ? (
            <PasswordInput
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (passwordError) setPasswordError(null);
              }}
              placeholder="Confirm password"
              testID="confirmPasswordInput"
              hasError={!!passwordError}
              editable={!submitting}
            />
          ) : null}

          {passwordError ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>{passwordError}</Text>
          ) : null}

          {mode === 'signup' && !forgotMode ? (
            <PasswordChecklist password={password} />
          ) : null}
        </Box>

        {generalError ? (
          <Text accessibilityRole="alert" style={styles.error}>{generalError}</Text>
        ) : null}

        {resetMessage ? (
          <Text accessibilityRole="alert" style={styles.success}>{resetMessage}</Text>
        ) : null}
      </Box>

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        {mode === 'login' && !forgotMode ? (
          <TouchableOpacity
            onPress={() => { setForgotMode(true); clearErrors(); setResetMessage(null); }}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            style={styles.forgotWrap}
          >
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>
        ) : null}

        {forgotMode ? (
          <TouchableOpacity
            onPress={() => { setForgotMode(false); clearErrors(); setResetMessage(null); }}
            accessibilityRole="button"
            accessibilityLabel="Back to log in"
            style={styles.forgotWrap}
          >
            <Text style={styles.forgot}>Back to log in</Text>
          </TouchableOpacity>
        ) : null}

        <OnbBigBtn
          onClick={onSubmit}
          disabled={submitting || resetSending}
        >
          {ctaLabel}
        </OnbBigBtn>
        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={{ color: OB.accent }}>Terms</Text>
          {' '}and{' '}
          <Text style={{ color: OB.accent }}>Privacy Policy</Text>.
        </Text>
      </Box>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21 },
  tabBar: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  input: {
    width: '100%', padding: 14, borderWidth: 1, borderColor: OB.hair,
    borderRadius: 10, fontSize: 15, backgroundColor: '#fff', color: OB.ink,
  },
  inputError: { borderColor: OB.danger },
  fieldError: { fontSize: 13, color: OB.danger, lineHeight: 19 },
  error: { fontSize: 13, color: OB.danger, lineHeight: 19 },
  success: { fontSize: 13, color: OB.good, lineHeight: 19 },
  forgotWrap: { alignSelf: 'flex-start' },
  forgot: { fontSize: 13, color: OB.accent },
  legal: { textAlign: 'center', fontSize: 11, color: OB.ink3, lineHeight: 16 },
});
