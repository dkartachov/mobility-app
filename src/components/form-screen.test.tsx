import { act, render, screen } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, Text, type KeyboardEvent } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FormScreen } from '@/components/form-screen';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

let listeners: Record<string, (event: KeyboardEvent) => void> = {};
const originalOS = Platform.OS;

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

beforeEach(() => {
  listeners = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, listener: (event: KeyboardEvent) => void) => {
    listeners[name] = listener;
    return { remove: jest.fn() };
  }) as unknown as typeof Keyboard.addListener);
});

afterEach(() => {
  jest.restoreAllMocks();
  setOS(originalOS);
});

async function renderForm() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <FormScreen>
        <Text>Field</Text>
      </FormScreen>
    </SafeAreaProvider>
  );
}

function bottomPadding() {
  return StyleSheet.flatten(screen.getByTestId('form-screen').props.style).paddingBottom;
}

async function keyboard(name: 'keyboardDidShow' | 'keyboardDidHide', height = 0) {
  await act(async () => listeners[name]({ endCoordinates: { height } } as KeyboardEvent));
}

describe('form screen keyboard', () => {
  it('makes room for the keyboard on Android, then gives it back', async () => {
    setOS('android');
    await renderForm();
    expect(bottomPadding()).toBe(0);

    await keyboard('keyboardDidShow', 320);
    expect(bottomPadding()).toBe(320);

    await keyboard('keyboardDidHide');
    expect(bottomPadding()).toBe(0);
  });

  it('leaves iOS to the scroll view', async () => {
    setOS('ios');
    await renderForm();

    expect(listeners.keyboardDidShow).toBeUndefined();
    expect(bottomPadding()).toBe(0);
  });
});
