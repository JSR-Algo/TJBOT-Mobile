import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import IntroFrame from '../components/IntroFrame';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroCelebrateScreen'>;

const BUDDIES = ['🐱', '🐶', '🐰'] as const;

export default function IntroCelebrateScreen({ navigation }: Props) {
  return (
    <IntroFrame
      navigation={navigation}
      idx={3}
      prev={ROUTES.IntroRetryScreen}
      next={ROUTES.TrustScreen}
      bg="#FFF8E1"
      kicker="How it works · 4"
      title="Small wins, every day"
      body="Each lesson is short and ends with a celebration. Built for 3–5 minutes a day."
      illo={(
        <Box style={styles.illoWrap} flexDirection="row" alignItems="center" justifyContent="center" gap={10}>
          {BUDDIES.map((e, i) => (
            <Box key={i} style={styles.buddyCard} alignItems="center" justifyContent="center">
              <Text style={{ fontSize: 32 }}>{e}</Text>
            </Box>
          ))}
        </Box>
      )}
    />
  );
}

const styles = StyleSheet.create({
  illoWrap: { width: 240, height: 170 },
  buddyCard: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#fff', borderWidth: 3, borderColor: '#FF6F61', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
});
