import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { referenceImages } from '@/design-system/referenceTheme';
import { useHomeState } from '../hooks/useHomeState';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeHubScreen'>;

const SLEEK = {
  background: '#FAF5EB',
  foreground: '#2D3436',
  muted: '#636E72',
  primary: '#FF6B6B',
  border: '#EBDCC7',
  card: '#FFFFFF',
} as const;

// Exported directly from Sleek Home Hub v8. These are the original design
// assets, intentionally loaded as HTTPS images rather than regenerated icons.
const SLEEK_ASSETS = {
  robotHead: 'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/ai/head-transparent-vLXmmtgCXxT.png',
  course: 'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/dRwsfXpz3xq.png',
  review: 'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/oZRoaunYiL8.png',
  progress: 'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/NpznCUpnBV4.png',
} as const;

export const HOME_HUB_ROBOT_STAGE_TOP_PADDING = 32;
export const HOME_HUB_SECONDARY_ROW_BOTTOM = 130;
export const HOME_HUB_PRIMARY_CTA_BOTTOM = 28;

type QuickActionProps = {
  imageUri: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

function SleekQuickAction({ imageUri, label, accessibilityLabel, onPress }: QuickActionProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Box style={styles.quickActionImageWrap}>
        <Image source={{ uri: imageUri }} style={styles.quickActionImage} resizeMode="contain" />
      </Box>
      <Text i18n={false} fontWeight="800" style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeHubScreen({ navigation }: Props): React.JSX.Element {
  const { cfg, isLoading } = useHomeState();

  if (isLoading) {
    return (
      <ScreenShell bg={SLEEK.background} gradient={false}>
        <Box flex={1} alignItems="center" justifyContent="center">
          <Image source={{ uri: SLEEK_ASSETS.robotHead }} style={styles.loadingRobot} accessibilityIgnoresInvertColors />
        </Box>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell bg={SLEEK.background} gradient={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Box style={styles.canvas}>
          <Box style={styles.header} flexDirection="row" alignItems="center" justifyContent="space-between">
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Image source={referenceImages.robotHead} style={styles.headerAvatar} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
              accessibilityRole="button"
              accessibilityLabel="Open parent settings"
            >
              <Text i18n={false} fontWeight="800" style={styles.settingsGlyph}>⚙</Text>
            </TouchableOpacity>
          </Box>

          <Text i18n={false} fontWeight="800" style={styles.greeting}>Hi, friend!</Text>

          <Box style={styles.readyPill} flexDirection="row" alignItems="center" gap={8}>
            <Box style={styles.readyDot} />
            <Text i18n={false} fontWeight="800" style={styles.readyCopy}>
              {cfg.chip?.text ?? "Today's lesson is ready!"}
            </Text>
          </Box>

          <TouchableOpacity
            style={styles.robotStage}
            onPress={() => navigation.navigate(ROUTES.RobotCompanionScreen, {
              lessonId: 'w01-d01-barn-say-it',
              ageBand: '4-6',
              autoStartVoice: true,
            })}
            accessibilityRole="button"
            accessibilityLabel="Talk to Robot before barn lesson"
          >
            <Box style={styles.haloLarge} />
            <Box style={styles.haloMid} />
            <Box style={styles.haloSmall} />
            <Image
              source={{ uri: SLEEK_ASSETS.robotHead }}
              style={styles.robotHead}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </TouchableOpacity>

          <Box style={styles.robotCopy}>
            <Text i18n={false} fontWeight="800" style={styles.robotName}>Robot</Text>
            <Text i18n={false} fontWeight="800" style={styles.robotHint}>TAP ME TO SAY HI</Text>
          </Box>

          <TouchableOpacity
            onPress={() => navigateHomeCtaTarget(navigation, cfg.ctaTarget)}
            style={[styles.primaryCta, !cfg.ctaEnabled && styles.primaryCtaDisabled]}
            disabled={!cfg.ctaEnabled}
            testID="homePrimaryCta"
            accessibilityRole="button"
            accessibilityLabel={cfg.ctaLabel}
          >
            <Text i18n={false} fontWeight="800" style={styles.primaryCtaText}>{cfg.ctaLabel}</Text>
          </TouchableOpacity>

          <Box style={styles.quickActions}>
            <SleekQuickAction
              imageUri={SLEEK_ASSETS.course}
              label="Course"
              accessibilityLabel="Browse lessons"
              onPress={() => navigation.navigate(ROUTES.LessonPickScreen, { ageBand: '4-6' })}
            />
            <SleekQuickAction
              imageUri={SLEEK_ASSETS.review}
              label="Review"
              accessibilityLabel="Review words"
              onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)}
            />
            <SleekQuickAction
              imageUri={SLEEK_ASSETS.progress}
              label="Progress"
              accessibilityLabel="View progress"
              onPress={() => navigation.navigate(ROUTES.TodayProgressScreen)}
            />
          </Box>
        </Box>
      </ScrollView>
    </ScreenShell>
  );
}

function navigateHomeCtaTarget(
  navigation: Props['navigation'],
  target: keyof RootStackParamList,
): void {
  if (target === ROUTES.LessonReadyScreen) {
    navigation.navigate(ROUTES.LessonReadyScreen);
    return;
  }
  if (target === ROUTES.TodayProgressScreen) {
    navigation.navigate(ROUTES.TodayProgressScreen);
    return;
  }
  if (target === ROUTES.ParentSummaryScreen) {
    navigation.navigate(ROUTES.ParentSummaryScreen);
    return;
  }
  if (target === ROUTES.DeviceOverviewScreen) {
    navigation.navigate(ROUTES.DeviceOverviewScreen);
    return;
  }
  navigation.navigate(ROUTES.HomeHubScreen);
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingBottom: HOME_HUB_SECONDARY_ROW_BOTTOM,
  },
  canvas: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  loadingRobot: {
    width: 224,
    height: 224,
  },
  header: {
    height: 52,
    marginBottom: 16,
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: SLEEK.card,
    borderWidth: 1,
    borderColor: 'rgba(235,220,199,0.45)',
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  settingsGlyph: {
    color: SLEEK.foreground,
    fontSize: 25,
    lineHeight: 28,
  },
  greeting: {
    color: SLEEK.foreground,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 16,
  },
  readyPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderColor: 'rgba(255,107,107,0.2)',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 26,
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SLEEK.primary,
  },
  readyCopy: {
    color: 'rgba(45,52,54,0.8)',
    fontSize: 14,
    lineHeight: 18,
  },
  robotStage: {
    width: 288,
    height: 288,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: HOME_HUB_ROBOT_STAGE_TOP_PADDING,
    marginBottom: 20,
  },
  haloLarge: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.05)',
  },
  haloMid: {
    position: 'absolute',
    width: 288,
    height: 288,
    borderRadius: 144,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.1)',
  },
  haloSmall: {
    position: 'absolute',
    width: 316,
    height: 316,
    borderRadius: 158,
    backgroundColor: 'rgba(255,107,107,0.05)',
  },
  robotHead: {
    zIndex: 1,
    width: 224,
    height: 224,
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  robotCopy: {
    alignItems: 'center',
    marginBottom: 32,
  },
  robotName: {
    color: SLEEK.foreground,
    fontSize: 36,
    lineHeight: 42,
    marginBottom: 4,
  },
  robotHint: {
    color: SLEEK.muted,
    fontSize: 14,
    letterSpacing: 1,
    lineHeight: 18,
  },
  primaryCta: {
    alignItems: 'center',
    backgroundColor: SLEEK.primary,
    borderRadius: 40,
    justifyContent: 'center',
    minHeight: 76,
    marginBottom: HOME_HUB_PRIMARY_CTA_BOTTOM,
    shadowColor: SLEEK.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryCtaDisabled: {
    opacity: 0.48,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 29,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: SLEEK.card,
    borderColor: 'rgba(235,220,199,0.45)',
    borderRadius: 32,
    borderWidth: 1,
    flex: 1,
    minHeight: 138,
    justifyContent: 'center',
    padding: 16,
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionImageWrap: {
    alignItems: 'center',
    backgroundColor: SLEEK.card,
    borderColor: 'rgba(235,220,199,0.25)',
    borderRadius: 18,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: 8,
    width: 56,
  },
  quickActionImage: {
    height: 44,
    width: 44,
  },
  quickActionLabel: {
    color: SLEEK.foreground,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
