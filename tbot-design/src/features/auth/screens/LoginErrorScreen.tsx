import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginErrorScreen'>;

export default function LoginErrorScreen({ navigation }: Props) {
  return (
    <OnbShell title="Sign in" onBack={() => navigation.navigate('LoginScreen')}>
      <Box paddingHorizontal={24} paddingTop={30} alignItems="center">
        <Box style={styles.iconWrap}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={OB.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={10} />
            <Path d="M12 8v4M12 16h.01" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.title}>We couldn't sign you in</Text>
        <Text style={styles.sub}>
          Email or password didn't match. Try again, or reset your password.
        </Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} gap={8}>
        <Box style={[styles.inputWrap, { borderColor: OB.danger }]} flexDirection="row" alignItems="center" gap={10}>
          <ErrorIcon />
          <TextInput
            defaultValue="parent@example.com"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={OB.ink3}
          />
        </Box>
        <Box style={[styles.inputWrap, { borderColor: OB.danger }]} flexDirection="row" alignItems="center" gap={10}>
          <ErrorIcon />
          <TextInput
            defaultValue="••••••••"
            style={styles.input}
            secureTextEntry
            placeholderTextColor={OB.ink3}
          />
        </Box>
        <Text style={styles.errorMsg}>Email or password is incorrect.</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <OnbBigBtn onClick={() => navigation.navigate('ChildProfileScreen')}>Try again</OnbBigBtn>
        <OnbBigBtn secondary onClick={() => navigation.navigate('LoginScreen')}>Reset password</OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

function ErrorIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={OB.danger} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M12 8v4M12 16h.01" />
      <Circle cx={12} cy={12} r={10} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: OB.dangerSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 20, color: OB.ink, textAlign: 'center', marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21, textAlign: 'center' },
  inputWrap: {
    backgroundColor: OB.card, borderWidth: 1, borderRadius: 10, padding: 14,
  },
  input: { flex: 1, fontSize: 15, color: OB.ink },
  errorMsg: { fontSize: 13, color: OB.danger, paddingTop: 4 },
});
