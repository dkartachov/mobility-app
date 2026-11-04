import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { formatScoreChange } from '@/data/mobility-score';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

type Tone = 'neutral' | 'accent' | 'danger';

const TEXT_COLORS: Record<Tone, ThemeColor> = { neutral: 'textSecondary', accent: 'tint', danger: 'danger' };

type PillProps = {
  label: string;
  /** `accent` for the current state or good news, `danger` for a drop. */
  tone?: Tone;
  /** `tag` is a small uppercase label; `value` is a number or short phrase in bold. */
  kind?: 'tag' | 'value';
  /** `small` fits beside a list item's photo. */
  size?: 'small' | 'regular';
  icon?: ComponentProps<typeof Icon>['name'];
};

/** A rounded label, the same everywhere: tags on exercises, score changes, the side being tested. */
export function Pill({ label, tone = 'neutral', kind = 'tag', size = 'regular', icon }: PillProps) {
  const theme = useTheme();
  const backgroundColor =
    tone === 'accent' ? theme.tintSoft : tone === 'danger' ? `${theme.danger}1F` : theme.backgroundSelected;

  return (
    <View style={[styles.pill, size === 'small' ? styles.small : kind === 'tag' ? styles.tag : styles.value, { backgroundColor }]}>
      {icon && <Icon name={icon} color={TEXT_COLORS[tone]} size={16} />}
      <ThemedText
        type={kind === 'tag' ? 'eyebrow' : 'smallBold'}
        themeColor={TEXT_COLORS[tone]}
        style={size === 'small' && styles.smallText}>
        {label}
      </ThemedText>
    </View>
  );
}

/** How much a score went up or down, e.g. "+4 since last test". */
export function ScoreChangePill({ change, suffix = '' }: { change: number; suffix?: string }) {
  return (
    <Pill
      kind="value"
      tone={change > 0 ? 'accent' : change < 0 ? 'danger' : 'neutral'}
      label={`${formatScoreChange(change)}${suffix}`}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    borderRadius: Radius.full,
  },
  tag: {
    paddingHorizontal: Spacing.twoAndHalf,
    paddingVertical: Spacing.one + Spacing.half,
  },
  value: {
    paddingHorizontal: Spacing.twoAndHalf,
    paddingVertical: Spacing.one,
  },
  small: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  // A little smaller than a regular eyebrow, to fit beside a photo, but not so small it's hard to read.
  smallText: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
});
