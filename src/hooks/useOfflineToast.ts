import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { emitToast } from '../services/toast/toastBus';

/**
 * Global connectivity watcher: raises a single toast whenever the device drops
 * offline (or opens already-offline). This guides the user app-wide — including
 * the auth/onboarding flow, where the persistent <OfflineBanner /> isn't mounted
 * — so a failed sign-in/sign-up never looks like "nothing happened".
 *
 * Complements:
 *   - <OfflineBanner /> (persistent ambient indicator on the main tabs)
 *   - the HTTP interceptor's NETWORK_ERROR toast (per failed request)
 */
export function useOfflineToast(): void {
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected ?? true);
      // Only announce the online -> offline edge (NetInfo emits current state on
      // subscribe, so this also covers "opened while offline").
      if (offline && !wasOffline.current) {
        emitToast({
          severity: 'warning',
          text: "You're offline. Connect to the internet to continue.",
        });
      }
      wasOffline.current = offline;
    });
    return () => unsubscribe();
  }, []);
}
