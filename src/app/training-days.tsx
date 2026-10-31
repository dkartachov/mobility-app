import { useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { PressableScale } from '@/components/pressable-scale';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMonthTrainingDays, useStats } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  addMonths,
  formatDateKey,
  formatDuration,
  formatMonth,
  fromDateKey,
  monthWeeks,
  startOfMonth,
  todayKey,
  type DateKey,
} from '@/lib/dates';

const DAY_SIZE = 36;

/** The seven days from a Monday, for the row of weekday initials. */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => addDays('2024-01-01', i));

export default function TrainingDaysScreen() {
  const insets = useSafeAreaInsets();
  const stats = useStats();
  const today = todayKey();
  const currentMonth = startOfMonth(today);
  const [month, setMonth] = useState(currentMonth);
  const days = useMonthTrainingDays(month);

  // Nothing to see before the first session or past the current month.
  const firstMonth = stats?.firstSessionDate ? startOfMonth(stats.firstSessionDate) : currentMonth;
  const trained = new Set(days?.map((day) => day.date));
  const sessions = days?.reduce((total, day) => total + day.sessions, 0) ?? 0;
  const seconds = days?.reduce((total, day) => total + day.seconds, 0) ?? 0;

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader title="Training days" />
        <Card style={styles.calendar}>
          <View style={styles.monthRow}>
            <MonthButton
              label="Previous month"
              icon={{ ios: 'chevron.left', android: 'chevron_left' }}
              disabled={month <= firstMonth}
              onPress={() => setMonth(addMonths(month, -1))}
            />
            <ThemedText type="smallBold" accessibilityLiveRegion="polite" style={styles.monthName}>
              {formatMonth(month)}
            </ThemedText>
            <MonthButton
              label="Next month"
              icon={{ ios: 'chevron.right', android: 'chevron_right' }}
              disabled={month >= currentMonth}
              onPress={() => setMonth(addMonths(month, 1))}
            />
          </View>
          <View style={styles.week}>
            {WEEKDAYS.map((date) => (
              <View key={date} style={styles.cell}>
                <ThemedText type="eyebrow" themeColor="textSecondary">
                  {fromDateKey(date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </ThemedText>
              </View>
            ))}
          </View>
          {monthWeeks(month).map((week, i) => (
            <View key={i} style={styles.week}>
              {week.map((date, j) => (
                <View key={j} style={styles.cell}>
                  {date && <Day date={date} trained={trained.has(date)} today={today} />}
                </View>
              ))}
            </View>
          ))}
        </Card>
        <Card style={styles.summary}>
          <MonthStat value={String(days?.length ?? 0)} label="Days trained" />
          <MonthStat value={String(sessions)} label="Sessions" />
          <MonthStat value={formatDuration(seconds)} label="Time" />
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

type MonthButtonProps = {
  label: string;
  icon: ComponentProps<typeof Icon>['name'];
  disabled: boolean;
  onPress: () => void;
};

function MonthButton({ label, icon, disabled, onPress }: MonthButtonProps) {
  const theme = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.monthButton, { backgroundColor: theme.backgroundSelected }, disabled && styles.dimmed]}>
      <Icon name={icon} size={16} color="textSecondary" />
    </PressableScale>
  );
}

function Day({ date, trained, today }: { date: DateKey; trained: boolean; today: DateKey }) {
  const theme = useTheme();
  const isToday = date === today;

  return (
    <View
      accessible
      accessibilityLabel={`${formatDateKey(date)}: ${trained ? 'trained' : 'rest'}`}
      style={[
        styles.day,
        trained && { backgroundColor: theme.trained },
        isToday && !trained && { borderWidth: 2, borderColor: theme.trained, borderStyle: 'dashed' },
      ]}>
      <ThemedText type="small" themeColor={trained ? 'onTint' : date > today ? 'textSecondary' : 'text'}>
        {fromDateKey(date).getDate()}
      </ThemedText>
    </View>
  );
}

function MonthStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  calendar: {
    gap: Spacing.one,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  monthName: {
    flex: 1,
    textAlign: 'center',
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.4,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  day: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    borderRadius: DAY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
});
