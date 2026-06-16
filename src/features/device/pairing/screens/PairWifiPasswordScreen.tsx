import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { getPairWifiPasswordSsid } from '../routeParams';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWifiPasswordScreen'>;

export default function PairWifiPasswordScreen({ navigation, route }: Props) {
  const [password, setPassword] = React.useState('');
  const [visible, setVisible] = React.useState(false);
  const params = route.params;
  const ssid = getPairWifiPasswordSsid(route.params);
  const code = getPairCode(params);
  const submit = () => navigation.navigate(ROUTES.PairConnectingScreen, {
    deviceId: params?.deviceId,
    serial: params?.serial,
    espDeviceName: params?.espDeviceName,
    code,
    ssid,
    password,
  });

  return (
    <DeviceShell title={ssid} onBack={() => navigation.navigate(ROUTES.PairWifiScreen)}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text style={styles.intro}>
          Enter the Wi-Fi password. Robot will remember it — your child won't need to.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.pwCard}>
          <Text fontWeight="600" style={styles.pwLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Wi-Fi password"
            secureTextEntry={!visible}
            style={styles.passwordInput}
            accessibilityLabel="Wi-Fi password"
          />
        </Box>
      </Box>
      <TouchableOpacity
        style={styles.showRow}
        onPress={() => setVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide Wi-Fi password' : 'Show Wi-Fi password'}
        accessibilityState={{ selected: visible }}
      >
        <Box style={styles.checkBox} alignItems="center" justifyContent="center">
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <Path d="M5 12l5 5 9-10" />
          </Svg>
        </Box>
        <Text style={styles.showPw}>Show password</Text>
      </TouchableOpacity>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={submit}>Connect Robot</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

function getPairCode(params: Props['route']['params']): string | undefined {
  if (!params || !('code' in params) || typeof params.code !== 'string') return undefined;
  return params.code;
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: DV.ink2, lineHeight: 22 },
  pwCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14 },
  pwLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  pwDots: { fontSize: 18, color: DV.ink, letterSpacing: 2 },
  passwordInput: { fontSize: 18, color: DV.ink, minHeight: 44 },
  showRow: { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkBox: { width: 18, height: 18, borderRadius: 4, backgroundColor: DV.accent },
  showPw: { fontSize: 13, color: DV.ink2 },
});
