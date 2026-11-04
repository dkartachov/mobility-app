import { createContext, useState, type Ref } from 'react';
import {
  // eslint-disable-next-line no-restricted-imports -- the one place these are wrapped.
  FlatList as NativeFlatList,
  // eslint-disable-next-line no-restricted-imports -- the one place these are wrapped.
  ScrollView as NativeScrollView,
  type FlatListProps,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';

type ScrollListener = (y: number) => void;

/**
 * How far the nearest vertical scroll view is scrolled, for things inside it that change as they
 * scroll out of view, like a page title moving up into the header.
 */
export const ScrollPosition = createContext<{ subscribe: (listener: ScrollListener) => () => void } | null>(null);

/** Shares the scroll position with what's inside, still calling the screen's own `onScroll`. */
function useScrollPosition(onScroll: ScrollViewProps['onScroll']) {
  const [position] = useState(() => {
    const listeners = new Set<ScrollListener>();
    return {
      listeners,
      value: {
        subscribe(listener: ScrollListener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
    };
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll?.(event);
    const y = event.nativeEvent.contentOffset.y;
    position.listeners.forEach((listener) => listener(y));
  };

  return { value: position.value, handleScroll };
}

/**
 * The app's scroll views: React Native's, without scroll bars. Import these instead of the
 * `react-native` ones (lint enforces it), so every screen looks the same. A screen can still turn
 * a scroll bar back on by passing `showsVerticalScrollIndicator`.
 */
export function ScrollView({ ref, onScroll, ...props }: ScrollViewProps & { ref?: Ref<ScrollViewInstance> }) {
  const position = useScrollPosition(onScroll);
  const scrollView = (
    <NativeScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      {...props}
      onScroll={props.horizontal ? onScroll : position.handleScroll}
    />
  );

  // Sideways lists, like a row of chips, leave the page's scroll position to the screen around them.
  return props.horizontal ? scrollView : <ScrollPosition value={position.value}>{scrollView}</ScrollPosition>;
}

export function FlatList<T>({ ref, onScroll, ...props }: FlatListProps<T> & { ref?: Ref<NativeFlatList<T>> }) {
  const position = useScrollPosition(onScroll);
  const list = (
    <NativeFlatList
      ref={ref}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      {...props}
      onScroll={props.horizontal ? onScroll : position.handleScroll}
    />
  );

  return props.horizontal ? list : <ScrollPosition value={position.value}>{list}</ScrollPosition>;
}
