import * as SecureStore from 'expo-secure-store';

import { DEFAULT_BUFFER_POLICY } from './BufferPolicy';

const PERSISTED_JITTER_SEED_KEY = 'audio_jitter_seed_v1';

type PersistedSeedPayload = {
  samples: number[];
  writtenAt: number;
};

export interface JitterSeedStore {
  /** Returns a copy of the latest published samples, or `null` if none. */
  read(): number[] | null;
  /** Publishes a copy of the current ring for later consumers. */
  write(samples: number[]): void;
}

// SecureStore adds small keychain overhead, but avoids introducing a new storage dependency.
export class AsyncStoragePersistentSeedStore implements JitterSeedStore {
  private cached: number[] | null = null;
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) return;

    try {
      const raw = await SecureStore.getItemAsync(PERSISTED_JITTER_SEED_KEY);
      if (!raw) {
        this.cached = null;
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedSeedPayload>;
      const samples = Array.isArray(parsed.samples)
        ? parsed.samples.filter((sample): sample is number => Number.isFinite(sample))
        : null;
      const writtenAt = parsed.writtenAt;
      const expired =
        typeof writtenAt !== 'number' ||
        !Number.isFinite(writtenAt) ||
        Date.now() - writtenAt > DEFAULT_BUFFER_POLICY.seedPersistenceTtlMs;

      if (!samples || expired) {
        this.cached = null;
        try {
          void SecureStore.deleteItemAsync(PERSISTED_JITTER_SEED_KEY);
        } catch {
          // ignore storage cleanup failures
        }
        return;
      }

      this.cached = [...samples];
    } catch {
      this.cached = null;
    } finally {
      this.hydrated = true;
    }
  }

  read(): number[] | null {
    if (!this.hydrated || !this.cached) return null;
    return [...this.cached];
  }

  write(samples: number[]): void {
    const next = [...samples];
    this.cached = next;

    try {
      void SecureStore.setItemAsync(
        PERSISTED_JITTER_SEED_KEY,
        JSON.stringify({ samples: next, writtenAt: Date.now() }),
      );
    } catch {
      // ignore storage write failures
    }
  }
}

/**
 * The process-wide default store used by AudioPlaybackService in production.
 * Holds at most one snapshot at a time; later writes overwrite earlier ones.
 * Not exported as a mutable value — reachable only through the interface.
 */
export const defaultJitterSeedStore: JitterSeedStore = (() => {
  let samples: number[] | null = null;
  return {
    read(): number[] | null {
      return samples ? [...samples] : null;
    },
    write(next: number[]): void {
      samples = [...next];
    },
  };
})();

export const persistentJitterSeedStore = new AsyncStoragePersistentSeedStore();

let hydrateAudioSeedPromise: Promise<void> | null = null;

export function hydrateAudioSeedOnce(): Promise<void> {
  if (!hydrateAudioSeedPromise) {
    hydrateAudioSeedPromise = persistentJitterSeedStore.hydrate();
  }
  return hydrateAudioSeedPromise;
}
