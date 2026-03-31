import React from 'react';

describe('App', () => {
  it('module loads without error', () => {
    // Smoke test: verify the module can be imported
    const App = require('../src/App').default;
    expect(App).toBeDefined();
  });
});
