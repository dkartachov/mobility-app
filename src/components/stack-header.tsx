import type { NativeStackHeaderProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const TITLE_FADE_MS = 150;

/**
 * Header for every stack screen, drawn in React instead of the native header. On Android the
 * native header doesn't pick up a runtime theme switch and stays dark until the app reloads,
 * while plain views re-render with the new colors immediately.
 *
 * Just a back (or close) button: screens show their own large title in the content, like the tab
 * screens. Once that title scrolls out of view, `PageHeader` sets `headerTitle` and it shows here
 * small, with a line under the header to separate it from the content passing beneath.
 */
export function StackHeader({ back, options, navigation }: NativeStackHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isModal = options.presentation === 'modal';
  const title = typeof options.headerTitle === 'string' ? options.headerTitle : undefined;

  return (
    <ThemedView
      style={[styles.header, { paddingTop: insets.top, borderBottomColor: title ? theme.border : 'transparent' }]}>
      {back ? <BackButton close={isModal} onPress={navigation.goBack} /> : <View style={styles.placeholder} />}
      {title && (
        <Animated.View
          key={title}
          entering={FadeIn.duration(TITLE_FADE_MS)}
          exiting={FadeOut.duration(TITLE_FADE_MS)}
          style={styles.title}>
          <ThemedText type="smallBold" numberOfLines={1} accessibilityRole="header">
            {title}
          </ThemedText>
        </Animated.View>
      )}
    </ThemedView>
  );
}

/**
 * The header's round back button, or a close (×) button for modals. Exported for screens that
 * draw their own header, to look the same.
 */
export function BackButton({ close = false, onPress }: { close?: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={close ? 'Close' : 'Back'}
      hitSlop={Spacing.two}
      onPress={onPress}
      pressedScale={0.9}
      style={[styles.backButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Icon
        name={close ? { ios: 'xmark', android: 'close' } : { ios: 'chevron.left', android: 'arrow_back' }}
        size={20}
        color="text"
      />
    </PressableScale>
  );
}

/** Lays out like `StackHeader`, for screens that draw their own. */
export const HEADER_HEIGHT = 60;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoAndHalf,
    paddingHorizontal: Spacing.screen,
    minHeight: HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    height: 40,
  },
  title: {
    flex: 1,
  },
});
