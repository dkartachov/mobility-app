import { StyleSheet, View } from 'react-native';

import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, type DateKey } from '@/lib/dates';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

const DOT = 32;

type WeekStripProps = {
  days: { date: DateKey; trained: boolean }[];
  /** Fill of untrained days; pick one that stands out from the card behind. */
  emptyColor?: ThemeColor;
};

/** One dot per day, filled with a check on trained days. The last day is today and gets a ring. */
export function WeekStrip({ days, emptyColor = 'backgroundSelected' }: WeekStripProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {days.map(({ date, trained }, i) => {
        const day = fromDateKey(date);
        const isToday = i === days.length - 1;
        return (
          <View
            key={date}
            accessible
            accessibilityLabel={`${day.toLocaleDateString(undefined, { weekday: 'long' })}: ${trained ? 'trained' : 'rest'}`}
            style={styles.day}>
            <ThemedText type="eyebrow" themeColor={isToday ? 'text' : 'textSecondary'}>
              {day.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </ThemedText>
            <View
              style={[
                styles.dot,
                trained
                  ? { backgroundColor: theme.streak }
                  : { backgroundColor: theme[emptyColor] },
                isToday && !trained && { borderWidth: 2, borderColor: theme.streak, borderStyle: 'dashed' },
              ]}>
              {trained && <Icon name={{ ios: 'checkmark', android: 'check' }} size={16} color="onTint" />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
