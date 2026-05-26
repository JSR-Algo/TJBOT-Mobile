import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Svg, { Path, Rect } from 'react-native-svg';
import { ROUTES } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import ParentScroll, { PA } from '../components/ParentScroll';
import { authenticateParent } from '@/services/api/parent.api';
import { useParentSession } from '../context/ParentSessionContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentGateScreen'>;

type ParentGateError = {
  status?: number;
  retryAfterSeconds?: number;
};

type ParentGateNextRoute = NonNullable<RootStackParamList['ParentGateScreen']>['next'];

function replaceAfterParentGate(navigation: Props['navigation'], next: ParentGateNextRoute): void {
  switch (next) {
    case ROUTES.ParentSettingsScreen:
      navigation.replace(ROUTES.ParentSettingsScreen);
      return;
    case ROUTES.ParentSafetyScreen:
      navigation.replace(ROUTES.ParentSafetyScreen);
      return;
    case ROUTES.ParentHistoryScreen:
      navigation.replace(ROUTES.ParentHistoryScreen);
      return;
    case ROUTES.ParentTodayScreen:
      navigation.replace(ROUTES.ParentTodayScreen);
      return;
    case ROUTES.ParentAccountPrivacyScreen:
      navigation.replace(ROUTES.ParentAccountPrivacyScreen);
      return;
    case ROUTES.ParentSummaryScreen:
    default:
      navigation.replace(ROUTES.ParentSummaryScreen);
  }
}

export default function ParentGateScreen({ navigation, route }: Props) {
  const parentSession = useParentSession();
  const [val, setVal] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const disabled = submitting || cooldown > 0;

  React.useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setCooldown(0);
      setMessage('You can try again now.');
    }, cooldown * 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (): Promise<void> => {
    if (disabled) {
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await authenticateParent({ pin: val });
      if (result.authenticated) {
        parentSession.markGated();
        replaceAfterParentGate(navigation, route.params?.next);
        return;
      }
      setMessage('Parent PIN was not accepted. Try again.');
    } catch (error) {
      const shaped = error as ParentGateError;
      if (shaped.status === 423) {
        navigation.replace(ROUTES.ParentLockedOutScreen);
      } else if (shaped.status === 429) {
        const seconds = shaped.retryAfterSeconds ?? 30;
        setCooldown(seconds);
        setMessage(`Too many attempts. Try again in ${seconds} seconds.`);
      } else {
        setMessage('Wrong PIN. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ParentScroll>
      <Box paddingHorizontal={28} paddingTop={68} paddingBottom={0}>
        <Text onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} style={styles.backLink}>
          Back to play
        </Text>
      </Box>
      <Box flex={1} paddingHorizontal={28} paddingTop={40} paddingBottom={28} justifyContent="center">
        <Box style={styles.lockIcon} alignItems="center" justifyContent="center" marginBottom={20}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={PA.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={4} y={10} width={16} height={11} rx={2} />
            <Path d="M8 10V7a4 4 0 018 0v3" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.title}>Parent Space</Text>
        <Text style={styles.sub}>
          To continue, enter your parent PIN. This keeps parent controls separate from the play area.
        </Text>

        <Box style={styles.card} marginBottom={18}>
          <Text style={styles.cardLabel}>PARENT PIN</Text>
          <TextInput
            inputMode="numeric"
            value={val}
            onChangeText={text => setVal(text.replace(/\D/g, '').slice(0, 6))}
            placeholder="Parent PIN"
            placeholderTextColor={PA.ink3}
            editable={!disabled}
            secureTextEntry
            style={[styles.input, { borderBottomColor: PA.hair }]}
          />
          <Text
            onPress={submit}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            style={[styles.confirm, disabled && styles.confirmDisabled]}
          >
            Confirm
          </Text>
        </Box>
        {message ? <Text style={styles.feedback}>{message}</Text> : null}
        {cooldown > 0 ? <Text style={styles.disclaimer}>This protects parent controls from child access.</Text> : null}
        <Text style={styles.disclaimer}>
          Children using the device on their own will see the play area only.
        </Text>
      </Box>
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 14, color: PA.ink2, paddingVertical: 4 },
  lockIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF1F5' },
  title: { fontSize: 24, color: PA.ink, letterSpacing: -0.4, marginBottom: 8 },
  sub: { fontSize: 15, color: PA.ink2, lineHeight: 22, marginBottom: 32 },
  card: { backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair, borderRadius: 14, padding: 22 },
  cardLabel: { fontSize: 12, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  input: { borderBottomWidth: 2, fontSize: 24, color: PA.ink, paddingVertical: 8 },
  confirm: {
    color: '#fff',
    backgroundColor: PA.accent,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
    paddingVertical: 12,
    marginTop: 16,
    fontWeight: '600',
  },
  confirmDisabled: { opacity: 0.5 },
  feedback: { fontSize: 13, color: '#B42318', lineHeight: 20, marginBottom: 10 },
  disclaimer: { fontSize: 13, color: PA.ink3, lineHeight: 20 },
});
