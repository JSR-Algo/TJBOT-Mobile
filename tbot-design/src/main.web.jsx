import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppErrorScreen from '@/features/fallback/screens/AppErrorScreen';
import { AnimationProvider } from '@/design-system/animations/AnimationProvider.jsx';
import { injectKeyframes } from '@/platform/dom-style-injector.js';

const el = document.getElementById('root');
if (!el) throw new Error('#root missing');
ReactDOM.createRoot(el).render(
  <ErrorBoundary fallback={AppErrorScreen}>
    <AnimationProvider injector={injectKeyframes}>
      <App />
    </AnimationProvider>
  </ErrorBoundary>
);
