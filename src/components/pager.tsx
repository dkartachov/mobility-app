import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useInstructionsUntilDone, type InstructionId } from '@/lib/instructions';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ScrollView } from './scroll-view';
import { ThemedText } from './themed-text';

/** How far the first page slides aside to show there's more beside it, as a share of the screen width. */
const PEEK_FRACTION = 0.5;
const PEEK_HOLD_MS = 1200;
/** The first peek waits for the screen to settle, then they repeat while the hint is up. */
const FIRST_PEEK_MS = 1500;
const PEEK_EVERY_MS = 8000;

/** For a pager whose second page is the full instructions, shared so learning it once covers everywhere. */
export const SWIPE_FOR_INSTRUCTIONS = { id: 'swipe-instructions', label: 'Swipe for instructions' } as const;

type PagerProps = {
  children: ReactNode;
  /**
   * Teaches the swipe: a line under the dots, with the first page peeking aside now and then. It
   * keeps coming back until the user gets to the second page, then never shows again (until reset
   * from Settings).
   */
  hint?: { id: InstructionId; label: string };
};

/** Full-width pages you swipe between horizontally. Shows page dots once there is more than one page. */
export function Pager({ children, hint }: PagerProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pages = Children.toArray(children);
  const scrollView = useRef<ScrollViewInstance>(null);
  const instructions = useInstructionsUntilDone(hint?.id);
  const showHint = instructions.show && pages.length > 1;
  const reducedMotion = useReducedMotion();

  // Read inside the timers, which would otherwise see the values from when they were set.
  const onFirstPage = useRef(true);
  const dragging = useRef(false);

  useEffect(() => {
    if (!showHint || reducedMotion) return;
    let back: ReturnType<typeof setTimeout> | undefined;
    const peek = () => {
      // Never yank the pages out from under a finger, or off a page the user went to.
      if (dragging.current || !onFirstPage.current) return;
      scrollView.current?.scrollTo({ x: width * PEEK_FRACTION, animated: true });
      back = setTimeout(() => {
        if (!dragging.current) scrollView.current?.scrollTo({ x: 0, animated: true });
      }, PEEK_HOLD_MS);
    };
    let repeat: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      peek();
      repeat = setInterval(peek, PEEK_EVERY_MS);
    }, FIRST_PEEK_MS);
    return () => {
      clearTimeout(first);
      clearTimeout(back);
      clearInterval(repeat);
    };
  }, [showHint, reducedMotion, width]);

  const changePage = (to: number) => {
    setPage(to);
    onFirstPage.current = to === 0;
    if (to > 0) instructions.done();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollView}
        horizontal
        pagingEnabled
        onScrollBeginDrag={() => (dragging.current = true)}
        onScrollEndDrag={() => (dragging.current = false)}
        onMomentumScrollEnd={(event) => changePage(Math.round(event.nativeEvent.contentOffset.x / width))}>
        {pages.map((child, index) => (
          <View key={index} style={{ width }}>
            {child}
          </View>
        ))}
      </ScrollView>

      {pages.length > 1 && (
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === page && styles.activeDot,
                { backgroundColor: index === page ? theme.tint : theme.border },
              ]}
            />
          ))}
        </View>
      )}

      {/* Also a button, for screen readers, which don't swipe pages the same way. */}
      {showHint && hint && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={hint.label}
          onPress={() => {
            scrollView.current?.scrollTo({ x: width, animated: true });
            changePage(1);
          }}
          style={styles.hint}>
          <ThemedText type="smallBold" themeColor="tint">
            {hint.label}
          </ThemedText>
          <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={14} color="tint" />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 20,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
});
