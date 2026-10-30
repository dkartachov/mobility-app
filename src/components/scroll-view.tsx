import type { Ref } from 'react';
import {
  // eslint-disable-next-line no-restricted-imports -- the one place these are wrapped.
  FlatList as NativeFlatList,
  // eslint-disable-next-line no-restricted-imports -- the one place these are wrapped.
  ScrollView as NativeScrollView,
  type FlatListProps,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';

/**
 * The app's scroll views: React Native's, without scroll bars. Import these instead of the
 * `react-native` ones (lint enforces it), so every screen looks the same. A screen can still turn
 * a scroll bar back on by passing `showsVerticalScrollIndicator`.
 */
export function ScrollView({ ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollViewInstance> }) {
  return (
    <NativeScrollView ref={ref} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} {...props} />
  );
}

export function FlatList<T>({ ref, ...props }: FlatListProps<T> & { ref?: Ref<NativeFlatList<T>> }) {
  return (
    <NativeFlatList ref={ref} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} {...props} />
  );
}
