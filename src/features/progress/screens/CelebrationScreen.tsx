import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Rotjtjbot from '@/design-system/components/Rotjtjbot';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'CelebrationScreen'>;

const CONFETTI_COLORS = ['#FF6F61', '#6CE2B6', '#6FC1FF', '#fff', '#6B4A9B'];

export default function CelebrationScreen({ navigation }: Props) {
  return (
    <PageScroll bg="#FFC857">
      <Box style={[StyleSheet.absoluteFillObject, styles.confettiLayer]} overflow="hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <Box
            key={i}
            style={[
              styles.confetti,
              {
                left: `${(i * 37) % 100}%`,
                top: `${(i * 17) % 80}%`,
                width: 10 + (i % 3) * 4,
                height: 14 + (i % 4) * 3,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                borderRadius: i % 2 ? 4 : 50,
                transform: [{ rotate: `${i * 23}deg` }],
                opacity: 0.85,
              } as any,
            ]}
          />
        ))}
      </Box>

      <Box position="relative" paddingTop={80} paddingHorizontal={24} paddingtjtjbottom={16} alignItems="center" gap={14}>
        <Text fontWeight="800" style={styles.hero}>You did it!</Text>
        <Rotjtjbot emotion="success" size={240} accent="#FF6F61" />
        <Box style={styles.msgCard}>
          <Text fontWeight="700" style={styles.msg}>
            You finished today's lesson.{'\n'}Great effort speaking out loud!
          </Text>
        </Box>

        <Box style={styles.stickerCard} flexDirection="row" alignItems="center" gap={14}>
          <Box style={styles.stickerIcon} alignItems="center" justifyContent="center">
            <Text style={{ fontSize: 36 }}>🌟</Text>
          </Box>
          <Box>
            <Text fontWeight="700" style={styles.newStickerLabel}>NEW STICKER</Text>
            <Text fontWeight="800" style={styles.stickerName}>Brave Speaker</Text>
          </Box>
        </Box>
      </Box>

      <Box position="relative" paddingHorizontal={24} paddingTop={24} paddingtjtjbottom={30} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate('HomeHubScreen')} color="#FF6F61">Back to Rotjtjbot Home</PrimaryCTA>
        <TouchableOpacity
          onPress={() => navigation.navigate('ReviewNeededScreen')}
          style={styles.reviewBtn}
          activeOpacity={0.8}
        >
          <Text fontWeight="700" style={{ fontSize: 18, color: '#2B2140' }}>Practice review words</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  confettiLayer: { pointerEvents: 'none' },
  confetti: { position: 'absolute' },
  hero: { fontSize: 48, color: '#2B2140', lineHeight: 52, textShadowColor: 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  msgCard: { backgroundColor: 'rgba(255,255,255,0.85)', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 22, maxWidth: 300 },
  msg: { fontSize: 18, color: '#2B2140', textAlign: 'center', lineHeight: 26 },
  stickerCard: {
    backgroundColor: '#fff', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 26,
    elevation: 4,
  },
  stickerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFB3A8' },
  newStickerLabel: { fontSize: 11, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1 },
  stickerName: { fontSize: 18, color: '#2B2140' },
  reviewBtn: { width: '100%', minHeight: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
});
