import { useEffect, useSyncExternalStore } from 'react';
import { getItem, setItem } from '@/services/storage/asyncStorage';

export const ACCESSIBILITY_PREFERENCES_STORAGE_KEY = '@teebot/accessibility-preferences';

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  largeText: boolean;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  reduceMotion: false,
  largeText: false,
};

let currentPreferences = DEFAULT_PREFERENCES;
let loaded = false;
let loadPromise: Promise<AccessibilityPreferences> | null = null;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach(listener => listener());
}

function parsePreferences(raw: string | null): AccessibilityPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      reduceMotion: parsed.reduceMotion === true,
      largeText: parsed.largeText === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function loadAccessibilityPreferences(): Promise<AccessibilityPreferences> {
  if (loaded) return currentPreferences;
  if (!loadPromise) {
    loadPromise = getItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY)
      .then(raw => {
        currentPreferences = parsePreferences(raw);
        loaded = true;
        emitChange();
        return currentPreferences;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

export async function setAccessibilityPreferences(
  patch: Partial<AccessibilityPreferences>,
): Promise<AccessibilityPreferences> {
  const nextPreferences = { ...currentPreferences, ...patch };
  await setItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
  currentPreferences = nextPreferences;
  loaded = true;
  emitChange();
  return currentPreferences;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AccessibilityPreferences {
  return currentPreferences;
}

export function useAccessibilityPreferences(): AccessibilityPreferences {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void loadAccessibilityPreferences().catch(() => undefined);
  }, []);
  return preferences;
}
