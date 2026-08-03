import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import type { FeatureStackScreen } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import {
  MAIN_TAB_SCREENS,
  PROTECTED_DEFAULT_ROUTE,
  PROTECTED_MOUNTED_MODAL_SCREENS,
  PROTECTED_MOUNTED_STACK_SCREENS,
} from './featureRegistry';
import { MODAL_STACK_SCREEN_OPTIONS, PROTECTED_STACK_SCREEN_OPTIONS } from './options';

const Stack = createNativeStackNavigator<RootStackParamList>();
const FeatureScreen = Stack.Screen as React.ComponentType<{
  name: keyof RootStackParamList;
  component: React.ElementType;
  initialParams?: RootStackParamList[keyof RootStackParamList];
}>;

type Props = {
  initialRouteName?: keyof RootStackParamList;
  initialRouteParams?: RootStackParamList[keyof RootStackParamList];
};

export function ModalNavigator({ initialRouteName = PROTECTED_DEFAULT_ROUTE, initialRouteParams }: Props): React.JSX.Element {
  const renderTabHostScreen = (screen: FeatureStackScreen): React.JSX.Element =>
    renderStackScreen(screen, initialRouteName, initialRouteParams);
  const renderProtectedScreen = (screen: FeatureStackScreen): React.JSX.Element =>
    renderStackScreen(screen, initialRouteName, initialRouteParams);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      layout={({ children, navigation, state }) => (
        <MainTabNavigator navigation={navigation} routeName={state.routes[state.index].name}>
          {children}
        </MainTabNavigator>
      )}
      screenOptions={PROTECTED_STACK_SCREEN_OPTIONS}
    >
      {MAIN_TAB_SCREENS.map(renderTabHostScreen)}
      {PROTECTED_MOUNTED_STACK_SCREENS.map(renderProtectedScreen)}

      <Stack.Group screenOptions={MODAL_STACK_SCREEN_OPTIONS}>
        {PROTECTED_MOUNTED_MODAL_SCREENS.map(renderProtectedScreen)}
      </Stack.Group>
    </Stack.Navigator>
  );
}

function initialParamsFor(
  screenName: keyof RootStackParamList,
  initialRouteName: keyof RootStackParamList,
  initialRouteParams: RootStackParamList[keyof RootStackParamList] | undefined,
): RootStackParamList[keyof RootStackParamList] | undefined {
  return screenName === initialRouteName ? initialRouteParams : undefined;
}

function renderStackScreen(
  screen: FeatureStackScreen,
  initialRouteName: keyof RootStackParamList,
  initialRouteParams: RootStackParamList[keyof RootStackParamList] | undefined,
): React.JSX.Element {
  return <FeatureScreen key={screen.name} name={screen.name} component={screen.component} initialParams={initialParamsFor(screen.name, initialRouteName, initialRouteParams)} />;
}
