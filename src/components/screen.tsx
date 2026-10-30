import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { PageHeader } from './page-header';
import { ScrollView } from './scroll-view';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Small uppercase line above the title, e.g. today's date. */
  eyebrow?: string;
  /** Shown to the right of the title, e.g. an icon button. */
  headerAction?: ReactNode;
  /** Space between the header and each child. */
  gap?: number;
  children: ReactNode;
};

/** Scrollable tab screen with a large in-content title. */
export function Screen({ title, subtitle, eyebrow, headerAction, gap = Spacing.four, children }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="never"
     
      alwaysBounceVertical={false}
      contentContainerStyle={[
        {
          gap,
          // Lets children with `flex` share the leftover height when the content is shorter than the screen.
          flexGrow: 1,
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          paddingLeft: insets.left + Spacing.three + Spacing.one,
          paddingRight: insets.right + Spacing.three + Spacing.one,
        },
      ]}>
      <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} action={headerAction} />
      {children}
    </ScrollView>
  );
}
