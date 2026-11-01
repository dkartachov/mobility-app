import { fireEvent, render, screen } from '@testing-library/react-native';

import { resetInstructions } from '@/lib/instructions';

import { TimeoutOverlay } from './timeout-overlay';

describe('TimeoutOverlay', () => {
  beforeEach(resetInstructions);

  it('shows the instructions during the first timeout only, until they are reset', async () => {
    const overlay = (remainingMs: number) => (
      <TimeoutOverlay remainingMs={remainingMs} onExtend={jest.fn()} onResume={jest.fn()} />
    );
    const instructions = () => screen.queryByText('Tap anywhere else to resume');
    const header = () => screen.queryByText('Tap the timer to add 30 s');
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);

    await render(overlay(30_000));
    expect(header()).toBeTruthy();
    expect(instructions()).toBeTruthy();
    expect(screen.queryByText('Timeout!')).toBeNull();

    // They stay up for the rest of that timeout.
    await screen.rerender(overlay(29_000));
    expect(header()).toBeTruthy();
    expect(instructions()).toBeTruthy();

    await screen.unmount();
    await render(overlay(30_000));
    expect(header()).toBeNull();
    expect(instructions()).toBeNull();
    expect(screen.getByText('Timeout!')).toBeTruthy();
    random.mockRestore();

    await screen.unmount();
    resetInstructions();
    await render(overlay(30_000));
    expect(instructions()).toBeTruthy();
  });

  it('rounds the time left up to whole seconds', async () => {
    await render(<TimeoutOverlay remainingMs={29_250} onExtend={jest.fn()} onResume={jest.fn()} />);

    expect(screen.getByText('0:30')).toBeTruthy();
  });

  it('keeps the same random message while the timer counts down', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    // The message only shows once the first timeout's instructions have been seen.
    await (await render(<TimeoutOverlay remainingMs={30_000} onExtend={jest.fn()} onResume={jest.fn()} />)).unmount();
    await render(<TimeoutOverlay remainingMs={30_000} onExtend={jest.fn()} onResume={jest.fn()} />);
    expect(screen.getByText('Timeout!')).toBeTruthy();

    random.mockReturnValue(0.99);
    await screen.rerender(<TimeoutOverlay remainingMs={29_000} onExtend={jest.fn()} onResume={jest.fn()} />);

    expect(screen.getByText('Timeout!')).toBeTruthy();
    random.mockRestore();
  });

  it('resumes when the backdrop is tapped', async () => {
    const onExtend = jest.fn();
    const onResume = jest.fn();
    await render(<TimeoutOverlay remainingMs={30_000} onExtend={onExtend} onResume={onResume} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Resume workout' }));

    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onExtend).not.toHaveBeenCalled();
  });

  it('adds time instead of resuming when the timer is tapped', async () => {
    const onExtend = jest.fn();
    const onResume = jest.fn();
    await render(<TimeoutOverlay remainingMs={30_000} onExtend={onExtend} onResume={onResume} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Add 30 seconds' }));

    expect(onExtend).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
  });
});
