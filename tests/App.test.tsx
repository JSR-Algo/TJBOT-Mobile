import React from 'react';

// App -> navigation -> GeminiConversationScreen -> useGeminiConversation ->
// @google/genai/web (ESM). This smoke test does not exercise that path, so we
// stub the screen to keep the App import Jest-compatible.
jest.mock('../src/screens/gemini/GeminiConversationScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    GeminiConversationScreen: () => React.createElement(Text, null, 'GeminiConversationScreen'),
  };
});

describe('App', () => {
  it('module loads without error', () => {
    // Smoke test: verify the module can be imported
    const App = require('../src/App').default;
    expect(App).toBeDefined();
  });
});
