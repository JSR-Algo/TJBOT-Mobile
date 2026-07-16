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
import { putPairingWifiPassword } from '../pairingSecretHandoff';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWifiPasswordScreen'>;

export default function PairWifiPasswordScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const [visible, setVisible] = React.useState(false);
  const params = route.params;
  const routeSsid = getPairWifiPasswordSsid(route.params);
  const manualSsid = routeSsid === 'Other network';
  const [customSsid, setCustomSsid] = React.useState(manualSsid ? '' : routeSsid);
  const ssid = manualSsid ? customSsid.trim() : routeSsid;
  const passwordScope = `${manualSsid ? 'manual' : 'selected'}:${ssid}`;
  const [passwordEntry, setPasswordEntry] = React.useState({ scope: passwordScope, value: '' });
  const password = passwordEntry.scope === passwordScope ? passwordEntry.value : '';
  const code = getPairCode(params);
  const introCopy = getIntroCopy(params);

  React.useLayoutEffect(() => {
    if (passwordEntry.scope !== passwordScope) {
      setPasswordEntry({ scope: passwordScope, value: '' });
    }
  }, [passwordEntry.scope, passwordScope]);

  const updateCustomSsid = (value: string): void => {
    const nextSsid = value.trim();
    const nextScope = `manual:${nextSsid}`;
    setCustomSsid(value);
    setPasswordEntry((current) => {
      const currentValue = current.scope === passwordScope ? current.value : '';
      const keepsPendingPassword = !ssid || nextSsid === ssid;
      return { scope: nextScope, value: keepsPendingPassword ? currentValue : '' };
    });
  };

  const submit = () => {
    if (!ssid || !password) return;
    const provisioningAttemptId = getProvisioningAttemptId(params);
    if (provisioningAttemptId) {
      putPairingWifiPassword(provisioningAttemptId, password);
    }
    setPasswordEntry({ scope: passwordScope, value: '' });
    setVisible(false);
    navigation.navigate(ROUTES.PairConnectingScreen, {
      ...(params ?? {}),
      ssid,
      code,
    });
  };

  return (
    <DeviceShell title={manualSsid ? 'Network name' : ssid} onBack={() => navigation.navigate(ROUTES.PairWifiScreen, withoutPassword(params))}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text style={styles.intro}>
          {introCopy}
        </Text>
      </Box>
      {manualSsid ? (
        <Box paddingHorizontal={16} paddingTop={18}>
          <Box style={styles.pwCard}>
            <Text fontWeight="600" style={styles.pwLabel}>Network name</Text>
            <TextInput
              value={customSsid}
              onChangeText={updateCustomSsid}
              placeholder={t('Wi-Fi network name')}
              style={styles.passwordInput}
              accessibilityLabel={t('Wi-Fi network name')}
              autoCapitalize="none"
            />
          </Box>
        </Box>
      ) : null}
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.pwCard}>
          <Text fontWeight="600" style={styles.pwLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={(value) => setPasswordEntry({ scope: passwordScope, value })}
            placeholder={t('Wi-Fi password')}
            secureTextEntry={!visible}
            style={styles.passwordInput}
            accessibilityLabel={t('Wi-Fi password')}
          />
        </Box>
      </Box>
      <TouchableOpacity
        style={styles.showRow}
        onPress={() => setVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={visible ? t('Hide Wi-Fi password') : t('Show Wi-Fi password')}
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
        <DeviceBigBtn onClick={submit} disabled={!ssid || !password}>Connect Robot</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

function getPairCode(params: Props['route']['params']): string | undefined {
  if (!params || !('code' in params) || typeof params.code !== 'string') return undefined;
  return params.code;
}

function getProvisioningAttemptId(params: Props['route']['params']): string | undefined {
  if (!params || !('provisioningAttemptId' in params) || typeof params.provisioningAttemptId !== 'string') return undefined;
  return params.provisioningAttemptId;
}

function getIntroCopy(params: Props['route']['params']): string {
  if (params?.errorCode === 'WIFI_PASSWORD_EXPIRED') {
    return 'Wi-Fi password expired. Enter it again to continue.';
  }
  return "Enter the Wi-Fi password. Robot will remember it — your child won't need to.";
}

function withoutPassword(params: Props['route']['params']): RootStackParamList['PairWifiScreen'] {
  if (!params) return undefined;
  const { deviceId, serialNumber, provisioningAttemptId, code, bleDeviceId, provisioningTransport } = params;
  return { deviceId, serialNumber, provisioningAttemptId, code, bleDeviceId, provisioningTransport };
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
