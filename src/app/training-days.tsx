import { useState, type ComponentProps } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
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
const MONTH_SLIDE_MS = 250;
/** A sideways drag this long takes over from the page's scrolling, */
const SWIPE_START = 12;
/** and changes month once it's dragged this far. */
const SWIPE_DISTANCE = 50;

/** The seven days from a Monday, for the row of weekday initials. */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => addDays('2024-01-01', i));

export default function TrainingDaysScreen() {
  const insets = useSafeAreaInsets();
  const stats = useStats();
  const today = todayKey();
  const currentMonth = startOfMonth(today);
  const [month, setMonth] = useState(currentMonth);
  const days = useMonthTrainingDays(month);

  /** Which way the last change went, so the new month slides in from that side. */
  const [direction, setDirection] = useState<1 | -1>(1);

  // Nothing to see before the first session or past the current month.
  const firstMonth = stats?.firstSessionDate ? startOfMonth(stats.firstSessionDate) : currentMonth;
  const canGoBack = month > firstMonth;
  const canGoForward = month < currentMonth;
  const trained = new Set(days?.map((day) => day.date));
  const sessions = days?.reduce((total, day) => total + day.sessions, 0) ?? 0;
  const seconds = days?.reduce((total, day) => total + day.seconds, 0) ?? 0;

  const changeMonth = (by: 1 | -1) => {
    if (by < 0 ? !canGoBack : !canGoForward) return;
    setDirection(by);
    setMonth(addMonths(month, by));
  };

  // Swiping the calendar sideways changes month too. Only clearly sideways drags count, so scrolling
  // the page up and down over it still works.
  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > SWIPE_START && Math.abs(dx) > Math.abs(dy) * 1.5,
    onPanResponderRelease: (_, { dx }) => {
      if (dx <= -SWIPE_DISTANCE) changeMonth(1);
      else if (dx >= SWIPE_DISTANCE) changeMonth(-1);
    },
  });

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader title="Training days" />
        <Card style={styles.calendar} {...swipe.panHandlers}>
          <View style={styles.monthRow}>
            <MonthButton
              label="Previous month"
              icon={{ ios: 'chevron.left', android: 'chevron_left' }}
              disabled={!canGoBack}
              onPress={() => changeMonth(-1)}
            />
            <ThemedText type="smallBold" accessibilityLiveRegion="polite" style={styles.monthName}>
              {formatMonth(month)}
            </ThemedText>
            <MonthButton
              label="Next month"
              icon={{ ios: 'chevron.right', android: 'chevron_right' }}
              disabled={!canGoForward}
              onPress={() => changeMonth(1)}
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
          <Animated.View
            key={month}
            entering={(direction > 0 ? FadeInRight : FadeInLeft).duration(MONTH_SLIDE_MS)}
            style={styles.weeks}>
            {monthWeeks(month).map((week, i) => (
              <View key={i} style={styles.week}>
                {week.map((date, j) => (
                  <View key={j} style={styles.cell}>
                    {date && <Day date={date} trained={trained.has(date)} today={today} />}
                  </View>
                ))}
              </View>
            ))}
          </Animated.View>
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
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
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
  weeks: {
    gap: Spacing.one,
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
