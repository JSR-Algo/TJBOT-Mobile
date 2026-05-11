import React from 'react';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import Robot from '@/design-system/components/Robot';

// Generic app-error fallback — addresses ISSUE 4 (no global error path).
// Used by ErrorBoundary or any async wrapper that catches an unexpected failure.
// Accepts { error, reset, go } so callers can decide whether to retry in place
// or hand control back to the router.
export default function AppErrorPage({ error, reset, go, robotProps }) {
  const message = error?.message || 'Something went wrong. Please try again.';

  return (
    <ScreenShell bg="var(--paper)">
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24 }}>
        <Robot emotion="worry" size={180} {...robotProps} />
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, margin: '20px 0 8px', color: 'var(--ink)' }}>
          Oops!
        </h2>
        <p style={{ fontFamily: 'var(--body)', fontSize: 16, color: 'var(--ink-soft)', textAlign: 'center', margin: '0 0 24px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          {reset && (
            <PrimaryCTA color="var(--coral)" onClick={reset}>
              Try again
            </PrimaryCTA>
          )}
          {go && (
            <PrimaryCTA color="var(--sky)" onClick={() => go('home_hub_idle')}>
              Back home
            </PrimaryCTA>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}
