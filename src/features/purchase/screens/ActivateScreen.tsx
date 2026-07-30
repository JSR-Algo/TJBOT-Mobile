import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';
import { activateRobot } from '@/services/api/purchase.api';
import { useRequestId } from '@/services/http/idempotency';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivateScreen'>;

const CODE_CHARS = ['T', 'B', '4', '7', 'K', '9'];

export default function ActivateScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const [code, setCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const vals = code.padEnd(6, '').slice(0, 6).split('');
  const filled = vals.every(Boolean);
  const orderId = route.params?.orderId;
  const requestId = useRequestId();

  const handleKey = (k: string) => {
    if (k === 'CLR') { setCode(''); return; }
    setCode(prev => (prev + k).slice(0, 6).toUpperCase());
  };

  const submit = async (): Promise<void> => {
    if (!filled || submitting) {
      return;
    }
    setSubmitting(true);
    await activateRobot(code.toUpperCase(), requestId ?? undefined);
    navigation.navigate(ROUTES.FirstCourseScreen, orderId ? { orderId } : undefined);
  };

  return (
    <DeviceShell title="Activate your Robot" onBack={() => navigation.navigate(ROUTES.ArrivedScreen, orderId ? { orderId } : undefined)}>
      <Box paddingHorizontal={24} paddingTop={18} alignItems="center">
        <PRStepTab step={1} total={3} />
      </Box>

      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.lockIcon}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={PR.ink2} strokeWidth={1.8} strokeLinecap="round">
            <Rect x={3} y={11} width={18} height={10} rx={2} />
            <Path d="M7 11V7a5 5 0 0110 0v4" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Enter activation code</Text>
        <Text style={styles.sub}>You'll find a 6-character code on the card inside Robot's box.</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24}>
        <TextInput
          accessibilityLabel={t('Activation code')}
          placeholder={t('Activation code')}
          value={code}
          onChangeText={(text) => setCode(text.slice(0, 6).toUpperCase())}
          style={styles.hiddenInput}
        />
        <Box flexDirection="row" gap={8} justifyContent="center">
          {vals.map((v, i) => (
            <Box key={i} style={[styles.codeDigit, { borderColor: v ? PR.accent : PR.hair }]}>
              <Text fontWeight="700" style={styles.codeText}>{v.toUpperCase()}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {CODE_CHARS.map((k, i) => (
            <TouchableOpacity key={i} onPress={() => handleKey(k)} style={styles.key} activeOpacity={0.7}>
              <Text fontWeight="600" style={styles.keyText}>{k}</Text>
            </TouchableOpacity>
          ))}
        </Box>
        <TouchableOpacity onPress={() => handleKey('CLR')} style={styles.clearBtn} activeOpacity={0.7}>
          <Text fontWeight="600" style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </Box>

      <Box paddingHorizontal={18} paddingTop={18}>
        <Box style={styles.helpRow}>
          <DeviceRow icon="CircleHelp" title="Can't find the code?" body="It's printed on the inside flap of the box" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30}>
        <DeviceBigBtn onClick={submit}>
          {submitting ? 'Activating Robot...' : filled ? 'Activate Robot' : 'Enter the code'}
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  lockIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heading: { fontSize: 22, color: PR.ink, letterSpacing: -0.3, textAlign: 'center' },
  sub: { fontSize: 13, color: PR.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 20, marginTop: 8 },
  codeDigit: {
    width: 42, height: 54, borderRadius: 10, backgroundColor: PR.card,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  codeText: { fontSize: 24, color: PR.ink, fontFamily: 'Courier New' },
  key: { width: '15%', height: 46, borderRadius: 10, borderWidth: 1, borderColor: PR.hair, backgroundColor: PR.card, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 16, color: PR.ink, fontFamily: 'Courier New' },
  clearBtn: { marginTop: 10, alignItems: 'center', padding: 8 },
  clearText: { fontSize: 13, color: PR.accent },
  helpRow: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  hiddenInput: { height: 0, opacity: 0 },
});
