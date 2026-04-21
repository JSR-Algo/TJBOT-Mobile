jest.mock('expo-secure-store');

import * as SecureStore from 'expo-secure-store';

import { DEFAULT_BUFFER_POLICY } from '../../src/audio/BufferPolicy';
import {
  AsyncStoragePersistentSeedStore,
  hydrateAudioSeedOnce,
} from '../../src/audio/JitterSeedStore';

const mockedSecureStore = jest.mocked(SecureStore);

describe('AsyncStoragePersistentSeedStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('read returns null before hydrate', () => {
    const store = new AsyncStoragePersistentSeedStore();
    expect(store.read()).toBeNull();
  });

  test('write then hydrate round-trips samples', async () => {
    mockedSecureStore.setItemAsync.mockResolvedValue();
    mockedSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ samples: [10, 20, 30], writtenAt: Date.now() }),
    );

    const writer = new AsyncStoragePersistentSeedStore();
    writer.write([10, 20, 30]);
    expect(writer.read()).toBeNull();

    const reader = new AsyncStoragePersistentSeedStore();
    await reader.hydrate();

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'audio_jitter_seed_v1',
      expect.any(String),
    );
    expect(reader.read()).toEqual([10, 20, 30]);
  });

  test('expired payload removes key and returns null', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        samples: [1, 2, 3],
        writtenAt: Date.now() - DEFAULT_BUFFER_POLICY.seedPersistenceTtlMs - 1,
      }),
    );
    mockedSecureStore.deleteItemAsync.mockResolvedValue();

    const store = new AsyncStoragePersistentSeedStore();
    await store.hydrate();

    expect(store.read()).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('audio_jitter_seed_v1');
  });

  test('malformed JSON is handled', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue('{oops');

    const store = new AsyncStoragePersistentSeedStore();
    await store.hydrate();

    expect(store.read()).toBeNull();
  });

  test('AsyncStorage read errors are handled', async () => {
    mockedSecureStore.getItemAsync.mockRejectedValue(new Error('boom'));

    const store = new AsyncStoragePersistentSeedStore();
    await store.hydrate();

    expect(store.read()).toBeNull();
  });

  test('write is non-blocking and handles SecureStore throw', () => {
    mockedSecureStore.setItemAsync.mockImplementation(() => {
      throw new Error('sync fail');
    });

    const store = new AsyncStoragePersistentSeedStore();

    expect(() => store.write([7, 8, 9])).not.toThrow();
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });
});

describe('hydrateAudioSeedOnce', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('memoizes the hydration promise', async () => {
    let hydrateAudioSeedOnceIsolated!: typeof hydrateAudioSeedOnce;
    let isolatedGetItemAsync!: jest.Mock;

    jest.isolateModules(() => {
      const isolatedSecureStore = jest.requireMock('expo-secure-store') as {
        getItemAsync: jest.Mock;
      };
      isolatedGetItemAsync = isolatedSecureStore.getItemAsync;
      isolatedGetItemAsync.mockResolvedValue(null);
      ({ hydrateAudioSeedOnce: hydrateAudioSeedOnceIsolated } = require('../../src/audio/JitterSeedStore'));
    });

    await Promise.all([
      hydrateAudioSeedOnceIsolated(),
      hydrateAudioSeedOnceIsolated(),
    ]);

    expect(isolatedGetItemAsync).toHaveBeenCalledTimes(1);
  });
});
