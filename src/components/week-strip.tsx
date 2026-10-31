import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, todayKey, type DateKey } from '@/lib/dates';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

const DOT = 28;

type WeekStripProps = {
  days: { date: DateKey; trained: boolean }[];
};

/** One dot per day, filled with a check on trained days. Today gets a ring until it's trained. */
export function WeekStrip({ days }: WeekStripProps) {
  const theme = useTheme();
  const today = todayKey();

  return (
    <View style={styles.row}>
      {days.map(({ date, trained }) => {
        const day = fromDateKey(date);
        const isToday = date === today;
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
                { backgroundColor: trained ? theme.trained : theme.backgroundSelected },
                isToday && !trained && { borderWidth: 2, borderColor: theme.trained, borderStyle: 'dashed' },
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
    gap: Spacing.one,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
