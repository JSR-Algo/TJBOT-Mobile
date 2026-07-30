import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'CelebrationScreen'>;

const CONFETTI_COLORS = ['#FF6F61', '#6CE2B6', '#6FC1FF', '#fff', '#6B4A9B'];

export default function CelebrationScreen({ navigation }: Props) {
  return (
    <PageScroll bg={referenceColors.goldSoft}>
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
              } satisfies ViewStyle,
            ]}
          />
        ))}
      </Box>

      <Box position="relative" paddingTop={80} paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={14}>
        <Box
          accessible
          accessibilityLabel="Three lesson stars earned"
          flexDirection="row"
          gap={8}
        >
          {[0, 1, 2].map((star) => (
            <Icon key={star} name="Star" size={26} color={referenceColors.gold} strokeWidth={2.5} />
          ))}
        </Box>
        <RobotImage variant="body" size={180} />
        <Text fontWeight="800" style={styles.hero}>You did it!</Text>
        <Text style={styles.msg}>You finished today's lesson. Great effort speaking out loud!</Text>

        <Box style={styles.stickerCard} flexDirection="row" alignItems="center" gap={14}>
          <Box style={styles.stickerIcon} alignItems="center" justifyContent="center">
            <Icon name="Award" size={34} color={referenceColors.primaryDeep} strokeWidth={2.3} />
          </Box>
          <Box>
            <Text fontWeight="700" style={styles.newStickerLabel}>NEW STICKER</Text>
            <Text fontWeight="800" style={styles.stickerName}>Brave Speaker</Text>
          </Box>
        </Box>
      </Box>

      <Box position="relative" paddingHorizontal={24} paddingTop={24} paddingBottom={30} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color={referenceColors.primary}>
          Back to Robot Home
        </PrimaryCTA>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)}
          style={styles.reviewBtn}
          activeOpacity={0.8}
        >
          <Text fontWeight="700" style={{ fontSize: 18, color: referenceColors.ink }}>Practice review words</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  confettiLayer: { pointerEvents: 'none' },
  confetti: { position: 'absolute' },
  hero: { fontSize: 48, color: referenceColors.ink, lineHeight: 52, textShadowColor: 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  msgCard: { backgroundColor: 'rgba(255,255,255,0.85)', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 22, maxWidth: 300 },
  msg: { fontSize: 18, color: referenceColors.ink, textAlign: 'center', lineHeight: 26 },
  stickerCard: {
    backgroundColor: referenceColors.card, borderColor: referenceColors.line, borderWidth: 1,
    borderRadius: 24, paddingVertical: 14, paddingHorizontal: 18, ...referenceShadow.card,
  },
  stickerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: referenceColors.primarySoft },
  newStickerLabel: { fontSize: 11, color: referenceColors.inkSoft, textTransform: 'uppercase', letterSpacing: 1 },
  stickerName: { fontSize: 18, color: referenceColors.ink },
  reviewBtn: { width: '100%', minHeight: 56, borderRadius: 16, backgroundColor: referenceColors.cardSoft, alignItems: 'center', justifyContent: 'center' },
});
