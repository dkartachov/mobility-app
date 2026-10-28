// expo-sqlite's key-value store needs the native module, so tests get an in-memory one instead.
jest.mock('expo-sqlite/kv-store', () => {
  const items = new Map<string, string>();
  const Storage = {
    getItemSync: (key: string) => items.get(key) ?? null,
    setItemSync: (key: string, value: string) => void items.set(key, value),
    removeItemSync: (key: string) => items.delete(key),
    clearSync: () => items.clear(),
  };
  return { __esModule: true, default: Storage, Storage };
});
