import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Goal } from '@/db/goals';
import { daysBetween, formatDateKey, formatDuration, todayKey } from '@/lib/dates';

import { Card } from './card';
import { Icon } from './icon';
import { IconBadge } from './icon-badge';
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
  const percent = Math.min(100, Math.round((goal.progressSeconds / targetSeconds) * 100));

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconBadge
          name={
            goal.status === 'completed'
              ? { ios: 'trophy.fill', android: 'emoji_events' }
              : { ios: 'flag.fill', android: 'flag' }
          }
          color={goal.status === 'expired' ? 'textSecondary' : 'tint'}
          background={goal.status === 'expired' ? 'backgroundSelected' : 'tintSoft'}
          size={32}
        />
        <View style={styles.title}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {goal.title}
          </ThemedText>
          <ThemedText type="small" themeColor={goal.status === 'completed' ? 'tint' : 'textSecondary'}>
            {goal.status === 'active'
              ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
              : `${STATUS_LABEL[goal.status]} · ${formatDateKey(goal.endDate)}`}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" themeColor={goal.status === 'expired' ? 'textSecondary' : 'tint'}>
          {percent}%
        </ThemedText>
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

      <ThemedText type="small" themeColor="textSecondary">
        {formatDuration(goal.progressSeconds)} of {formatDuration(targetSeconds)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    flex: 1,
  },
});
