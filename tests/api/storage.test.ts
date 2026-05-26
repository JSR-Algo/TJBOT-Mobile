import * as SecureStore from 'expo-secure-store';
import * as SecureStorage from '../../src/services/storage/secureStore';
import * as AsyncStorage from '../../src/services/storage/asyncStorage';

const mockAsyncStorage = {
  getItem: jest.fn<Promise<string | null>, [string]>(),
  setItem: jest.fn<Promise<void>, [string, string]>(),
  removeItem: jest.fn<Promise<void>, [string]>(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const secureStoreMock = jest.mocked(SecureStore);

describe('storage failure normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  it('normalizes SecureStore read failures', async () => {
    secureStoreMock.getItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));

    await expect(SecureStorage.getItem('token')).rejects.toMatchObject({
      code: 'SECURE_STORAGE_READ_FAILED',
      message: 'Secure storage read failed.',
      retryable: true,
    });
  });

  it('normalizes SecureStore write failures', async () => {
    secureStoreMock.setItemAsync.mockRejectedValueOnce(new Error('keychain locked'));

    await expect(SecureStorage.setItem('token', 'value')).rejects.toMatchObject({
      code: 'SECURE_STORAGE_WRITE_FAILED',
      message: 'Secure storage write failed.',
      retryable: true,
    });
  });

  it('normalizes AsyncStorage read failures', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('disk unavailable'));

    await expect(AsyncStorage.getItem('cache')).rejects.toMatchObject({
      code: 'ASYNC_STORAGE_READ_FAILED',
      message: 'Async storage read failed.',
      retryable: true,
    });
  });

  it('normalizes AsyncStorage write failures', async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(AsyncStorage.setItem('cache', 'value')).rejects.toMatchObject({
      code: 'ASYNC_STORAGE_WRITE_FAILED',
      message: 'Async storage write failed.',
      retryable: true,
    });
  });
});
