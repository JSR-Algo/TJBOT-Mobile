import AsyncStorage from '@react-native-async-storage/async-storage';

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
    return await AsyncStorage.getItem(key);
  } catch {
    throw new StorageError('ASYNC_STORAGE_READ_FAILED', 'Async storage read failed.');
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    throw new StorageError('ASYNC_STORAGE_WRITE_FAILED', 'Async storage write failed.');
  }
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
