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

// Skia draws with a native module too. Its own Jest mock needs CanvasKit loaded into a custom test
// environment, which every test would pay for, so the components here are plain views that render
// their children, and paths are empty stand-ins. Tests check what's on screen, not what's drawn.
jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native');
  const Container = ({ children }: { children?: unknown }) => children ?? null;
  const path = () => ({});
  return {
    Canvas: View,
    Group: Container,
    Path: Container,
    DashPathEffect: () => null,
    Fill: () => null,
    Skia: { Path: { Make: path, MakeFromSVGString: path } },
  };
});

// expo-audio needs the native module too. Tests that care what plays mock it themselves.
jest.mock('expo-audio', () => ({
  setAudioModeAsync: () => Promise.resolve(),
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: () => Promise.resolve() }),
}));
