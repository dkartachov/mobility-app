import { Stack, router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useReducer, useState, type ComponentProps } from 'react';
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
import { TimerBar } from '@/components/timer-bar';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { getTotalSeconds, logSession } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutCues, type WorkoutCue } from '@/hooks/use-workout-cues';
import { formatDuration } from '@/lib/dates';
import { getFastWorkouts } from '@/lib/dev-settings';
import { milestoneReached } from '@/lib/milestones';
import { countWorkoutForReminderPrompt } from '@/lib/reminder-prompt';
import { useColorScheme } from '@/lib/theme-preference';
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
    showDialog({
      title: 'Cancel workout?',
      message: "This workout won't be saved.",
      cancelLabel: 'Keep going',
      confirm: { label: 'Cancel workout', onPress: () => setCancelled(true) },
    });
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
    countWorkoutForReminderPrompt();
    setResult({ fromSeconds, toSeconds: fromSeconds + plannedSeconds });
  };

  if (result) return <WorkoutSummary {...result} />;

  return (
    <ThemedView style={styles.screen}>
      <ExerciseVideo photo={step.exercise.photo} animation={step.exercise.animation} />

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
        <View style={styles.timer} accessibilityLiveRegion="polite">
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
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [filled, setFilled] = useState(false);
  const reached = milestoneReached(fromSeconds, toSeconds);

  // Waits for Done, so nothing interrupts the summary and its milestone.
  const finish = () => {
    router.dismissTo('/');
    promptForReminderIfDue(db).catch(console.warn);
  };

  return (
    <ThemedView style={[styles.summary, { paddingBottom: insets.bottom + Spacing.three }]}>
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
            totalSeconds={toSeconds}
            animateFromSeconds={fromSeconds}
            durationMs={2000}
            delayMs={300}
            onAnimationEnd={() => setFilled(true)}
          />
        </Card>
        {filled && reached !== null && (
          <Animated.View entering={ZoomIn.springify()} style={styles.milestone}>
            <Tag label={`${reached}h milestone reached!`} highlighted />
          </Animated.View>
        )}
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
  clock: {
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -2,
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
  milestone: {
    alignItems: 'center',
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
