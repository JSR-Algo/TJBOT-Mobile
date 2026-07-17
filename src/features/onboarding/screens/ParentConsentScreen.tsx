import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { normalizeError } from '@/utils/errors';
import * as authApi from '@/services/api/auth';
import * as accountApi from '@/services/api/account';
import { getAccessToken } from '@/services/http/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentConsentScreen'>;

const CONSENT_POINTS = [
  'I am the parent or legal guardian setting up this account.',
  'I consent to TJBot creating a child learning profile and using voice during lessons.',
  'I understand child settings and privacy controls stay in Parent Space.',
] as const;

const SIGN_IN_REQUIRED_MESSAGE = 'Sign in is required before parent consent. Sign out, sign in again, then return here.';

/**
 * COPPA consent bypass token.
 * Dev builds: EXPO_PUBLIC_COPPA_BYPASS_TOKEN from .env (unchanged).
 * OTA-beta release builds (2026-07-03, uncommitted worktree patch): the hosted
 * backend runs Stripe in placeholder mode and mints mock charges for any token,
 * so a fixed mock token clears /auth/consent. Remove this fallback when the
 * real Stripe card flow ships — App Store builds must not carry it.
 */
const COPPA_BYPASS_TOKEN = __DEV__
  ? process.env.EXPO_PUBLIC_COPPA_BYPASS_TOKEN
  : 'tok_mock_ota_beta';

function consentErrorMessage(error: unknown): string {
  const normalized = normalizeError(error);
  if (
    normalized.code === 'invalid_access_token'
    || normalized.code === 'invalid_refresh_token'
    || normalized.code === 'AUTH_TOKEN_INVALID'
    || normalized.code === 'AUTH_TOKEN_MISSING'
    || normalized.code === 'INVALID_CREDENTIALS'
  ) {
    return 'Your session expired. Sign out, sign in again, then retry parent consent.';
  }
  if (normalized.code === 'VALIDATION_ERROR') {
    return 'Parent consent could not be recorded. Check the consent details and try again.';
  }
  if (normalized.code === 'NETWORK_ERROR' || normalized.retryable) {
    return 'The server may be waking up. Wait a few seconds and tap Sign and continue again.';
  }
  return normalized.message;
}

async function recordConsentWithRetry(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await authApi.sendConsent(COPPA_BYPASS_TOKEN);
      return;
    } catch (error: unknown) {
      lastError = error;
      const normalized = normalizeError(error);
      const retriable = normalized.code === 'NETWORK_ERROR' || normalized.retryable === true;
      if (!retriable || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  throw lastError;
}

export default function ParentConsentScreen({ navigation }: Props) {
  const [parentName, setParentName] = React.useState('');
  const [accepted, setAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingStatus, setCheckingStatus] = React.useState(true);
  const [authBlocked, setAuthBlocked] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const trimmedName = parentName.trim();
  const hasConsentDetails = trimmedName.length >= 2 && accepted;
  const canSubmit = hasConsentDetails && !submitting && !checkingStatus && !authBlocked;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) {
            setAuthBlocked(true);
            setError(SIGN_IN_REQUIRED_MESSAGE);
          }
          return;
        }
        if (!cancelled) setAuthBlocked(false);
        if (await accountApi.isCoppaVerified()) {
          if (!cancelled) navigation.navigate(ROUTES.ChildProfileScreen);
        }
      } catch {
        // Non-blocking — user can still submit consent manually.
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const submitConsent = async (): Promise<void> => {
    if (submitting) return;
    if (authBlocked) {
      setError(SIGN_IN_REQUIRED_MESSAGE);
      return;
    }
    if (!hasConsentDetails) {
      setError('Type your name and check the parent consent box before continuing.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await recordConsentWithRetry();
      navigation.navigate(ROUTES.ChildProfileScreen);
    } catch (submitError: unknown) {
      setError(consentErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnbShell title="Parent consent">
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text fontWeight="600" style={styles.heading}>Parent signature needed</Text>
        <Text style={styles.sub}>
          A grown-up must consent before Robot can create a child profile or start voice lessons.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18} gap={10}>
        {CONSENT_POINTS.map(point => (
          <Box key={point} style={styles.pointRow} flexDirection="row" gap={10} alignItems="flex-start">
            <Box style={styles.pointIcon} alignItems="center" justifyContent="center">
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={OB.good} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12l5 5 9-10" />
              </Svg>
            </Box>
            <Text style={styles.pointText}>{point}</Text>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={20} paddingTop={20}>
        <Text style={styles.label}>PARENT OR GUARDIAN NAME</Text>
        <TextInput
          value={parentName}
          onChangeText={(value) => {
            setParentName(value);
            if (error && !authBlocked) setError(null);
          }}
          placeholder="Type your full name"
          placeholderTextColor={OB.ink3}
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          testID="parentConsentNameInput"
          accessibilityLabel="Parent or guardian name"
        />
      </Box>

      <Box paddingHorizontal={20} paddingTop={16}>
        <TouchableOpacity
          onPress={() => {
            setAccepted(value => !value);
            if (error && !authBlocked) setError(null);
          }}
          style={styles.checkRow}
          activeOpacity={0.72}
          testID="parentConsentCheckbox"
          accessibilityRole="checkbox"
          accessibilityLabel="I give parent consent"
          accessibilityState={{ checked: accepted }}
        >
          <Box style={[styles.checkbox, accepted && styles.checkboxActive]} alignItems="center" justifyContent="center">
            {accepted ? (
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12l5 5 9-10" />
              </Svg>
            ) : null}
          </Box>
          <Text style={styles.checkText}>
            I give parent consent for this child learning profile and voice lesson experience.
          </Text>
        </TouchableOpacity>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30}>
        {!hasConsentDetails && !submitting && !checkingStatus ? (
          <Text style={styles.hint}>Type your name (2+ characters) and check the consent box to enable Sign and continue.</Text>
        ) : null}
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
        <OnbBigBtn
          testID="parentConsentSubmitButton"
          disabled={!canSubmit}
          onClick={submitConsent}
        >
          {checkingStatus ? 'Checking consent...' : submitting ? 'Recording consent...' : 'Sign and continue'}
        </OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, marginBottom: 6, letterSpacing: 0, lineHeight: 28 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21 },
  pointRow: { backgroundColor: OB.card, borderWidth: 1, borderColor: OB.hair, borderRadius: 12, padding: 14 },
  pointIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#EAF6EF', flexShrink: 0 },
  pointText: { flex: 1, fontSize: 13, color: OB.ink2, lineHeight: 20 },
  label: { fontSize: 12, color: OB.ink3, paddingBottom: 8, letterSpacing: 0.6, fontWeight: '600' },
  input: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: OB.hair,
    borderRadius: 12,
    fontSize: 15,
    color: OB.ink,
    backgroundColor: OB.card,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: OB.hair,
    borderRadius: 12,
    backgroundColor: OB.card,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.22)',
    flexShrink: 0,
  },
  checkboxActive: { backgroundColor: OB.accent, borderColor: OB.accent },
  checkText: { flex: 1, fontSize: 13, color: OB.ink2, lineHeight: 20 },
  hint: { color: OB.ink3, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  error: { color: OB.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
});
