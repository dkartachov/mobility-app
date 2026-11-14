import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackHeaderProps } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/stack-header';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

// Rendered on its own: the test stack draws `headerRight` itself too, so it can't show this header does.
async function renderHeader(options: NativeStackHeaderProps['options']) {
  const props = {
    back: { title: 'Home', href: undefined },
    options,
    navigation: { goBack: jest.fn() },
    route: { key: 'pushed', name: 'pushed' },
  } as unknown as NativeStackHeaderProps;
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <StackHeader {...props} />
    </SafeAreaProvider>
  );
}

describe('stack header', () => {
  it("shows a screen's headerRight beside the back button", async () => {
    const onPress = jest.fn();
    await renderHeader({
      headerRight: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="Flag" onPress={onPress}>
          <Text>Flag</Text>
        </Pressable>
      ),
    });

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Flag' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows only the back button without one', async () => {
    await renderHeader({});

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
