import { Stack, router, useFocusEffect, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Burst } from '@/components/burst';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { showDialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { MilestoneBar } from '@/components/milestone-bar';
import { promptForReminderIfDue } from '@/components/reminder-prompt';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutPlayer } from '@/components/workout-player';
import { Spacing } from '@/constants/theme';
import { getTotalSeconds, logSession } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/dates';
import { getFastWorkouts } from '@/lib/dev-settings';
import { milestoneReached } from '@/lib/milestones';
import { countWorkoutForReminderPrompt } from '@/lib/reminder-prompt';
import {
  BUFFER_SECONDS,
  DAILY_MINUTES,
  FAST_BUFFER_SECONDS,
  FAST_STEP_SECONDS,
  buildWorkout,
  filterExercises,
} from '@/lib/workout';
import { getWorkoutFilters } from '@/lib/workout-filters';

/** Exactly on a milestone the bar counts as empty towards the next one, so it stops this far short. */
const JUST_BELOW_SECONDS = 0.001;
/** Leaves the full bar in view for a moment once the celebration has faded away. */
const RETURN_DELAY_MS = 800;
const SUMMARY_BADGE_SIZE = 96;
/** The summary's burst waits for its check mark to zoom in. */
const BURST_DELAY_MS = 250;
const BURST_MS = 900;

function parseMinutes(value: string | undefined) {
  const minutes = Number(value);
  return (DAILY_MINUTES as readonly number[]).includes(minutes) ? minutes : DAILY_MINUTES[0];
}

export default function WorkoutScreen() {
  const db = useSQLiteContext();
  const { minutes } = useLocalSearchParams<{ minutes: string }>();
  const totalMinutes = parseMinutes(minutes);
  // Read once: toggling fast mode mid-workout shouldn't change the running workout.
  const [fast] = useState(getFastWorkouts);
  const [steps] = useState(() => {
    const built = buildWorkout(totalMinutes, filterExercises(getWorkoutFilters()));
    return fast ? built.map((step) => ({ ...step, durationSeconds: FAST_STEP_SECONDS })) : built;
  });
  const [startedAt] = useState(() => new Date());
  const [result, setResult] = useState<{ fromSeconds: number; toSeconds: number }>();
  const [leaving, setLeaving] = useState(false);

  // Leaving mid-workout loses it, so confirm first and then go all the way back to the start screen.
  // The summary has nothing to confirm: going back does nothing there, and only its Done button leaves.
  usePreventRemove(!leaving, () => {
    if (result) return;
    showDialog({
      title: 'Cancel workout?',
      message: "This workout won't be saved.",
      cancelLabel: 'Keep going',
      confirm: { label: 'Cancel workout', onPress: () => setLeaving(true) },
    });
  });
  // Runs after the re-render that lifts the prevention above, so this navigation isn't blocked.
  useEffect(() => {
    if (leaving) router.dismissTo('/');
  }, [leaving]);

  // Logged as the planned length, even if exercises were skipped.
  const complete = async () => {
    const plannedSeconds = totalMinutes * 60;
    const fromSeconds = await getTotalSeconds(db);
    await logSession(db, { startedAt, durationSeconds: plannedSeconds, routineId: 'daily' });
    countWorkoutForReminderPrompt();
    setResult({ fromSeconds, toSeconds: fromSeconds + plannedSeconds });
  };

  return (
    <>
      <Stack.Screen options={{ title: `Daily · ${totalMinutes} min` }} />
      {result ? (
        <WorkoutSummary {...result} onLeave={() => setLeaving(true)} />
      ) : (
        <WorkoutPlayer
          steps={steps}
          bufferMs={(fast ? FAST_BUFFER_SECONDS : BUFFER_SECONDS) * 1000}
          completeLabel="Complete workout"
          onComplete={complete}
          onBack={() => router.back()}
        />
      )}
    </>
  );
}

type WorkoutSummaryProps = {
  fromSeconds: number;
  toSeconds: number;
  onLeave: () => void;
};

/**
 * Shown after completing: the milestone bar grows by the time just logged. If that reaches a
 * milestone it stops full and opens the celebration, then carries on towards the next one on return.
 */
function WorkoutSummary({ fromSeconds, toSeconds, onLeave }: WorkoutSummaryProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [filled, setFilled] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const celebrating = useRef(false);
  const reached = milestoneReached(fromSeconds, toSeconds);
  const stopsAtMilestone = reached !== null && !celebrated;
  const theme = useTheme();

  // Bursts as the check mark lands.
  const burst = useSharedValue(0);
  useEffect(() => {
    burst.set(withDelay(BURST_DELAY_MS, withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) })));
  }, [burst]);

  useFocusEffect(
    useCallback(() => {
      if (celebrating.current) setCelebrated(true);
    }, [])
  );

  const onBarFilled = () => {
    if (stopsAtMilestone) {
      celebrating.current = true;
      router.push({ pathname: '/milestone-reached', params: { hours: reached } });
    } else {
      setFilled(true);
    }
  };

  // Waits for Done, so nothing interrupts the summary and its milestone.
  const finish = () => {
    onLeave();
    promptForReminderIfDue(db).catch(console.warn);
  };

  return (
    <ThemedView
      style={[styles.summary, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three }]}>
      {/* No back button (the workout's own is gone with it) or swipe: Done is the way out. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.summaryContent}>
        <Animated.View entering={ZoomIn.springify()} style={styles.summaryBadge}>
          <Burst progress={burst} size={SUMMARY_BADGE_SIZE} colors={[theme.tint, theme.trained]} reach={1.1} />
          <IconBadge name={{ ios: 'checkmark', android: 'check' }} size={SUMMARY_BADGE_SIZE} />
        </Animated.View>
        <View style={styles.summaryTitle}>
          <ThemedText type="title" accessibilityRole="header" style={styles.centered}>
            Workout complete
          </ThemedText>
          <ThemedText type="stat" themeColor="tint" style={styles.centered}>
            +{formatDuration(toSeconds - fromSeconds)}
          </ThemedText>
        </View>
        <Card style={styles.summaryBar}>
          <View style={styles.summaryRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.summaryLabel}>
              Total mobility time
            </ThemedText>
            <ThemedText type="smallBold">{formatDuration(toSeconds)}</ThemedText>
          </View>
          <MilestoneBar
            totalSeconds={stopsAtMilestone ? reached * 3600 - JUST_BELOW_SECONDS : toSeconds}
            animateFromSeconds={fromSeconds}
            durationMs={2000}
            delayMs={celebrated ? RETURN_DELAY_MS : 300}
            onAnimationEnd={onBarFilled}
          />
        </Card>
      </View>
      <View style={styles.summaryDone}>
        {filled && (
          <Animated.View entering={FadeInDown.springify()}>
            <Button title="Done" onPress={finish} />
          </Animated.View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  summaryLabel: {
    flex: 1,
  },
  summary: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    justifyContent: 'space-between',
  },
  summaryContent: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  summaryBadge: {
    alignItems: 'center',
  },
  summaryTitle: {
    gap: Spacing.one,
  },
  summaryBar: {
    gap: Spacing.three,
  },
  // Reserves the button's space so the content above doesn't shift when it appears.
  summaryDone: {
    minHeight: 56,
  },
  centered: {
    textAlign: 'center',
  },
});
