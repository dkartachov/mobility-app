import { Stack, router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useReducer, useState, type ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseVideo } from '@/components/exercise-video';
import { Icon } from '@/components/icon';
import { MilestoneBar } from '@/components/milestone-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimerBar } from '@/components/timer-bar';
import { Spacing } from '@/constants/theme';
import { getTotalSeconds, logSession } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutCues, type WorkoutCue } from '@/hooks/use-workout-cues';
import { formatDuration } from '@/lib/dates';
import { getFastWorkouts } from '@/lib/dev-settings';
import { milestoneReached } from '@/lib/milestones';
import {
  BUFFER_SECONDS,
  DAILY_MINUTES,
  FAST_BUFFER_SECONDS,
  FAST_STEP_SECONDS,
  buildWorkout,
  formatClock,
  type WorkoutStep,
} from '@/lib/workout';

/** `buffer` is the get-ready countdown; `finished` only happens after the last exercise. */
type Phase = 'buffer' | 'active' | 'finished';

type PlayerState = {
  index: number;
  phase: Phase;
  remainingMs: number;
  paused: boolean;
  /** Bumped whenever a countdown (re)starts, so the timer bar knows to restart its fill. */
  countdown: number;
  /** The latest sound cue. Only set by the timer itself, so skipping around stays quiet. */
  cue?: { type: WorkoutCue };
};

type PlayerAction =
  | { type: 'tick'; deltaMs: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'goTo'; index: number };

const TICK_MS = 250;

/** When the "10 seconds" cue is spoken. */
const WARNING_MS = 10_000;

function createReducer(steps: WorkoutStep[], bufferMs: number) {
  function startStep(state: PlayerState, index: number): PlayerState {
    return { ...state, index, phase: 'buffer', remainingMs: bufferMs, countdown: state.countdown + 1 };
  }

  return function reducer(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
      case 'tick': {
        if (state.paused || state.phase === 'finished') return state;
        const remainingMs = state.remainingMs - action.deltaMs;
        if (remainingMs > 0) {
          // Holds too short for a real 10 s warning (dev fast mode) get it halfway, so the cue can still be heard.
          const warningMs = Math.min(WARNING_MS, (steps[state.index].durationSeconds * 1000) / 2);
          const crossedWarning =
            state.phase === 'active' && state.remainingMs > warningMs && remainingMs <= warningMs;
          return { ...state, remainingMs, cue: crossedWarning ? { type: 'tenSeconds' } : state.cue };
        }

        if (state.phase === 'buffer') {
          return {
            ...state,
            phase: 'active',
            remainingMs: steps[state.index].durationSeconds * 1000,
            countdown: state.countdown + 1,
          };
        }
        const next = steps[state.index + 1];
        if (next) {
          // Finishing the first side isn't the end of the exercise, so it gets the voice cue instead of the ding.
          return { ...startStep(state, state.index + 1), cue: { type: next.side === 2 ? 'switchSides' : 'done' } };
        }
        return { ...state, phase: 'finished', remainingMs: 0, cue: { type: 'done' } };
      }
      case 'pause':
        return { ...state, paused: true };
      case 'resume':
        return { ...state, paused: false };
      case 'reset':
        return startStep(state, state.index);
      case 'goTo':
        return startStep(state, Math.min(Math.max(action.index, 0), steps.length - 1));
    }
  };
}

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
    const built = buildWorkout(totalMinutes);
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
  const [reducer] = useState(() => createReducer(steps, bufferMs));
  const [state, dispatch] = useReducer(reducer, {
    index: 0,
    phase: 'buffer',
    remainingMs: bufferMs,
    paused: false,
    countdown: 0,
  });
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState<{ fromSeconds: number; toSeconds: number }>();
  const [cancelled, setCancelled] = useState(false);
  useWorkoutCues(state.cue);
  // A locked screen would background the app, pausing the cues mid-workout.
  useKeepAwake();

  // Leaving mid-workout loses it, so confirm first and then go all the way back to the start screen.
  usePreventRemove(!result && !cancelled, () => {
    Alert.alert('Cancel workout?', "This workout won't be saved.", [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Cancel workout', style: 'destructive', onPress: () => setCancelled(true) },
    ]);
  });
  // Runs after the re-render that lifts the prevention above, so this navigation isn't blocked.
  useEffect(() => {
    if (cancelled) router.dismissTo('/');
  }, [cancelled]);

  const running = !state.paused && state.phase !== 'finished' && !completing;
  useEffect(() => {
    if (!running) return;
    // Measure real elapsed time rather than trusting the interval, which drifts and stops in the background.
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      dispatch({ type: 'tick', deltaMs: now - last });
      last = now;
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const step = steps[state.index];
  const next = steps[state.index + 1];
  const isLast = state.index === steps.length - 1;
  const finished = state.phase === 'finished';
  const phaseTotalMs = state.phase === 'buffer' ? bufferMs : step.durationSeconds * 1000;
  // A two-sided exercise spans two steps but counts as one exercise.
  const exerciseCount = steps.filter((s) => s.side !== 2).length;
  const exerciseNumber = steps.slice(0, state.index + 1).filter((s) => s.side !== 2).length;

  const complete = async () => {
    setCompleting(true);
    const fromSeconds = await getTotalSeconds(db);
    await logSession(db, { startedAt, durationSeconds: plannedSeconds, routineId: 'daily' });
    setResult({ fromSeconds, toSeconds: fromSeconds + plannedSeconds });
  };

  if (result) return <WorkoutSummary {...result} />;

  return (
    <ThemedView style={styles.screen}>
      <ExerciseVideo photo={step.exercise.photo} />

      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.info}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Exercise {exerciseNumber} of {exerciseCount}
            {step.side ? ` · Side ${step.side} of 2` : ''}
          </ThemedText>
          <ThemedText type="title" accessibilityRole="header">
            {step.exercise.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{step.exercise.stimulus}</ThemedText>
        </View>

        <View style={styles.timer} accessibilityLiveRegion="polite">
          <ThemedText type="smallBold" themeColor="tint">
            {finished
              ? 'Workout complete'
              : state.paused
                ? 'Paused'
                : state.phase === 'buffer'
                  ? step.side === 2
                    ? 'Switch sides'
                    : 'Get ready'
                  : 'Hold'}
          </ThemedText>
          <ThemedText type="stat" style={styles.clock}>
            {formatClock(Math.ceil(state.remainingMs / 1000))}
          </ThemedText>
          <View style={styles.progress}>
            <TimerBar
              totalMs={phaseTotalMs}
              remainingMs={state.remainingMs}
              running={running}
              countdown={state.countdown}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {finished
              ? 'Tap the checkmark to finish'
              : next
                ? `Next: ${next.side === 2 ? 'other side' : next.exercise.name} · ${formatClock(next.durationSeconds)}`
                : 'Last exercise'}
          </ThemedText>
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
    </ThemedView>
  );
}

/** Shown after completing: the milestone bar grows by the time just logged. */
function WorkoutSummary({ fromSeconds, toSeconds }: { fromSeconds: number; toSeconds: number }) {
  const insets = useSafeAreaInsets();
  const [filled, setFilled] = useState(false);
  const reached = milestoneReached(fromSeconds, toSeconds);

  return (
    <ThemedView style={[styles.summary, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.summaryContent}>
        <ThemedText type="title" accessibilityRole="header" style={styles.centered}>
          Workout complete
        </ThemedText>
        <ThemedText type="subtitle" themeColor="tint" style={styles.centered}>
          +{formatDuration(toSeconds - fromSeconds)}
        </ThemedText>
        <View style={styles.summaryBar}>
          <ThemedText type="small" themeColor="textSecondary">
            Total mobility time · {formatDuration(toSeconds)}
          </ThemedText>
          <MilestoneBar
            totalSeconds={toSeconds}
            animateFromSeconds={fromSeconds}
            durationMs={2000}
            delayMs={300}
            onAnimationEnd={() => setFilled(true)}
          />
        </View>
        {filled && reached !== null && (
          <Animated.View entering={FadeIn}>
            <ThemedText type="smallBold" themeColor="tint" style={styles.centered}>
              {reached}h milestone reached!
            </ThemedText>
          </Animated.View>
        )}
      </View>
      <View style={styles.summaryDone}>
        {filled && (
          <Animated.View entering={ZoomIn}>
            <ControlButton
              label="Back to start"
              icon={{ ios: 'checkmark', android: 'check' }}
              primary
              onPress={() => router.dismissTo('/')}
            />
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

  return (
    <View>
      {glow && <Animated.View style={[styles.glow, { backgroundColor: theme.tint }]} />}
      <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: primary ? theme.tint : theme.backgroundElement },
        (pressed || disabled) && styles.dimmed,
        disabled && styles.disabled,
      ]}>
        <Icon name={icon} size={24} color={primary ? 'onTint' : 'text'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  info: {
    gap: Spacing.one,
  },
  timer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  clock: {
    fontSize: 72,
    lineHeight: 84,
  },
  progress: {
    alignSelf: 'stretch',
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
  dimmed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
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
  summary: {
    flex: 1,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  summaryContent: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  summaryBar: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  summaryDone: {
    height: 64,
    alignItems: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
