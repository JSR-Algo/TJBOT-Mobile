const store = new Map<string, string>();

const AsyncStorage = {
  getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((key) => [key, store.get(key) ?? null]))),
  multiSet: jest.fn((entries: [string, string][]) => {
    for (const [key, value] of entries) store.set(key, value);
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    for (const key of keys) store.delete(key);
    return Promise.resolve();
  }),
};

export default AsyncStorage;
