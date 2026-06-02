import React from 'react';
import { CommonActions, createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import { NAVIGATION_LINKING_CONFIG, navigationTargetForDeepLinkUrl, shouldHandleDeepLinkManually } from './linking';
import type { NavigationDeepLinkTarget } from './linking';
import { RootStackNavigator } from './RootStackNavigator';
import type { RootStackParamList } from './routes';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  const [pendingDeepLinkTarget, setPendingDeepLinkTarget] = React.useState<NavigationDeepLinkTarget | null>(null);

  const handleDeepLinkUrl = React.useCallback((url: string): void => {
    if (!shouldHandleDeepLinkManually(url)) {
      return;
    }
    const target = navigationTargetForDeepLinkUrl(url);
    if (!target) {
      return;
    }
    setPendingDeepLinkTarget(target);
    if (navigationRef.isReady()) {
      navigationRef.dispatch(CommonActions.navigate(target));
    }
  }, []);

  React.useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLinkUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLinkUrl]);

  React.useEffect(() => {
    let active = true;

    async function readInitialUrl(): Promise<void> {
      const url = await Linking.getInitialURL();
      if (active && url) {
        handleDeepLinkUrl(url);
      }
    }

    void readInitialUrl();

    return () => {
      active = false;
    };
  }, [handleDeepLinkUrl]);

  return (
    <NavigationContainer ref={navigationRef} linking={NAVIGATION_LINKING_CONFIG}>
      <RootStackNavigator
        pendingDeepLinkTarget={pendingDeepLinkTarget}
        onDeepLinkRouteConsumed={() => setPendingDeepLinkTarget(null)}
      />
    </NavigationContainer>
  );
}
