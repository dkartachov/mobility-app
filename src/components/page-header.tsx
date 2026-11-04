import { useNavigation } from 'expo-router';
import { use, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing, type ThemeColor } from '@/constants/theme';

import { ScrollPosition } from './scroll-view';
import { ThemedText } from './themed-text';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Small uppercase line above the title. */
  eyebrow?: string;
  eyebrowColor?: ThemeColor;
  /** Shown to the right of the title, e.g. an icon button. */
  action?: ReactNode;
  /**
   * Repeats the title small in the stack header once it has scrolled out of view, so you still
   * know where you are. Off for tab screens, which have no header.
   */
  titleInHeader?: boolean;
};

/**
 * The screen's navigation, or nothing outside a navigator, e.g. a form rendered on its own in a
 * test. Either way it throws on every render or none, so the hooks inside run in the same order.
 */
function useOptionalNavigation() {
  try {
    return useNavigation();
  } catch {
    return undefined;
  }
}

/** The large in-content title every screen starts with. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  eyebrowColor = 'tint',
  action,
  titleInHeader = true,
}: PageHeaderProps) {
  const scroll = use(ScrollPosition);
  const navigation = useOptionalNavigation();
  /** Where the title ends, in the scroll view's content. */
  const titleBottom = useRef(Infinity);

  useEffect(() => {
    if (!scroll || !navigation || !titleInHeader) return;
    let shown = false;
    const unsubscribe = scroll.subscribe((y) => {
      const scrolledPast = y > titleBottom.current;
      if (scrolledPast === shown) return;
      shown = scrolledPast;
      navigation.setOptions({ headerTitle: scrolledPast ? title : undefined });
    });
    return () => {
      unsubscribe();
      if (shown) navigation.setOptions({ headerTitle: undefined });
    };
  }, [scroll, titleInHeader, navigation, title]);

  return (
    <View
      style={styles.row}
      onLayout={({ nativeEvent: { layout } }) => {
        titleBottom.current = layout.y + layout.height;
      }}>
      <View style={styles.text}>
        {eyebrow && (
          <ThemedText type="eyebrow" themeColor={eyebrowColor}>
            {eyebrow}
          </ThemedText>
        )}
        <ThemedText type="title" accessibilityRole="header">
          {title}
        </ThemedText>
        {subtitle && <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
});
