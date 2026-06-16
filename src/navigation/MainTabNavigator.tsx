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
          tabBarActiveTintColor: '#4ECDC4',
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
          tabBarLabelStyle: styles.tabBarLabel,
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
                title: screen.title,
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
    height: 64,
    borderTopWidth: 0,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    shadowColor: '#A98F77',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 6,
  },
  tabBarItem: {
    borderRadius: 26,
  },
  tabBarLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 0,
  },
  tabIconContainer: {
    width: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
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
