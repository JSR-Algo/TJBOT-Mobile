import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import type { FeatureTabName, FeatureTabScreen } from './types';
import { DEFAULT_MAIN_TAB_NAME, MAIN_TAB_SCREENS } from './featureRegistry';
import { OfflineBanner } from '@/components/OfflineBanner';
import { referenceColors, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

type MainTabParamList = Record<FeatureTabName, undefined>;

const Tab = createBottomTabNavigator<MainTabParamList>();

type MainTabIconProps = {
  Icon: FeatureTabScreen['tabIcon'];
  color: string;
  focused: boolean;
};

export function MainTabIcon({ Icon, color, focused }: MainTabIconProps): React.JSX.Element {
  return (
    <View
      testID="mainTabIconContainer"
      style={[styles.tabIconContainer, focused ? styles.tabIconContainerFocused : styles.tabIconContainerIdle]}
    >
      <Icon size={22} color={color} strokeWidth={focused ? 2.8 : 2.2} />
    </View>
  );
}

function createTabRouteScreen<RouteName extends keyof RootStackParamList & string>(
  screen: FeatureTabScreen<RouteName>,
  initialRouteName: keyof RootStackParamList | undefined,
  initialRouteParams: RootStackParamList[keyof RootStackParamList] | undefined,
): () => React.JSX.Element {
  return function TabRouteScreen(): React.JSX.Element {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, RouteName>>();
    const route = {
      key: screen.name,
      name: screen.name,
      params: screen.name === initialRouteName ? initialRouteParams : undefined,
    };
    const Component = screen.component;
    return <Component navigation={navigation} route={route} />;
  };
}

type Props = {
  initialTabName?: FeatureTabName;
  initialRouteName?: keyof RootStackParamList;
  initialRouteParams?: RootStackParamList[keyof RootStackParamList];
};

export function MainTabNavigator({
  initialTabName = DEFAULT_MAIN_TAB_NAME,
  initialRouteName,
  initialRouteParams,
}: Props): React.JSX.Element {
  const { language } = useAppLanguage();
  const tabRoutes = MAIN_TAB_SCREENS.map(screen => ({
    screen,
    component: createTabRouteScreen(screen, initialRouteName, initialRouteParams),
  }));

  return (
    <View style={styles.root} testID="mainTabs">
      <OfflineBanner />
      <Tab.Navigator
        initialRouteName={initialTabName}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: referenceColors.primary,
          tabBarInactiveTintColor: referenceColors.inkMuted,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        {tabRoutes.map(({ screen, component: Component }) => {
          const Icon = screen.tabIcon;
          return (
            <Tab.Screen
              key={screen.tabName}
              name={screen.tabName}
              component={Component}
              options={{
                title: translateCopy(screen.title, { locale: language }),
                tabBarButtonTestID: screen.tabBarButtonTestID,
                tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                  <MainTabIcon Icon={Icon} color={color} focused={focused} />
                ),
              }}
            />
          );
        })}
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 18,
    height: 78,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderTopWidth: 0,
    borderRadius: referenceRadii.nav,
    backgroundColor: referenceColors.card,
    borderWidth: 1,
    borderColor: referenceColors.line,
    ...referenceShadow.nav,
  },
  tabBarItem: {
    borderRadius: 24,
  },
  tabBarLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  tabIconContainer: {
    width: 42,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
  },
  tabIconContainerFocused: {
    backgroundColor: referenceColors.primarySoft,
    borderColor: 'rgba(255,107,111,0.18)',
  },
  tabIconContainerIdle: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});
