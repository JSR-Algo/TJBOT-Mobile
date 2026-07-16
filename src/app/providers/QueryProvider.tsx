import React from 'react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { replayRewardSeenQueue } from '@/features/rewards/offline/rewardSeenQueue';
import { appQueryClient } from '@/services/query/queryClient';
import { captureError } from '@/services/observability/sentry';

type Props = { children: React.ReactNode };

export function QueryProvider({ children }: Props) {
  React.useEffect(() => NetInfo.addEventListener(state => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    onlineManager.setOnline(online);
    if (online) void replayRewardSeenQueue().catch(captureError);
  }), []);
  return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>;
}
