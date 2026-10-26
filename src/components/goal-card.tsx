import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Goal } from '@/db/goals';
import { daysBetween, formatDateKey, formatDuration, todayKey } from '@/lib/dates';

import { Card } from './card';
import { Icon } from './icon';
import { ProgressBar } from './progress-bar';
import { ThemedText } from './themed-text';

const STATUS_LABEL = { completed: 'Completed', expired: 'Ended' } as const;

type GoalCardProps = {
  goal: Goal;
  onDelete?: () => void;
};

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const targetSeconds = goal.targetMinutes * 60;
  const daysLeft = daysBetween(todayKey(), goal.endDate) + 1;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.title}>
          <Icon
            name={
              goal.status === 'completed'
                ? { ios: 'trophy.fill', android: 'emoji_events' }
                : { ios: 'flag.fill', android: 'flag' }
            }
            color="tint"
            size={18}
          />
          <ThemedText type="smallBold">{goal.title}</ThemedText>
        </View>
        {onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Delete goal ${goal.title}`}>
            <Icon name={{ ios: 'trash', android: 'delete' }} color="textSecondary" size={18} />
          </Pressable>
        )}
      </View>

      <ProgressBar progress={goal.progressSeconds / targetSeconds} />

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDuration(goal.progressSeconds)} of {formatDuration(targetSeconds)}
        </ThemedText>
        <ThemedText type="small" themeColor={goal.status === 'completed' ? 'tint' : 'textSecondary'}>
          {goal.status === 'active'
            ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
            : `${STATUS_LABEL[goal.status]} · ${formatDateKey(goal.endDate)}`}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
