/**
 * T17 verification test: Wire Gemini Live voice UI behind a feature gate.
 *
 * Proves:
 *   - ROUTES.GeminiConversationScreen exists.
 *   - FEATURE_NAVIGATION_REGISTRY includes the Gemini feature when
 *     FEATURE_GEMINI_CONVERSATION is enabled and excludes it when disabled.
 *   - GeminiConversationScreen mounts and renders SukaAvatar, TranscriptPanel,
 *     and ControlBar.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';

describe('T17: Wire Gemini conversation screen behind feature gate', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('exposes GeminiConversationScreen in ROUTES', () => {
    expect((ROUTES as any).GeminiConversationScreen).toBe('GeminiConversationScreen');
  });

  it('includes Gemini navigation when FEATURE_GEMINI_CONVERSATION is enabled', () => {
    jest.isolateModules(() => {
      jest.doMock('@/config/feature-flags', () => ({
        __esModule: true,
        FEATURE_SUBSCRIPTION: false,
        isSubscriptionFeatureEnabled: () => false,
        FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
        FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
          readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
          constructor(operation: string) {
            super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
            this.name = 'FeatureSubscriptionDisabledError';
          }
        },
        FEATURE_GEMINI_CONVERSATION: true,
        isGeminiConversationEnabled: () => true,
      }));

      const { FEATURE_NAVIGATION_REGISTRY } = require('@/navigation/featureRegistry');

      expect(FEATURE_NAVIGATION_REGISTRY.some((f: any) => f.owner === 'gemini')).toBe(true);

      const gemini = FEATURE_NAVIGATION_REGISTRY.find((f: any) => f.owner === 'gemini');
      expect(gemini).toBeDefined();
      expect(gemini.stackScreens.some((s: any) => s.name === 'GeminiConversationScreen')).toBe(true);
    });
  });

  it('excludes Gemini navigation when FEATURE_GEMINI_CONVERSATION is disabled', () => {
    jest.isolateModules(() => {
      jest.doMock('@/config/feature-flags', () => ({
        __esModule: true,
        FEATURE_SUBSCRIPTION: false,
        isSubscriptionFeatureEnabled: () => false,
        FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
        FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
          readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
          constructor(operation: string) {
            super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
            this.name = 'FeatureSubscriptionDisabledError';
          }
        },
        FEATURE_GEMINI_CONVERSATION: false,
        isGeminiConversationEnabled: () => false,
      }));

      const { FEATURE_NAVIGATION_REGISTRY } = require('@/navigation/featureRegistry');

      expect(FEATURE_NAVIGATION_REGISTRY.some((f: any) => f.owner === 'gemini')).toBe(false);
    });
  });

  it('renders GeminiConversationScreen with SukaAvatar, TranscriptPanel, and ControlBar', async () => {
    jest.doMock('@/config/feature-flags', () => ({
      __esModule: true,
      FEATURE_GEMINI_CONVERSATION: true,
      isGeminiConversationEnabled: () => true,
    }));

    jest.doMock('@/hooks/useGeminiConversation', () => ({
      __esModule: true,
      useGeminiConversation: () => ({
        startConversation: jest.fn(),
        stopConversation: jest.fn(),
        interruptPlayback: jest.fn(),
      }),
    }));

    jest.doMock('@/components/gemini/SukaAvatar', () => {
      const React = require('react');
      const { View } = require('react-native');
      return {
        __esModule: true,
        SukaAvatar: (props: any) => React.createElement(View, { testID: 'sukaAvatar', ...props }),
      };
    });

    jest.doMock('@/components/gemini/TranscriptPanel', () => {
      const React = require('react');
      const { View } = require('react-native');
      return {
        __esModule: true,
        TranscriptPanel: () => React.createElement(View, { testID: 'transcriptPanel' }),
      };
    });

    jest.doMock('@/components/gemini/ControlBar', () => {
      const React = require('react');
      const { View } = require('react-native');
      return {
        __esModule: true,
        ControlBar: (props: any) => React.createElement(View, { testID: 'controlBar', ...props }),
      };
    });

    jest.doMock('@/state/voiceAssistantStore', () => ({
      __esModule: true,
      useVoiceAssistantStore: (selector: (state: any) => any) =>
        selector({ state: 'IDLE', audioLevel: 0 }),
    }));

    const { default: GeminiConversationScreen } = require('@/features/gemini/screens/GeminiConversationScreen') as {
      default: React.ComponentType<any>;
    };

    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
      pop: jest.fn(),
      popToTop: jest.fn(),
      dispatch: jest.fn(),
      setParams: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      getId: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(),
    };

    const route = { key: 'gemini-conversation', name: 'GeminiConversationScreen' };

    render(
      <GeminiConversationScreen
        navigation={navigation as any}
        route={route as any}
      />,
    );

    expect(screen.getByTestId('sukaAvatar')).toBeTruthy();
    expect(screen.getByTestId('transcriptPanel')).toBeTruthy();
    expect(screen.getByTestId('controlBar')).toBeTruthy();
  });
});
