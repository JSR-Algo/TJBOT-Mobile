import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'FactoryResetScreen'>;
type Step = 'warning' | 'gate' | 'confirm';

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'back'] as const;

export default function FactoryResetScreen({ navigation }: Props) {
  const [step, setStep] = React.useState<Step>('warning');
  const [target] = React.useState(() => 100 + Math.floor(Math.random() * 900));
  const [val, setVal] = React.useState('');
  const [shake, setShake] = React.useState(false);

  if (step === 'warning') {
    return (
      <DeviceShell title="Factory reset" onBack={() => navigation.navigate('MyRobotScreen')}>
        <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
          <Box style={styles.dangerCircle} alignItems="center" justifyContent="center">
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={RM.danger} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 8v5M12 17v.01" />
              <Circle cx={12} cy={12} r={9} />
            </Svg>
          </Box>
          <Text fontWeight="600" style={styles.heading}>This will erase your Robot</Text>
          <Text style={styles.sub}>
            Use this only if you're giving Robot to someone else, or troubleshooting with our support team.
          </Text>
        </Box>
        <Box paddingHorizontal={16} paddingTop={24}>
          <Box style={styles.rowCard}>
            <DeviceRow icon="🤖" title="Robot will forget your Wi-Fi" body="And the pairing with this app" />
            <DeviceRow icon="📚" title="Courses will be removed" body="They stay in your library and re-download anytime" />
            <DeviceRow icon="🌱" title="Your child's progress is safe" body="Stored in your account, not on the device" />
            <DeviceRow icon="🔄" title="Robot will restart" body="Setup takes about 5 minutes" />
          </Box>
        </Box>
        <Box paddingHorizontal={16} paddingTop={18}>
          <Box style={styles.warningNote}>
            <Text fontWeight="600" style={{ color: '#7B2A1F', fontSize: 13 }}>Have you tried smaller fixes? </Text>
            <Text style={{ color: '#7B2A1F', fontSize: 13, lineHeight: 20 }}>
              Restarting Robot or rejoining Wi-Fi often solves the problem without erasing anything.
            </Text>
          </Box>
        </Box>
        <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
          <DeviceBigBtn secondary onClick={() => navigation.navigate('OfflineHelpScreen')}>Try smaller fixes first</DeviceBigBtn>
          <DeviceBigBtn danger onClick={() => setStep('gate')}>I understand · continue</DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  if (step === 'gate') {
    const onPress = (k: string) => {
      if (k === 'back') return setVal(v => v.slice(0, -1));
      const next = (val + k).slice(0, 3);
      setVal(next);
      if (next.length === 3) {
        if (parseInt(next, 10) === target) setTimeout(() => setStep('confirm'), 200);
        else { setShake(true); setTimeout(() => { setShake(false); setVal(''); }, 350); }
      }
    };
    return (
      <DeviceShell title="Parent gate" onBack={() => setStep('warning')}>
        <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
          <Text fontWeight="600" style={styles.gateLabel}>Type this number</Text>
          <Text fontWeight="700" style={styles.targetNum}>{target}</Text>
          <Box style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            {[0, 1, 2].map(i => (
              <Box key={i} style={[styles.digitBox, val.length > i ? styles.digitBoxFilled : {}]} alignItems="center" justifyContent="center">
                <Text fontWeight="700" style={styles.digitText}>{val[i] ?? ''}</Text>
              </Box>
            ))}
          </Box>
          <Text style={[styles.gateHint, { color: shake ? RM.danger : RM.ink2 }]}>
            {shake ? "Doesn't match. Try again." : 'This is just to keep little hands out.'}
          </Text>
        </Box>
        <Box paddingHorizontal={24} paddingTop={30} paddingBottom={30}>
          <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {KEYS.map((k, i) => {
              if (k === '') return <Box key={i} style={{ width: '30%' }} />;
              const isBack = k === 'back';
              return (
                <TouchableOpacity key={i} onPress={() => onPress(isBack ? 'back' : String(k))} activeOpacity={0.7}
                  style={[styles.keyBtn, { width: '30%' }]}>
                  <Text fontWeight="600" style={[styles.keyText, isBack && { fontSize: 14, color: RM.ink2 }]}>
                    {isBack ? '⌫' : k}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title="Last check" onBack={() => setStep('warning')}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="gentle" size={150} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>Erase Robot ROB-2A8F?</Text>
        <Text style={styles.sub}>Robot will sleep, forget Wi-Fi, and need to be paired again.</Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🛡️" title="Account & progress kept" body="Sign in again to restore everything" />
          <DeviceRow icon="⏱️" title="Takes about 90 seconds" />
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={30} paddingBottom={30} gap={10}>
        <DeviceBigBtn danger onClick={() => navigation.navigate('MyRobotScreen')}>Yes, erase Robot</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('MyRobotScreen')}>Cancel</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  dangerCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FBE6E2' },
  heading: { fontSize: 24, color: RM.ink, letterSpacing: -0.4, textAlign: 'center', marginTop: 18 },
  sub: { fontSize: 14, color: RM.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  warningNote: { backgroundColor: '#FBE6E2', borderRadius: 12, padding: 14 },
  gateLabel: { fontSize: 13, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  targetNum: { fontSize: 60, color: RM.ink, letterSpacing: 1, marginTop: 14 },
  digitBox: { width: 46, height: 56, borderRadius: 10, backgroundColor: RM.card, borderWidth: 2, borderColor: RM.hair },
  digitBoxFilled: { borderColor: RM.accent },
  digitText: { fontSize: 26, color: RM.ink },
  gateHint: { fontSize: 13, marginTop: 16, height: 18 },
  keyBtn: { height: 54, borderRadius: 12, borderWidth: 1, borderColor: RM.hair, backgroundColor: RM.card, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 22, color: RM.ink },
});
