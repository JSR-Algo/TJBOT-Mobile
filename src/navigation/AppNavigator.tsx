import React from 'react';
import { CommonActions, createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import { NAVIGATION_LINKING_CONFIG, navigationTargetForDeepLinkUrl } from './linking';
import type { NavigationDeepLinkTarget } from './linking';
import { RootStackNavigator } from './RootStackNavigator';
import type { RootStackParamList } from './routes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function targetRouteIsMounted(target: NavigationDeepLinkTarget): boolean {
  if (!navigationRef.isReady()) return false;
  return navigationRef.getRootState()?.routeNames.includes(target.name) === true;
}

function dispatchDeepLinkTarget(target: NavigationDeepLinkTarget): boolean {
  if (!targetRouteIsMounted(target)) return false;
  navigationRef.dispatch(CommonActions.navigate(target));
  return true;
}

export function AppNavigator(): React.JSX.Element {
  const [pendingDeepLinkTarget, setPendingDeepLinkTarget] = React.useState<NavigationDeepLinkTarget | null>(null);

  const handleDeepLinkUrl = React.useCallback((url: string): void => {
    const target = navigationTargetForDeepLinkUrl(url);
    if (!target) {
      return;
    }
    if (dispatchDeepLinkTarget(target)) {
      setPendingDeepLinkTarget(null);
      return;
    }
    setPendingDeepLinkTarget(target);
  }, []);

  React.useEffect(() => {
    if (!pendingDeepLinkTarget) return undefined;

    if (dispatchDeepLinkTarget(pendingDeepLinkTarget)) {
      setPendingDeepLinkTarget(null);
      return undefined;
    }

    const retry = setInterval(() => {
      if (dispatchDeepLinkTarget(pendingDeepLinkTarget)) {
        setPendingDeepLinkTarget(null);
      }
    }, 100);

    return () => {
      clearInterval(retry);
    };
  }, [pendingDeepLinkTarget]);

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
      <RootStackNavigator pendingDeepLinkTarget={pendingDeepLinkTarget} />
    </NavigationContainer>
  );
}
