import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import { resetInstructions } from '@/lib/instructions';

import { Pager, SWIPE_FOR_INSTRUCTIONS } from './pager';

const pager = (
  <Pager hint={SWIPE_FOR_INSTRUCTIONS}>
    <Text>Exercise</Text>
    <Text>Instructions</Text>
  </Pager>
);
const hint = () => screen.queryByText('Swipe for instructions');

async function swipeTo(page: number) {
  // Scroll events don't bubble, so they go to the scroll view around the first page.
  let scrollView = screen.getByText('Exercise');
  while (scrollView.type !== 'RCTScrollView' && scrollView.parent) scrollView = scrollView.parent;
  await fireEvent(scrollView, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: page * Dimensions.get('window').width } },
  });
}

describe('Pager swipe hint', () => {
  beforeEach(resetInstructions);

  it('keeps coming back until the user swipes to the instructions', async () => {
    await render(pager);
    expect(hint()).toBeTruthy();

    // Seeing it isn't enough: it's back next time, as long as the second page was never reached.
    await screen.unmount();
    await render(pager);
    expect(hint()).toBeTruthy();

    await swipeTo(1);
    expect(hint()).toBeNull();

    await screen.unmount();
    await render(pager);
    expect(hint()).toBeNull();

    await screen.unmount();
    resetInstructions();
    await render(pager);
    expect(hint()).toBeTruthy();
  });

  it('stays up while swiping around the first page', async () => {
    await render(pager);
    await swipeTo(0);
    expect(hint()).toBeTruthy();
  });

  it('goes to the instructions when tapped, for screen readers', async () => {
    await render(pager);
    await fireEvent.press(screen.getByRole('button', { name: 'Swipe for instructions' }));
    expect(hint()).toBeNull();
    expect(screen.getByLabelText('Page 2 of 2')).toBeTruthy();
  });

  it('shows no hint without one', async () => {
    await render(
      <Pager>
        <Text>Exercise</Text>
        <Text>Instructions</Text>
      </Pager>
    );
    expect(hint()).toBeNull();
  });
});
