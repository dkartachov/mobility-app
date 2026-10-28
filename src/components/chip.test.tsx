import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './chip';

describe('Chip', () => {
  it('exposes its selected state and handles presses', async () => {
    const onPress = jest.fn();
    await render(<Chip label="15 min" selected onPress={onPress} />);

    const chip = screen.getByRole('radio', { name: '15 min' });
    expect(chip).toBeSelected();
    await fireEvent.press(chip);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is unselected when not selected', async () => {
    await render(<Chip label="8 min" selected={false} onPress={jest.fn()} />);

    expect(screen.getByRole('radio', { name: '8 min' })).not.toBeSelected();
  });
});
