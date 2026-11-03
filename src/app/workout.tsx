import { Stack, router, useFocusEffect, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useReducer, useRef, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { css, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { showDialog } from '@/components/dialog';
import { ExerciseVideo } from '@/components/exercise-video';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { InstructionList } from '@/components/instruction-list';
import { MilestoneBar } from '@/components/milestone-bar';
import { Pager } from '@/components/pager';
import { PressableScale } from '@/components/pressable-scale';
import { promptForReminderIfDue } from '@/components/reminder-prompt';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeoutOverlay } from '@/components/timeout-overlay';
import { TimerBar } from '@/components/timer-bar';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { getTotalSeconds, logSession } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutCues } from '@/hooks/use-workout-cues';
import { formatDuration } from '@/lib/dates';
import { getFastWorkouts } from '@/lib/dev-settings';
import { milestoneReached } from '@/lib/milestones';
import { countWorkoutForReminderPrompt } from '@/lib/reminder-prompt';
import { useColorScheme } from '@/lib/theme-preference';
import { TIMEOUT_EXTEND_SECONDS, getTimeoutSeconds } from '@/lib/timeout-preference';
import {
  BUFFER_SECONDS,
  DAILY_MINUTES,
  FAST_BUFFER_SECONDS,
  FAST_STEP_SECONDS,
  buildWorkout,
  filterExercises,
  formatClock,
  type WorkoutStep,
} from '@/lib/workout';
import { getWorkoutFilters } from '@/lib/workout-filters';
import { createPlayerReducer } from '@/lib/workout-player';

const TICK_MS = 250;
/** Exactly on a milestone the bar counts as empty towards the next one, so it stops this far short. */
const JUST_BELOW_SECONDS = 0.001;
/** Leaves the full bar in view for a moment once the celebration has faded away. */
const RETURN_DELAY_MS = 800;

function parseMinutes(value: string | undefined) {
  const minutes = Number(value);
  return (DAILY_MINUTES as readonly number[]).includes(minutes) ? minutes : DAILY_MINUTES[0];
}

export default function WorkoutScreen() {
  const { minutes } = useLocalSearchParams<{ minutes: string }>();
  const totalMinutes = parseMinutes(minutes);
  // Read once: toggling fast mode mid-workout shouldn't change the running workout.
  const [fast] = useState(getFastWorkouts);
  const [steps] = useState(() => {
    const built = buildWorkout(totalMinutes, filterExercises(getWorkoutFilters()));
    return fast ? built.map((step) => ({ ...step, durationSeconds: FAST_STEP_SECONDS })) : built;
  });

  return (
    <>
      <Stack.Screen options={{ title: `Daily · ${totalMinutes} min` }} />
      <WorkoutPlayer
        steps={steps}
        bufferMs={(fast ? FAST_BUFFER_SECONDS : BUFFER_SECONDS) * 1000}
        plannedSeconds={totalMinutes * 60}
      />
    </>
  );
}

type WorkoutPlayerProps = {
  steps: WorkoutStep[];
  bufferMs: number;
  /** Logged as the session length on completion, even if exercises were skipped. */
  plannedSeconds: number;
};

function WorkoutPlayer({ steps, bufferMs, plannedSeconds }: WorkoutPlayerProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [startedAt] = useState(() => new Date());
  const [reducer] = useState(() => createPlayerReducer(steps, bufferMs));
  const [state, dispatch] = useReducer(reducer, {
    index: 0,
    phase: 'buffer',
    remainingMs: bufferMs,
    paused: false,
    countdown: 0,
  });
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState<{ fromSeconds: number; toSeconds: number }>();
  const [leaving, setLeaving] = useState(false);
  useWorkoutCues(state.cue);
  // A locked screen would background the app, pausing the cues mid-workout.
  useKeepAwake();

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

  const onTimeout = state.timeoutMs !== undefined;
  const running = !state.paused && state.phase !== 'finished' && !completing && !onTimeout;
  const ticking = running || onTimeout;
  useEffect(() => {
    if (!ticking) return;
    // Measure real elapsed time rather than trusting the interval, which drifts and stops in the background.
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      dispatch({ type: 'tick', deltaMs: now - last });
      last = now;
    }, TICK_MS);
    return () => clearInterval(id);
  }, [ticking]);

  const step = steps[state.index];
  const isLast = state.index === steps.length - 1;
  const finished = state.phase === 'finished';
  const phaseTotalMs = state.phase === 'buffer' ? bufferMs : step.durationSeconds * 1000;
  // A two-sided exercise spans two steps but counts as one exercise.
  const exerciseCount = steps.filter((s) => s.side !== 2).length;
  const exerciseNumber = steps.slice(0, state.index + 1).filter((s) => s.side !== 2).length;
  const gettingReady = state.phase === 'buffer';
  const timerLabel = finished ? 'Done' : state.paused ? 'Paused' : gettingReady ? 'Get ready' : '';

  const complete = async () => {
    setCompleting(true);
    const fromSeconds = await getTotalSeconds(db);
    await logSession(db, { startedAt, durationSeconds: plannedSeconds, routineId: 'daily' });
    countWorkoutForReminderPrompt();
    setResult({ fromSeconds, toSeconds: fromSeconds + plannedSeconds });
  };

  if (result) return <WorkoutSummary {...result} onLeave={() => setLeaving(true)} />;

  return (
    <ThemedView style={styles.screen}>
      <View>
        <ExerciseVideo photo={step.exercise.photo} animation={step.exercise.animation} />
        {/* Dims slightly while getting ready, so it's clear the hold hasn't started. */}
        <Animated.View pointerEvents="none" style={[cssStyles.dim, { opacity: gettingReady ? 1 : 0 }]} />
      </View>

      <View style={styles.status}>
        <WorkoutProgress count={exerciseCount} current={exerciseNumber} finished={finished} />
        <View style={styles.tags}>
          <Tag label={`Exercise ${exerciseNumber} of ${exerciseCount}`} />
          <Tag label={step.exercise.active ? 'Active' : 'Passive'} />
          {step.side && <Tag label={`Side ${step.side} of 2`} highlighted />}
        </View>
      </View>

      {/* Takes up whatever space is left, so long names or instructions scroll instead of moving the timer. */}
      <Pager>
        <ScrollView key={state.index} contentContainerStyle={styles.page}>
          <ThemedText type="title" accessibilityRole="header">
            {step.exercise.name}
          </ThemedText>
          <View style={styles.stimulus}>
            <ThemedText type="eyebrow" themeColor="textSecondary">
              Stimulus
            </ThemedText>
            <ThemedText>{step.exercise.stimulus}</ThemedText>
          </View>
        </ScrollView>
        <ScrollView key={state.index} contentContainerStyle={styles.page}>
          <InstructionList instructions={step.exercise.instructions} />
        </ScrollView>
      </Pager>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.timer}>
          {/* Always laid out, so the clock doesn't move when the label comes and goes. */}
          <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.timerLabel}>
            {timerLabel}
          </ThemedText>
          <View style={styles.clockRow}>
            <ThemedText type="stat" style={styles.clock} accessibilityLiveRegion="polite">
              {formatClock(Math.ceil(state.remainingMs / 1000))}
            </ThemedText>
            <TimeoutButton
              disabled={!running}
              onPress={() => dispatch({ type: 'startTimeout', seconds: getTimeoutSeconds() })}
            />
          </View>
          <View style={styles.progress}>
            <TimerBar
              totalMs={phaseTotalMs}
              remainingMs={state.remainingMs}
              running={running}
              countdown={state.countdown}
              color={gettingReady ? 'textSecondary' : 'tint'}
            />
          </View>
        </View>

        <View style={styles.controls}>
          <ControlButton
            label="Previous exercise"
            icon={{ ios: 'chevron.left', android: 'chevron_left' }}
            disabled={state.index === 0}
            onPress={() => dispatch({ type: 'goTo', index: state.index - 1 })}
          />
          <ControlButton
            label="Reset timer"
            icon={{ ios: 'arrow.counterclockwise', android: 'restart_alt' }}
            onPress={() => dispatch({ type: 'reset' })}
          />
          <ControlButton
            label={state.paused ? 'Resume' : 'Pause'}
            icon={state.paused ? { ios: 'play.fill', android: 'play_arrow' } : { ios: 'pause.fill', android: 'pause' }}
            primary
            disabled={finished}
            onPress={() => dispatch({ type: state.paused ? 'resume' : 'pause' })}
          />
          {isLast ? (
            <ControlButton
              label="Complete workout"
              icon={{ ios: 'checkmark', android: 'check' }}
              primary
              glow={finished}
              disabled={completing}
              onPress={complete}
            />
          ) : (
            <ControlButton
              label="Next exercise"
              icon={{ ios: 'chevron.right', android: 'chevron_right' }}
              onPress={() => dispatch({ type: 'goTo', index: state.index + 1 })}
            />
          )}
        </View>
      </View>

      {state.timeoutMs !== undefined && (
        <TimeoutOverlay
          remainingMs={state.timeoutMs}
          onExtend={() => dispatch({ type: 'extendTimeout', seconds: TIMEOUT_EXTEND_SECONDS })}
          onResume={() => dispatch({ type: 'endTimeout' })}
        />
      )}
    </ThemedView>
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
      {/* No back button or swipe: Done is the way out. */}
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={styles.summaryContent}>
        <Animated.View entering={ZoomIn.springify()} style={styles.summaryBadge}>
          <IconBadge name={{ ios: 'checkmark', android: 'check' }} size={96} />
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

type ControlButtonProps = {
  label: string;
  icon: ComponentProps<typeof Icon>['name'];
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  /** Pulses a halo around the button to draw attention to it. */
  glow?: boolean;
};

function ControlButton({ label, icon, onPress, primary, disabled, glow }: ControlButtonProps) {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <View>
      {glow && <Animated.View style={[cssStyles.glow, { backgroundColor: theme.tint }]} />}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        pressedScale={0.9}
        style={[
          styles.control,
          primary
            ? { backgroundColor: theme.tint, boxShadow: `0 6px 16px ${theme.tint}55` }
            : [{ backgroundColor: theme.backgroundElement }, Elevation[scheme]],
          disabled && styles.disabled,
        ]}>
        <Icon name={icon} size={26} color={primary ? 'onTint' : 'text'} />
      </PressableScale>
    </View>
  );
}

/** Sits beside the clock, so it doesn't crowd the row of controls or get pressed instead of them. */
function TimeoutButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.timeoutButton,
        { backgroundColor: theme.backgroundElement },
        Elevation[scheme],
        disabled && styles.disabled,
      ]}>
      <ThemedText type="smallBold">Timeout</ThemedText>
    </PressableScale>
  );
}

/** A small pill label. `highlighted` uses the accent color for the current state. */
function Tag({ label, highlighted }: { label: string; highlighted?: boolean }) {
  const theme = useTheme();

  return (
    <View style={[styles.tag, { backgroundColor: highlighted ? theme.tintSoft : theme.backgroundSelected }]}>
      <ThemedText type="eyebrow" themeColor={highlighted ? 'tint' : 'textSecondary'}>
        {label}
      </ThemedText>
    </View>
  );
}

/** One segment per exercise: done ones filled, the current one half-tinted. */
function WorkoutProgress({ count, current, finished }: { count: number; current: number; finished: boolean }) {
  const theme = useTheme();

  return (
    <View style={styles.segments} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => {
        const done = finished || i + 1 < current;
        const active = !finished && i + 1 === current;
        return (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: done || active ? theme.tint : theme.backgroundSelected },
              active && styles.activeSegment,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  status: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  page: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  stimulus: {
    gap: Spacing.half,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  segments: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  activeSegment: {
    opacity: 0.45,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.full,
  },
  timer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  timerLabel: {
    height: 16,
    marginBottom: -Spacing.two,
  },
  clockRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: {
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -2,
  },
  timeoutButton: {
    position: 'absolute',
    right: 0,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: Radius.full,
  },
  progress: {
    alignSelf: 'stretch',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  summaryLabel: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  control: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  summary: {
    flex: 1,
    padding: Spacing.three,
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

/** Reanimated CSS animations, which React Native's `StyleSheet.create` doesn't type. */
const cssStyles = css.create({
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    transitionProperty: 'opacity',
    transitionDuration: 300,
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 32,
    animationName: {
      from: { opacity: 0.6, transform: [{ scale: 1 }] },
      to: { opacity: 0, transform: [{ scale: 1.7 }] },
    },
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-out',
  },
});
