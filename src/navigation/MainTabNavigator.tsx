import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import type { FeatureTabName, FeatureTabScreen } from './types';
import { colors, typography } from '@/design-system/tokens/legacy-semantic';
import { DEFAULT_MAIN_TAB_NAME, MAIN_TAB_SCREENS } from './featureRegistry';
import { OfflineBanner } from '@/components/OfflineBanner';
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
      <Icon size={22} color={color} strokeWidth={focused ? 2.75 : 2} />
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
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
          tabBarLabelStyle: { ...typography.caption },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
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
  tabIconContainer: {
    width: 38,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
  },
  tabIconContainerFocused: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tabIconContainerIdle: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});
