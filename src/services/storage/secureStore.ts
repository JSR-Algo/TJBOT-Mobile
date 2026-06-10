import * as SecureStore from 'expo-secure-store';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

class StorageError extends Error {
  readonly code: string;
  readonly retryable = true;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, OPTIONS);
  } catch {
    throw new StorageError('SECURE_STORAGE_READ_FAILED', 'Secure storage read failed.');
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, OPTIONS);
  } catch {
    throw new StorageError('SECURE_STORAGE_WRITE_FAILED', 'Secure storage write failed.');
  }
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, OPTIONS);
}
