import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { DialogHost, showDialog } from './dialog';

describe('DialogHost', () => {
  it('runs the action once when confirmed, then closes', async () => {
    const onPress = jest.fn();
    await render(<DialogHost />);
    await act(async () =>
      showDialog({ title: 'Delete?', message: 'Gone for good.', confirm: { label: 'Delete', onPress } })
    );
    expect(screen.getByText('Gone for good.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Delete?')).toBeNull();
  });

  it("closes without running the action when it's cancelled", async () => {
    const onPress = jest.fn();
    await render(<DialogHost />);
    await act(async () =>
      showDialog({ title: 'Delete?', message: '', cancelLabel: 'Keep', confirm: { label: 'Delete', onPress } })
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Keep' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete?')).toBeNull();
  });

  it('offers only OK for a plain message', async () => {
    await render(<DialogHost />);
    await act(async () => showDialog({ title: 'Failed', message: 'Try again later.' }));

    expect(screen.getAllByRole('button').length).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));

    expect(screen.queryByText('Failed')).toBeNull();
  });

  it('shows only the given actions and runs the one pressed, once', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const onDismiss = jest.fn();
    await render(<DialogHost />);
    await act(async () =>
      showDialog({
        title: 'Choose',
        message: '',
        actions: [
          { label: 'First', variant: 'primary', onPress: first },
          { label: 'Second', variant: 'secondary', onPress: second },
        ],
        onDismiss,
      })
    );
    expect(screen.getAllByRole('button').length).toBe(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Second' }));

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.queryByText('Choose')).toBeNull();
  });

  it('runs onDismiss when cancelled', async () => {
    const onDismiss = jest.fn();
    await render(<DialogHost />);
    await act(async () => showDialog({ title: 'Note', message: '', onDismiss }));

    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
