import * as SecureStore from 'expo-secure-store';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, OPTIONS);
}

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, OPTIONS);
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, OPTIONS);
}
