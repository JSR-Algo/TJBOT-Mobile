import { getItem, setItem } from '@/services/storage/asyncStorage';
import { captureError } from '@/services/observability/sentry';
import { setAnalyticsCollectionEnabled } from '@/services/observability/analytics';

// Persisted parent choice for anonymous-usage analytics (Settings → Privacy).
// Default (key absent) is ENABLED for adult/teen roles — matching the current
// opt-in-by-role behavior — so only an explicit opt-out is stored.
const ANALYTICS_PREF_KEY = 'settings.analyticsEnabled';

export async function getAnalyticsPreference(): Promise<boolean | null> {
  try {
    const raw = await getItem(ANALYTICS_PREF_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch (error) {
    captureError(error);
    return null;
  }
}

// Persist the parent's choice AND apply it to the live analytics client so the
// change takes effect immediately, not just on next launch.
export async function setAnalyticsPreference(enabled: boolean): Promise<void> {
  setAnalyticsCollectionEnabled(enabled);
  try {
    await setItem(ANALYTICS_PREF_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    captureError(error);
  }
}

// Re-apply a previously stored opt-out at boot, after the role-based analytics
// init has run. A stored opt-out must win over the role default; if no
// preference is stored, leave the role-based state untouched.
export async function applyStoredAnalyticsPreference(): Promise<void> {
  const pref = await getAnalyticsPreference();
  if (pref === null) return;
  setAnalyticsCollectionEnabled(pref);
}
