import React from 'react';
import { create } from 'react-test-renderer';
import { validateComponentJSON } from './ui-checker';

// Minimal smoke test: validates the ui-checker utility itself
describe('UI Validation Utility', () => {
  it('passes for a non-null component snapshot', () => {
    const fakeJson = { type: 'View', props: { style: { flex: 1, backgroundColor: '#fff' } }, children: ['Hello'] };
    const result = validateComponentJSON('TestComponent', fakeJson);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.component).toBe('TestComponent');
  });

  it('fails for null snapshot', () => {
    const result = validateComponentJSON('EmptyComponent', null);
    expect(result.passed).toBe(false);
  });

  it('includes render check', () => {
    const result = validateComponentJSON('TestComponent', { type: 'View', props: {}, children: [] });
    const renderCheck = result.checks.find((c) => c.name === 'renders_successfully');
    expect(renderCheck?.passed).toBe(true);
  });

  it('result has timestamp', () => {
    const result = validateComponentJSON('TestComponent', {});
    expect(result.timestamp).toBeTruthy();
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
  });
});
