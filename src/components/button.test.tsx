import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button title="Start" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("doesn't respond to presses while disabled", async () => {
    const onPress = jest.fn();
    await render(<Button title="Start" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the title while loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} loading />);

    expect(screen.queryByText('Save')).toBeNull();
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
