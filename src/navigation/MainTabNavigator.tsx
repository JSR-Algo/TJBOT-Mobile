import React from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/design-system/icons';
import { referenceShadow } from '@/design-system/referenceTheme';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { DEFAULT_MAIN_TAB_NAME, MAIN_TAB_SCREENS } from './featureRegistry';
import { ROUTE_MAP } from './routeMap';
import { ROUTES, type RootStackParamList } from './routes';
import type { FeatureRouteOwner, FeatureTabName } from './types';
import { ChildProfileAvatar } from './ChildProfileAvatar';
import { MainTabIcon, SLEEK_TAB_ICON_SOURCES, SLEEK_TAB_IDLE_ICON_SOURCES } from './SleekTabBarVisuals';

const OWNER_DEFAULT_TAB: Readonly<Partial<Record<FeatureRouteOwner, FeatureTabName>>> = {
  home: 'Home',
  course: 'Library',
  'course-library': 'Library',
  purchase: 'Library',
  'lesson-session': 'Home',
  'lesson-demo': 'Home',
  progress: 'Progress',
  parent: 'Profile',
  device: 'Devices',
  'robot-mgmt': 'Devices',
  fallback: 'Home',
};

const TAB_ROUTE_BY_NAME = new Map(MAIN_TAB_SCREENS.map(screen => [screen.tabName, screen.name] as const));
const TAB_NAME_BY_ROUTE = new Map(MAIN_TAB_SCREENS.map(screen => [screen.name, screen.tabName] as const));
const ROUTE_TAB_OVERRIDES: Readonly<Partial<Record<keyof RootStackParamList, FeatureTabName>>> = {
  [ROUTES.LessonSummaryScreen]: 'Home',
};
const COLORS = {
  background: '#FAF5EB',
  card: '#FFFFFF',
  border: '#EBDCC7',
  ink: '#2D3436',
  muted: '#636E72',
  accent: '#FF6B6B',
  accentSoft: '#FFF0ED',
} as const;

/** Canonical five-item parent-app menu labels (tabName stays typed). */
const BLUEPRINT_TAB_LABELS: Readonly<Record<FeatureTabName, string>> = {
  Home: 'Home',
  Library: 'Library',
  Devices: 'Devices',
  Progress: 'Progress',
  Profile: 'Profile',
};
const TAB_BAR_HORIZONTAL_PADDING = 6;
const TAB_BAR_ITEM_GAP = 1;

type ShellNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList>,
  'canGoBack' | 'goBack' | 'navigate'
>;

type Props = {
  children: React.ReactNode;
  navigation: ShellNavigation;
  routeName: keyof RootStackParamList;
};

export function routeBreadcrumbsFor(routeName: keyof RootStackParamList): readonly (keyof RootStackParamList)[] {
  const breadcrumbs: (keyof RootStackParamList)[] = [];
  const visited = new Set<keyof RootStackParamList>();
  let current: keyof RootStackParamList | undefined = routeName;

  while (current && !visited.has(current)) {
    visited.add(current);
    breadcrumbs.unshift(current);
    current = ROUTE_MAP[current].backTarget;
  }

  if (!breadcrumbs.some(route => TAB_NAME_BY_ROUTE.has(route))) {
    const fallbackTab = OWNER_DEFAULT_TAB[ROUTE_MAP[routeName].feature] ?? DEFAULT_MAIN_TAB_NAME;
    const fallbackRoute = TAB_ROUTE_BY_NAME.get(fallbackTab) ?? ROUTES.HomeHubScreen;
    if (fallbackRoute !== breadcrumbs[0]) breadcrumbs.unshift(fallbackRoute);
  }

  return breadcrumbs;
}

function activeTabFor(routeName: keyof RootStackParamList): FeatureTabName {
  const routeOverride = ROUTE_TAB_OVERRIDES[routeName];
  if (routeOverride) return routeOverride;
  const breadcrumbTab = routeBreadcrumbsFor(routeName)
    .map(route => TAB_NAME_BY_ROUTE.get(route))
    .find((tabName): tabName is FeatureTabName => tabName !== undefined);
  return breadcrumbTab ?? OWNER_DEFAULT_TAB[ROUTE_MAP[routeName].feature] ?? DEFAULT_MAIN_TAB_NAME;
}

export function MainTabNavigator({ children, navigation, routeName }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { language, setLanguage, t } = useAppLanguage();
  const household = useOptionalHousehold();
  const activeTab = activeTabFor(routeName);
  const activeTabIndex = Math.max(
    MAIN_TAB_SCREENS.findIndex(screen => screen.tabName === activeTab),
    0,
  );
  const activeIndicatorIndex = React.useRef(new Animated.Value(activeTabIndex)).current;
  const [tabBarWidth, setTabBarWidth] = React.useState(0);
  const childName = household?.activeChild?.name?.trim() || t('Mia');
  const showBack = !TAB_NAME_BY_ROUTE.has(routeName);
  const showTodayTitle = routeName === ROUTES.HomeHubScreen;
  const showLibraryMascot = routeName === ROUTES.CourseLibraryScreen;
  const tabItemWidth = Math.max(
    (
      tabBarWidth
      - (TAB_BAR_HORIZONTAL_PADDING * 2)
      - (TAB_BAR_ITEM_GAP * (MAIN_TAB_SCREENS.length - 1))
    ) / MAIN_TAB_SCREENS.length,
    0,
  );
  const activeIndicatorTranslateX = activeIndicatorIndex.interpolate({
    inputRange: [0, MAIN_TAB_SCREENS.length - 1],
    outputRange: [0, (tabItemWidth + TAB_BAR_ITEM_GAP) * (MAIN_TAB_SCREENS.length - 1)],
  });

  React.useEffect(() => {
    Animated.spring(activeIndicatorIndex, {
      toValue: activeTabIndex,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [activeIndicatorIndex, activeTabIndex]);

  const navigate = (route: keyof RootStackParamList): void => {
    navigation.navigate(route as never);
  };

  const goBack = (): void => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigate(ROUTE_MAP[routeName].backTarget ?? ROUTES.HomeHubScreen);
  };

  return (
    <View
      accessibilityElementsHidden={!isFocused}
      importantForAccessibility={isFocused ? 'auto' : 'no-hide-descendants'}
      pointerEvents={isFocused ? 'auto' : 'none'}
      style={styles.root}
      testID="mainTabs"
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]} testID="authenticatedAppShellHeader">
        <View style={styles.controlRow}>
          {showBack ? (
            <Pressable
              accessibilityLabel={t('Go back')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              testID="appShellBack"
            >
              <Icon name="ChevronLeft" size={20} color={COLORS.ink} />
            </Pressable>
          ) : null}

          {showTodayTitle ? (
            <View style={styles.todayTitleBlock}>
              <Text style={styles.todayTitle}>{t('Today')}</Text>
              <Text numberOfLines={1} style={styles.todaySubtitle}>
                {translateTemplate("{{name}}'s learning plan", { name: childName }, { locale: language })}
              </Text>
            </View>
          ) : null}

          {showLibraryMascot ? (
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={t('TeeBot')}
              resizeMode="contain"
              source={require('@/assets/mascot/tee-head.png')}
              style={styles.libraryMascot}
            />
          ) : null}

          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel={t('Choose child')}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => navigate(ROUTES.ParentSettingsScreen)}
              style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
              testID="appShellProfile"
            >
              <ChildProfileAvatar accessibilityLabel={t('Child profile')} name={childName} />
              <Text numberOfLines={1} style={styles.profileName}>{childName}</Text>
              <Icon name="ChevronDown" size={14} color={COLORS.muted} />
            </Pressable>
            <Pressable
              accessibilityLabel={language === 'en' ? t('Switch to Vietnamese') : t('Switch to English')}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => void setLanguage(language === 'en' ? 'vi' : 'en')}
              style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}
              testID="appShellLanguage"
            >
              <Icon name="Globe2" size={17} color={COLORS.ink} />
              <Text style={styles.languageText}>{language.toUpperCase()}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t('Settings')}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => navigate(ROUTES.ParentSettingsScreen)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              testID="appShellSettings"
            >
              <Icon name="Settings" size={19} color={COLORS.ink} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.content} testID="authenticatedAppShellContent">
        {children}
      </View>

      <LinearGradient
        accessibilityRole="tablist"
        colors={['rgba(255,255,255,0.97)', 'rgba(255,246,238,0.94)']}
        end={{ x: 1, y: 1 }}
        onLayout={({ nativeEvent }) => setTabBarWidth(nativeEvent.layout.width)}
        start={{ x: 0, y: 0 }}
        style={[styles.tabBar, { marginBottom: Math.max(insets.bottom, 10) }]}
        testID="authenticatedAppShellTabs"
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeTabIndicator,
            {
              opacity: tabItemWidth > 0 ? 1 : 0,
              transform: [{ translateX: activeIndicatorTranslateX }],
              width: tabItemWidth,
            },
          ]}
          testID="activeTabIndicator"
        />
        {MAIN_TAB_SCREENS.map(screen => {
          const selected = screen.tabName === activeTab;
          const TabIcon = screen.tabIcon;
          return (
            <Pressable
              accessibilityLabel={t(BLUEPRINT_TAB_LABELS[screen.tabName])}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={screen.tabName}
              onPress={() => navigate(screen.name)}
              style={({ pressed }) => [
                styles.tabButton,
                pressed && styles.pressed,
              ]}
              testID={screen.tabBarButtonTestID}
            >
              <MainTabIcon
                Icon={TabIcon}
                color={selected ? COLORS.accent : COLORS.muted}
                focused={selected}
                imageSource={SLEEK_TAB_ICON_SOURCES[screen.tabName]}
                idleImageSource={SLEEK_TAB_IDLE_ICON_SOURCES[screen.tabName]}
                tabName={screen.tabName}
              />
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]} numberOfLines={1}>
                {t(BLUEPRINT_TAB_LABELS[screen.tabName])}
              </Text>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.background,
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    paddingHorizontal: 18,
    ...referenceShadow.card,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
  },
  todayTitleBlock: {
    flexShrink: 1,
    justifyContent: 'center',
    minWidth: 102,
  },
  todayTitle: {
    color: '#17191A',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 27,
  },
  todaySubtitle: {
    color: '#797774',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  libraryMascot: {
    height: 40,
    width: 46,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerActions: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    maxWidth: 132,
    minWidth: 92,
    paddingHorizontal: 8,
  },
  profileName: {
    color: COLORS.ink,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  languageButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  languageText: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  tabBar: {
    alignItems: 'stretch',
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
    borderRadius: 34,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 1,
    marginHorizontal: 18,
    paddingBottom: 6,
    paddingHorizontal: 6,
    paddingTop: 6,
    ...referenceShadow.card,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 28,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 2,
    paddingVertical: 4,
    zIndex: 1,
  },
  activeTabIndicator: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 28,
    bottom: 6,
    left: TAB_BAR_HORIZONTAL_PADDING,
    position: 'absolute',
    top: 6,
  },
  tabLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  tabLabelSelected: {
    color: COLORS.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
