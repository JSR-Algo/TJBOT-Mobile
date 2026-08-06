import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import OnboardingClayRobot from '@/features/onboarding/components/OnboardingClayRobot';
import Robot from '@/design-system/components/Robot';
import { Icon } from '@/design-system/icons';
import { Text } from '@/design-system/primitives/Text';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeError } from '@/utils/errors';
import * as authApi from '@/services/api/auth';
import PasswordChecklist from '../components/PasswordChecklist';
import { useAppLanguage } from '@/services/i18n/i18n';
import { COLORS, styles } from './loginStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginScreen'>;
type AuthMode = 'signup' | 'login';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL_RE = /[!@#$%^&*]/;
const PASSWORD_UPPER_RE = /[A-Z]/;
const PASSWORD_DIGIT_RE = /\d/;


function validateInputs(
  email: string,
  password: string,
  mode: AuthMode,
): { emailError: string | null; passwordError: string | null } {
  if (!email) return { emailError: 'Enter your email to continue.', passwordError: null };
  if (!EMAIL_RE.test(email)) return { emailError: 'Enter a valid email address.', passwordError: null };
  if (!password) return { emailError: null, passwordError: 'Enter your password to continue.' };
  if (mode === 'login') return { emailError: null, passwordError: null };
  if (
    password.length < 8
    || !PASSWORD_UPPER_RE.test(password)
    || !PASSWORD_DIGIT_RE.test(password)
    || !PASSWORD_SPECIAL_RE.test(password)
  ) {
    return { emailError: null, passwordError: 'Password must meet every rule below.' };
  }
  return { emailError: null, passwordError: null };
}

export default function LoginScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useAppLanguage();
  const { login, signup, isLoading } = useAuth();
  const [mode, setMode] = React.useState<AuthMode>('signup');
  const [parentName, setParentName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [showAuthError, setShowAuthError] = React.useState(false);
  const [forgotMode, setForgotMode] = React.useState(false);
  const [resetSending, setResetSending] = React.useState(false);
  const [resetMessage, setResetMessage] = React.useState<string | null>(null);
  const [resetCooldown, setResetCooldown] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (resetCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResetCooldown(current => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const clearErrors = (): void => {
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);
  };

  const switchMode = (newMode: AuthMode): void => {
    setMode(newMode);
    setForgotMode(false);
    setShowAuthError(false);
    setResetMessage(null);
    clearErrors();
  };

  const openForgotPassword = (): void => {
    setForgotMode(true);
    setShowAuthError(false);
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
      if (!EMAIL_RE.test(cleanEmail)) {
        setEmailError('Enter a valid email address.');
        return;
      }
      setResetSending(true);
      clearErrors();
      try {
        await authApi.forgotPassword(cleanEmail);
        setResetMessage('Password reset email sent.');
        setResetCooldown(60);
      } catch (_error) {
        setGeneralError('Could not send reset email. Check your connection and try again.');
      } finally {
        setResetSending(false);
      }
      return;
    }

    const cleanEmail = email.trim();
    const validation = validateInputs(cleanEmail, password, mode);
    if (validation.emailError || validation.passwordError) {
      setEmailError(validation.emailError);
      setPasswordError(validation.passwordError);
      setGeneralError(null);
      return;
    }

    clearErrors();
    setShowAuthError(false);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(cleanEmail, password);
      } else {
        await signup(parentName.trim() || cleanEmail, cleanEmail, password);
      }
    } catch (error) {
      const { code, message, status, traceId } = normalizeError(error);
      if (code === 'USER_EXISTS' || code === 'ACCOUNT_ALREADY_EXISTS') {
        setMode('login');
        setShowAuthError(false);
        setGeneralError(message);
        return;
      }

      const isServerFault = typeof status === 'number' && status >= 500;
      const suffix = isServerFault && traceId ? ` (Error ID: ${traceId.slice(0, 8)})` : '';
      const hint = isServerFault ? ' If this keeps happening, contact support with the Error ID.' : '';
      const normalizedMessage = `${message}${hint}${suffix}`;
      const rawMessage = error instanceof Error ? error.message : '';
      const invalidCredentials = code === 'INVALID_CREDENTIALS'
        || /credential|password|email.*match/i.test(`${rawMessage} ${message}`);
      setGeneralError(mode === 'login' && invalidCredentials
        ? 'Email or password is incorrect'
        : normalizedMessage);
      setShowAuthError(mode === 'login');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPasswordField = (surface: 'form' | 'error'): React.JSX.Element => (
    <View style={styles.fieldGroup}>
      <Text fontWeight="800" style={surface === 'form' ? styles.formLabel : styles.errorLabel}>Password</Text>
      <View style={[styles.passwordWrap, surface === 'error' && styles.errorInput, passwordError && styles.inputInvalid]}>
        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (passwordError) setPasswordError(null);
          }}
          placeholder={t('Password')}
          testID="passwordInput"
          accessibilityLabel={t('Password')}
          placeholderTextColor={COLORS.muted}
          style={styles.passwordInput}
          secureTextEntry={!passwordVisible}
          autoCapitalize="none"
          editable={!submitting}
        />
        <TouchableOpacity
          testID="passwordInputToggle"
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? t('Hide password') : t('Show password')}
          onPress={() => setPasswordVisible(visible => !visible)}
          style={styles.eyeButton}
        >
          <Icon name={passwordVisible ? 'EyeOff' : 'Eye'} size={21} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
      {passwordError ? (
        <Text accessibilityRole="alert" testID="passwordErrorText" style={styles.fieldError}>{passwordError}</Text>
      ) : null}
    </View>
  );

  if (forgotMode) {
    return (
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          testID="forgotPasswordScreen"
          contentContainerStyle={styles.forgotContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.decorCircleTop} />
          <TouchableOpacity
            testID="backToLoginButton"
            accessibilityRole="button"
            accessibilityLabel={t('Back to log in')}
            onPress={() => {
              setForgotMode(false);
              setResetMessage(null);
              clearErrors();
            }}
            style={styles.squareBackButton}
          >
            <Icon name="ArrowLeft" size={24} color={COLORS.ink} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.forgotHero}>
            <Robot emotion="think" size={190} reduceMotion />
          </View>
          <Text testID="forgotPasswordTitle" fontWeight="800" style={styles.forgotTitle}>Don't worry, TeeBot will help!</Text>
          <Text fontWeight="700" style={styles.forgotSubtitle}>
            Enter your email and TeeBot will send password-reset instructions right away.
          </Text>

          <View style={styles.forgotForm}>
            <Text fontWeight="800" style={styles.errorLabel}>Email address</Text>
            <View style={[styles.emailIconWrap, emailError && styles.inputInvalid]}>
              <Icon name="Mail" size={23} color={COLORS.muted} />
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError(null);
                  if (resetMessage) setResetMessage(null);
                }}
                placeholder="email@example.com"
                testID="emailInput"
                accessibilityLabel={t('Email address')}
                placeholderTextColor={COLORS.muted}
                style={styles.emailIconInput}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!resetSending}
              />
            </View>
            {emailError ? (
              <Text accessibilityRole="alert" testID="emailErrorText" style={styles.fieldError}>{emailError}</Text>
            ) : null}
          </View>

          {generalError ? (
            <Text accessibilityRole="alert" testID="generalErrorText" style={styles.centerError}>{generalError}</Text>
          ) : null}
          {resetMessage ? (
            <Text accessibilityRole="alert" testID="resetMessageText" style={styles.centerSuccess}>{resetMessage}</Text>
          ) : null}

          <TouchableOpacity
            testID="submitButton"
            accessibilityRole="button"
            accessibilityLabel={t('Send request')}
            accessibilityState={{ disabled: resetSending || resetCooldown > 0 }}
            onPress={onSubmit}
            disabled={resetSending || resetCooldown > 0}
            style={[styles.primaryButton, (resetSending || resetCooldown > 0) && styles.buttonDisabled]}
          >
            {resetSending ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text fontWeight="800" style={styles.primaryButtonText}>Send request</Text>
            )}
          </TouchableOpacity>

          {resetMessage ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('Resend password email')}
              accessibilityState={{ disabled: resetCooldown > 0 }}
              disabled={resetCooldown > 0}
              onPress={onSubmit}
              style={styles.resendButton}
            >
              <Icon name="RefreshCw" size={19} color={COLORS.primary} />
              <Text fontWeight="800" style={styles.resendText}>
                {resetCooldown > 0 ? t('Resend email in {{seconds}}s').replace('{{seconds}}', String(resetCooldown)) : t('Resend email')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (showAuthError && generalError) {
    return (
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          testID="authErrorScreen"
          contentContainerStyle={styles.errorContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.decorCircleTop} />
          <View style={styles.errorHero}>
            <Robot emotion="worry" size={178} reduceMotion />
          </View>
          <Text testID="authErrorTitle" fontWeight="800" style={styles.errorTitle}>TeeBot is waiting for you to sign in</Text>

          <View accessible accessibilityRole="alert" style={styles.errorCard}>
            <View style={styles.alertIconWrap}>
              <Icon name="CircleAlert" size={24} color={COLORS.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.errorCardCopy}>
              <Text i18n={false} fontWeight="800" style={styles.errorCardTitle}>{t(generalError)}</Text>
              <Text fontWeight="700" style={styles.errorCardBody}>Check it again for TeeBot</Text>
            </View>
          </View>

          <View style={styles.errorFields}>
            <View style={styles.fieldGroup}>
              <Text fontWeight="800" style={styles.errorLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('Email')}
                testID="emailInput"
                accessibilityLabel={t('Email')}
                placeholderTextColor={COLORS.muted}
                style={styles.errorInput}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
              />
            </View>
            {renderPasswordField('error')}
          </View>

          <TouchableOpacity
            testID="retryAuthButton"
            accessibilityRole="button"
            accessibilityLabel={t('Try again')}
            onPress={onSubmit}
            disabled={submitting || isLoading}
            style={[styles.primaryButton, (submitting || isLoading) && styles.buttonDisabled]}
          >
            {submitting || isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text fontWeight="800" style={styles.primaryButtonText}>Try again</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID="recoverPasswordButton"
            accessibilityRole="button"
            accessibilityLabel={t('Forgot password')}
            onPress={openForgotPassword}
            style={styles.recoverButton}
          >
            <Text fontWeight="700" style={styles.recoverPrompt}>Forgot password? </Text>
            <Text fontWeight="800" style={styles.recoverLink}>Recover password</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const ctaLabel = submitting ? '…' : mode === 'signup' ? 'Create account' : 'Log in';

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        testID="loginScreenScroll"
        contentContainerStyle={styles.authContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authHeader}>
          <TouchableOpacity
            testID="loginBackButton"
            accessibilityRole="button"
            accessibilityLabel={t('Back')}
            onPress={() => navigation.navigate(ROUTES.TrustScreen)}
            style={styles.roundBackButton}
          >
            <Icon name="ArrowLeft" size={24} color={COLORS.ink} strokeWidth={2.6} />
          </TouchableOpacity>
          <Text fontWeight="800" style={styles.authHeaderTitle}>Parent account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.authHero}>
          <OnboardingClayRobot size={128} testID="authMascot" />
          <Text fontWeight="800" style={styles.authTitle}>
            {mode === 'signup' ? 'Hello, little one!' : 'Welcome back'}
          </Text>
          <Text fontWeight="700" style={styles.authSubtitle}>
            {mode === 'signup' ? 'Create an account to save learning progress' : 'Sign in to continue learning with TeeBot'}
          </Text>
        </View>

        <View style={styles.authSheet}>
          <View style={styles.modeTabs}>
            {([{ id: 'login', label: 'Log in' }, { id: 'signup', label: 'Sign up' }] as const).map(tab => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => switchMode(tab.id)}
                activeOpacity={0.75}
                testID={`authModeTab_${tab.id}`}
                accessibilityRole="button"
                accessibilityLabel={t(`${tab.label} mode`)}
                accessibilityState={{ selected: mode === tab.id }}
                style={[styles.modeTab, mode === tab.id && styles.modeTabActive]}
              >
                <Text fontWeight="800" style={[styles.modeTabText, mode === tab.id && styles.modeTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formFields}>
            {mode === 'signup' ? (
              <View style={styles.fieldGroup}>
                <Text fontWeight="800" style={styles.formLabel}>Parent name</Text>
                <TextInput
                  value={parentName}
                  onChangeText={setParentName}
                  placeholder={t('Enter your name')}
                  testID="parentNameInput"
                  accessibilityLabel={t('Parent name')}
                  placeholderTextColor={COLORS.muted}
                  style={styles.formInput}
                  autoCapitalize="words"
                  editable={!submitting}
                />
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text fontWeight="800" style={styles.formLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError(null);
                }}
                placeholder={t('Email')}
                testID="emailInput"
                accessibilityLabel={t('Email')}
                placeholderTextColor={COLORS.muted}
                style={[styles.formInput, emailError && styles.inputInvalid]}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
              />
              {emailError ? (
                <Text accessibilityRole="alert" testID="emailErrorText" style={styles.fieldError}>{emailError}</Text>
              ) : null}
            </View>

            {renderPasswordField('form')}

            {mode === 'signup' ? <PasswordChecklist password={password} /> : null}
          </View>

          {generalError ? (
            <Text accessibilityRole="alert" testID="generalErrorText" style={styles.centerError}>{generalError}</Text>
          ) : null}

          {mode === 'login' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('Forgot password')}
              testID="forgotPasswordButton"
              onPress={openForgotPassword}
              style={styles.inlineForgotButton}
            >
              <Text fontWeight="800" style={styles.inlineForgotText}>Forgot password?</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            testID="submitButton"
            accessibilityRole="button"
            accessibilityLabel={t(ctaLabel)}
            onPress={onSubmit}
            disabled={submitting || isLoading}
            style={[styles.sheetPrimaryButton, (submitting || isLoading) && styles.buttonDisabled]}
          >
            {submitting || isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text fontWeight="800" style={styles.primaryButtonText}>{ctaLabel}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(mode === 'signup' ? 'Log in now' : 'Sign up now')}
            onPress={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
            style={styles.switchPrompt}
          >
            <Text fontWeight="700" style={styles.switchPromptText}>
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Text i18n={false}> </Text>
            <Text fontWeight="800" style={styles.switchPromptLink}>
              {mode === 'signup' ? 'Log in now' : 'Sign up now'}
            </Text>
          </TouchableOpacity>

          <Text i18n={false} style={styles.legal}>
            {t('By continuing you agree to our')}{' '}
            <Text i18n={false} style={styles.legalLink}>{t('Terms')}</Text>
            {' '}{t('and')}{' '}
            <Text i18n={false} style={styles.legalLink}>{t('Privacy Policy')}</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
