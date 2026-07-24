import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';
import ScreenShell from '@/components/ScreenShell';
import { useAppLanguage } from '@/services/i18n/i18n';
import type { HomeChild, HomeLesson } from '@/services/api/home.api';
import { referenceColors } from '@/design-system/referenceTheme';

const COLORS = {
  background: '#E0F7FA',
  card: '#FFFDF9',
  foreground: '#2D3436',
  muted: '#6B7A82',
  primary: referenceColors.primary,
  secondary: referenceColors.secondary,
  warning: '#FFF9E5',
} as const;

const ROBOT_IMAGE =
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/rUBzdkNVC01.png';

type MultiChildProps = {
  children: HomeChild[];
  onContinue: (childId: string) => void;
  onAddChild: () => void;
};

export function HomeMultiChildState({
  children,
  onContinue,
  onAddChild,
}: MultiChildProps): React.JSX.Element {
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [selectedChildId, setSelectedChildId] = React.useState<string | null>(
    children[0]?.id ?? null,
  );

  return (
    <ScreenShell bg={COLORS.background} gradient={false}>
      <ScrollView
        contentContainerStyle={[styles.pickerScene, { paddingTop: Math.max(insets.top, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        <Box style={styles.pickerCard}>
          <Text i18n={false} fontWeight="800" style={styles.pickerTitle}>
            {t('Pick a child')}
          </Text>
          <Text i18n={false} fontWeight="700" style={styles.pickerSubtitle}>
            {t('Continue learning with TeeBot')}
          </Text>

          <Box style={styles.childList}>
            {children.map((child, index) => {
              const selected = child.id === selectedChildId;
              return (
                <TouchableOpacity
                  key={child.id}
                  testID={`homeChildOption-${child.id}`}
                  style={[styles.childOption, selected ? styles.childOptionSelected : null]}
                  onPress={() => setSelectedChildId(child.id)}
                  accessibilityRole="button"
                  accessibilityLabel={child.name}
                  accessibilityState={{ selected }}
                >
                  <Box
                    style={[
                      styles.childAvatar,
                      index % 2 === 0 ? styles.childAvatarPrimary : styles.childAvatarSecondary,
                    ]}
                  >
                    <Text i18n={false} fontWeight="800" style={styles.childInitial}>
                      {child.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </Box>
                  <Box flex={1}>
                    <Text i18n={false} fontWeight="800" style={styles.childName}>
                      {child.name}
                    </Text>
                    <Text i18n={false} fontWeight="700" style={styles.childMeta}>
                      {child.streakDays > 0
                        ? `${child.streakDays} ${t('day streak')}`
                        : t('Ready to begin')}
                    </Text>
                  </Box>
                  <Icon name="ChevronRight" size={22} color={COLORS.muted} />
                </TouchableOpacity>
              );
            })}
          </Box>

          <TouchableOpacity
            testID="homeAddChild"
            style={styles.addChildButton}
            onPress={onAddChild}
            accessibilityRole="button"
            accessibilityLabel={t('Add a child')}
          >
            <Icon name="Plus" size={24} color={COLORS.primary} />
            <Text i18n={false} fontWeight="800" style={styles.addChildCopy}>
              {t('Add a child')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="homeContinueChild"
            style={[styles.continueButton, !selectedChildId ? styles.disabledButton : null]}
            disabled={!selectedChildId}
            onPress={() => selectedChildId && onContinue(selectedChildId)}
            accessibilityRole="button"
            accessibilityLabel={t('Continue learning')}
          >
            <Text i18n={false} fontWeight="800" style={styles.continueCopy}>
              {t('Continue learning')}
            </Text>
          </TouchableOpacity>
        </Box>
      </ScrollView>
    </ScreenShell>
  );
}

type StreakLostProps = {
  childName: string | null;
  lesson: HomeLesson | null;
  wordsLearnedThisWeek: number;
  onStartLesson: () => void;
  onBrowseLessons: () => void;
};

export function HomeStreakLostState({
  childName,
  lesson,
  wordsLearnedThisWeek,
  onStartLesson,
  onBrowseLessons,
}: StreakLostProps): React.JSX.Element {
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();

  return (
    <ScreenShell bg={COLORS.background} gradient={false}>
      <ScrollView
        contentContainerStyle={[styles.streakScene, { paddingTop: Math.max(insets.top, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        <Box style={styles.streakHeader}>
          <Text i18n={false} fontWeight="800" style={styles.streakGreeting}>
            {childName ? `${t('Hi')}, ${childName}!` : t('Hi, friend!')}
          </Text>
        </Box>

        <Image source={{ uri: ROBOT_IMAGE }} style={styles.streakRobot} resizeMode="contain" />

        <Box testID="homeStreakLostCard" style={styles.streakLostCard}>
          <Box style={styles.streakIcon}>
            <Icon name="Flame" size={24} color={COLORS.muted} />
          </Box>
          <Box flex={1}>
            <Text i18n={false} fontWeight="800" style={styles.streakLostTitle}>
              {t("Let's start a fresh streak today")}
            </Text>
          </Box>
        </Box>

        <Box style={styles.lessonCard}>
          <Text i18n={false} fontWeight="800" style={styles.sectionLabel}>
            {t("Today's lesson")}
          </Text>
          <Text i18n={false} fontWeight="800" style={styles.lessonTitle}>
            {lesson?.title ?? t('No lesson is assigned yet')}
          </Text>
          {lesson && lesson.focusItems.length > 0 ? (
            <Text i18n={false} fontWeight="700" style={styles.lessonMeta}>
              {`${lesson.focusItems.length} ${t('words')}`}
            </Text>
          ) : null}
          <TouchableOpacity
            testID="homeStreakLessonCta"
            style={styles.lessonButton}
            onPress={lesson ? onStartLesson : onBrowseLessons}
            accessibilityRole="button"
            accessibilityLabel={lesson ? t("Start Today's Lesson") : t('Browse lessons')}
          >
            <Icon name={lesson ? 'Play' : 'Library'} size={20} color="#FFFFFF" />
            <Text i18n={false} fontWeight="800" style={styles.lessonButtonCopy}>
              {lesson ? t("Start Today's Lesson") : t('Browse lessons')}
            </Text>
          </TouchableOpacity>
        </Box>

        <Box style={styles.weekCard}>
          <Text i18n={false} fontWeight="800" style={styles.sectionLabel}>
            {t('This week')}
          </Text>
          <Text i18n={false} fontWeight="800" style={styles.weekValue}>
            {`${wordsLearnedThisWeek} ${t('words')}`}
          </Text>
        </Box>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  pickerScene: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  pickerCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: 'rgba(255,111,107,0.16)',
    borderRadius: 48,
    borderWidth: 1,
    elevation: 8,
    paddingHorizontal: 28,
    paddingVertical: 40,
    shadowColor: COLORS.foreground,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  pickerTitle: {
    color: COLORS.foreground,
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 8,
  },
  pickerSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  childList: { gap: 14, width: '100%' },
  childOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(235,220,199,0.65)',
    borderRadius: 34,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 16,
    minHeight: 92,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  childOptionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  childAvatar: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  childAvatarPrimary: { backgroundColor: COLORS.primary },
  childAvatarSecondary: { backgroundColor: COLORS.secondary },
  childInitial: { color: '#FFFFFF', fontSize: 22, lineHeight: 28 },
  childName: { color: COLORS.foreground, fontSize: 18, lineHeight: 24 },
  childMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  addChildButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,111,107,0.4)',
    borderRadius: 32,
    borderStyle: 'dashed',
    borderWidth: 2,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 68,
    width: '100%',
  },
  addChildCopy: { color: COLORS.primary, fontSize: 18, lineHeight: 24 },
  continueButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 32,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 72,
    width: '100%',
  },
  disabledButton: { opacity: 0.45 },
  continueCopy: { color: '#FFFFFF', fontSize: 22, lineHeight: 28 },
  streakScene: {
    alignItems: 'center',
    flexGrow: 1,
    gap: 20,
    paddingBottom: 120,
    paddingHorizontal: 24,
  },
  streakHeader: { alignItems: 'flex-start', width: '100%' },
  streakGreeting: { color: COLORS.foreground, fontSize: 28, lineHeight: 34 },
  streakRobot: { height: 220, width: 220 },
  streakLostCard: {
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    borderColor: 'rgba(255,111,107,0.12)',
    borderRadius: 32,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    width: '100%',
  },
  streakIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  streakLostTitle: { color: COLORS.foreground, fontSize: 18, lineHeight: 24 },
  lessonCard: {
    backgroundColor: COLORS.card,
    borderColor: 'rgba(235,220,199,0.4)',
    borderRadius: 36,
    borderWidth: 1,
    gap: 8,
    padding: 24,
    width: '100%',
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  lessonTitle: { color: COLORS.foreground, fontSize: 24, lineHeight: 30 },
  lessonMeta: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  lessonButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 62,
  },
  lessonButtonCopy: { color: '#FFFFFF', fontSize: 18, lineHeight: 24 },
  weekCard: {
    backgroundColor: COLORS.card,
    borderColor: 'rgba(235,220,199,0.4)',
    borderRadius: 36,
    borderWidth: 1,
    gap: 8,
    padding: 24,
    width: '100%',
  },
  weekValue: { color: COLORS.secondary, fontSize: 34, lineHeight: 40 },
});
