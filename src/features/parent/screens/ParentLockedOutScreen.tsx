import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import ParentScroll, { PA } from '../components/ParentScroll';
import { clearParentLockout } from '@/services/api/parent.api';
import { useAuth } from '@/contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentLockedOutScreen'>;

export default function ParentLockedOutScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const unlock = async (): Promise<void> => {
    try {
      await clearParentLockout({ targetUserId: user?.id ?? 'parent-1' });
      navigation.replace(ROUTES.ParentSummaryScreen);
    } catch {
      setError('Could not clear the lockout. Try again.');
    }
  };

  return (
    <ParentScroll title="Parent area locked">
      <Box paddingHorizontal={24} paddingTop={40} gap={12}>
        <Text fontWeight="700" style={styles.title}>Parent area locked</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity onPress={unlock} activeOpacity={0.7}>
          <Text style={styles.action}>Unlock with parent account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.SupportScreen, { context: { topic: 'account', errorFamily: 'app_error' } })}
          activeOpacity={0.7}
        >
          <Text style={styles.secondary}>Contact support</Text>
        </TouchableOpacity>
      </Box>
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, color: PA.ink },
  error: { fontSize: 13, color: '#B42318', lineHeight: 20 },
  action: {
    color: '#fff',
    backgroundColor: PA.accent,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
    paddingVertical: 12,
    fontWeight: '600',
  },
  secondary: { color: PA.accent, fontSize: 15, fontWeight: '500', textAlign: 'center', paddingVertical: 10 },
});
