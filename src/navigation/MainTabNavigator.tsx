import React from "react";
import { Image, View, StyleSheet, useWindowDimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./routes";
import type { FeatureTabName, FeatureTabScreen } from "./types";
import { DEFAULT_MAIN_TAB_NAME, MAIN_TAB_SCREENS } from "./featureRegistry";
import { OfflineBanner } from "@/components/OfflineBanner";
import { getSleekTabBarLayout } from "@/design-system/sleekHomeLayout";

const SLEEK = {
  foreground: "#2D3436",
  muted: "#636E72",
  primary: "#FF6B6B",
  primarySoft: "rgba(255,107,107,0.1)",
  border: "#EBDCC7",
  card: "#FFFFFF",
} as const;

const SLEEK_TAB_ICONS: Record<FeatureTabName, string> = {
  Home: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/PXjVCPzUvhp.png",
  Devices:
    "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/fQZCerpIKya.png",
  Library:
    "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/OWCzyfe01f8.png",
  Progress:
    "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/NpznCUpnBV4.png",
  Profile:
    "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/VeUK4fwA0aM.png",
};

type MainTabParamList = Record<FeatureTabName, undefined>;

const Tab = createBottomTabNavigator<MainTabParamList>();

type MainTabIconProps = {
  Icon: FeatureTabScreen["tabIcon"];
  color: string;
  focused: boolean;
  imageUri?: string;
  layoutScale?: number;
};

export function MainTabIcon({
  Icon,
  color,
  focused,
  imageUri,
  layoutScale = 1,
}: MainTabIconProps): React.JSX.Element {
  return (
    <View
      testID="mainTabIconContainer"
      style={[
        styles.tabIconContainer,
        {
          width: 32 * layoutScale,
          height: 32 * layoutScale,
          borderRadius: 16 * layoutScale,
        },
        focused ? styles.tabIconContainerFocused : styles.tabIconContainerIdle,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            { width: 28 * layoutScale, height: 28 * layoutScale },
            !focused && styles.sleekTabImageIdle,
          ]}
          resizeMode="contain"
        />
      ) : (
        <Icon
          size={22 * layoutScale}
          color={color}
          strokeWidth={focused ? 2.8 : 2.2}
        />
      )}
    </View>
  );
}

function createTabRouteScreen<
  RouteName extends keyof RootStackParamList & string,
>(
  screen: FeatureTabScreen<RouteName>,
  initialRouteName: keyof RootStackParamList | undefined,
  initialRouteParams: RootStackParamList[keyof RootStackParamList] | undefined,
): () => React.JSX.Element {
  return function TabRouteScreen(): React.JSX.Element {
    const navigation =
      useNavigation<NativeStackNavigationProp<RootStackParamList, RouteName>>();
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
  const { width, height } = useWindowDimensions();
  const tabLayout = getSleekTabBarLayout(width, height);
  const tabRoutes = MAIN_TAB_SCREENS.map((screen) => ({
    screen,
    component: createTabRouteScreen(
      screen,
      initialRouteName,
      initialRouteParams,
    ),
  }));

  return (
    <View style={styles.root} testID="mainTabs">
      <OfflineBanner />
      <Tab.Navigator
        initialRouteName={initialTabName}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "#FAF5EB" },
          tabBarActiveTintColor: SLEEK.primary,
          tabBarInactiveTintColor: SLEEK.muted,
          tabBarStyle: [
            styles.tabBar,
            {
              bottom: tabLayout.bottom,
              borderRadius: 40 * tabLayout.scale,
              height: tabLayout.height,
              paddingBottom: 8 * tabLayout.scale,
              paddingHorizontal: 8 * tabLayout.scale,
              paddingTop: 8 * tabLayout.scale,
              transform: [{ translateX: tabLayout.left }],
              width: tabLayout.width,
            },
          ],
          tabBarItemStyle: { borderRadius: 32 * tabLayout.scale },
          tabBarLabelStyle: [
            styles.tabBarLabel,
            {
              fontSize: 9 * tabLayout.scale,
              lineHeight: 12 * tabLayout.scale,
              marginTop: tabLayout.scale,
            },
          ],
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
                tabBarLabel: screen.title,
                tabBarButtonTestID: screen.tabBarButtonTestID,
                tabBarIcon: ({
                  color,
                  focused,
                }: {
                  color: string;
                  focused: boolean;
                }) => (
                  <MainTabIcon
                    Icon={Icon}
                    color={color}
                    focused={focused}
                    imageUri={SLEEK_TAB_ICONS[screen.tabName]}
                    layoutScale={tabLayout.scale}
                  />
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
  root: { flex: 1, backgroundColor: "#FAF5EB" },
  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    backgroundColor: SLEEK.card,
    borderWidth: 1,
    borderColor: "rgba(235,220,199,0.6)",
    shadowColor: "#2D3436",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  tabBarLabel: {
    fontWeight: "800",
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconContainerFocused: {
    backgroundColor: SLEEK.primarySoft,
  },
  tabIconContainerIdle: {
    backgroundColor: "transparent",
  },
  sleekTabImageIdle: {
    opacity: 0.6,
  },
});
