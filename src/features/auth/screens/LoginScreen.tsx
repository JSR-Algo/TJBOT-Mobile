import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAuth } from '@/contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginScreen'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, signup, isLoading } = useAuth();
  const [mode, setMode] = React.useState<'signup' | 'login'>('signup');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const onSubmit = async (): Promise<void> => {
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, email, password);
      }
      navigation.replace('HomeHubScreen');
    } catch {
      navigation.navigate('LoginErrorScreen');
    }
  };

  return (
    <OnbShell title="Parent account" onBack={() => navigation.navigate('MicAskScreen')}>
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
              onPress={() => setMode(t.id)}
              style={[styles.tab, mode === t.id && styles.tabActive]}
              activeOpacity={0.7}
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
        {/* TODO(POST-PR5-SOCIAL-AUTH): wire Google/Apple OAuth providers */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ChildProfileScreen')}
          style={styles.socialBtn}
          activeOpacity={0.8}
        >
          <GoogleIcon />
          <Text fontWeight="500" style={{ fontSize: 15, color: OB.ink }}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ChildProfileScreen')}
          style={[styles.socialBtn, styles.appleBtn]}
          activeOpacity={0.8}
        >
          <AppleIcon />
          <Text fontWeight="500" style={{ fontSize: 15, color: '#fff' }}>
            Continue with Apple
          </Text>
        </TouchableOpacity>

        <Box flexDirection="row" alignItems="center" gap={10} style={styles.dividerRow}>
          <Box style={styles.dividerLine} />
          <Text style={{ fontSize: 12, color: OB.ink3 }}>or</Text>
          <Box style={styles.dividerLine} />
        </Box>

        <Box gap={8}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={OB.ink3}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={OB.ink3}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={20} paddingtjtjbottom={30} gap={10}>
        <OnbBigBtn onClick={onSubmit}>
          {isLoading ? '…' : mode === 'signup' ? 'Create account' : 'Log in'}
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

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.7 3-4.3 3-7.5z"/>
      <Path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.5-4H3.2v2.6C4.8 19.8 8.1 22 12 22z"/>
      <Path fill="#FBBC05" d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.2C2.4 8.8 2 10.4 2 12s.4 3.2 1.2 4.6L6.5 14z"/>
      <Path fill="#EA4335" d="M12 5.8c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.2 3.2 7.4L6.5 10c.8-2.3 3-4 5.5-4z"/>
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#fff">
      <Path d="M16.4 1.5c-1 .1-2.2.7-2.9 1.6-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.4.7-.8 1.1-1.9 1-3.1zm3.3 6.7c-.1.1-1.7 1-1.7 3 0 2.3 2 3.1 2.1 3.1 0 .1-.3 1.2-1.1 2.4-.6 1-1.3 2-2.4 2-1 0-1.4-.7-2.6-.7-1.3 0-1.7.7-2.6.7-1.1 0-1.9-1-2.6-2C7.5 14.7 6.4 11 7.7 8.5c.6-1.2 1.8-2 3.1-2 1 0 2 .7 2.6.7.6 0 1.7-.8 2.9-.7.5 0 2 .2 2.9 1.7z"/>
    </Svg>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, margintjtjbottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21 },
  tabBar: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  socialBtn: {
    width: '100%', minHeight: 48, borderRadius: 10,
    borderWidth: 1, borderColor: OB.hair, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  appleBtn: { backgroundColor: '#000', borderWidth: 0 },
  dividerRow: { paddingVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: OB.hair },
  input: {
    width: '100%', padding: 14, borderWidth: 1, borderColor: OB.hair,
    borderRadius: 10, fontSize: 15, backgroundColor: '#fff', color: OB.ink,
  },
  legal: { textAlign: 'center', fontSize: 11, color: OB.ink3, lineHeight: 16 },
});
