import React from 'react';
import { useKeepAwake } from 'expo-keep-awake';
void React;

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
}));

// GeminiConversationScreen was retired in PR6 — Gemini logic moved into
// src/services/ai/. The standalone screen no longer exists; no mock needed.

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('module loads without error', () => {
    // Smoke test: verify the module can be imported
    const App = require('../src/App').default;
    expect(App).toBeDefined();
  });

  it('keeps the foreground app awake while mounted', () => {
    const App = require('../src/App').default;

    App();

    expect(useKeepAwake).toHaveBeenCalledWith('tbot-mobile-foreground');
  });
});
