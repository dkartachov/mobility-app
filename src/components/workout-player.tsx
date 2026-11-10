import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useReducer, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  css,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseVideo } from '@/components/exercise-video';
import { Icon } from '@/components/icon';
import { InstructionList } from '@/components/instruction-list';
import { Pager } from '@/components/pager';
import { Pill } from '@/components/pill';
import { PressableScale } from '@/components/pressable-scale';
import { ScrollView } from '@/components/scroll-view';
import { BackButton, HEADER_HEIGHT } from '@/components/stack-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeoutOverlay } from '@/components/timeout-overlay';
import { TimerBar, useCountdownProgress } from '@/components/timer-bar';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutCues } from '@/hooks/use-workout-cues';
import { haptic } from '@/lib/haptics';
import { useColorScheme } from '@/lib/theme-preference';
import { TIMEOUT_EXTEND_SECONDS, getTimeoutSeconds } from '@/lib/timeout-preference';
import { formatClock, type WorkoutStep } from '@/lib/workout';
import { createPlayerReducer, stepBufferMs } from '@/lib/workout-player';

const TICK_MS = 250;
/** A hold's last seconds, counted down with a pulse. */
const FINAL_SECONDS = 3;
/** How long a new exercise takes to fade in. */
const CHANGE_MS = 300;

type WorkoutPlayerProps = {
  steps: WorkoutStep[];
  /** Get-ready countdown before each exercise. */
  bufferMs: number;
  /** Get-ready countdown before a two-sided exercise's second side, `bufferMs` when not set. */
  sideSwitchBufferMs?: number;
  /** Accessibility label of the button on the last exercise that finishes. */
  completeLabel: string;
  /** Called once, when the finish button is pressed. */
  onComplete: () => void;
  /** The back button. Confirming that leaving loses progress is up to the screen. */
  onBack: () => void;
};

/**
 * Plays timed steps one after another, each with a get-ready countdown, sound and voice cues,
 * timeouts and skipping. What finishing and leaving do is up to the screen it's on.
 */
export function WorkoutPlayer({
  steps,
  bufferMs,
  sideSwitchBufferMs = bufferMs,
  completeLabel,
  onComplete,
  onBack,
}: WorkoutPlayerProps) {
  const insets = useSafeAreaInsets();
  const [reducer] = useState(() => createPlayerReducer(steps, bufferMs, sideSwitchBufferMs));
  const [state, dispatch] = useReducer(reducer, {
    index: 0,
    phase: 'buffer',
    remainingMs: stepBufferMs(steps[0], bufferMs, sideSwitchBufferMs),
    paused: false,
    countdown: 0,
  });
  const [completing, setCompleting] = useState(false);
  useWorkoutCues(state.cue);
  // A locked screen would background the app, pausing the cues mid-workout.
  useKeepAwake();

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
  const phaseTotalMs =
    state.phase === 'buffer' ? stepBufferMs(step, bufferMs, sideSwitchBufferMs) : step.durationSeconds * 1000;
  // A two-sided exercise spans two steps but counts as one exercise.
  const exerciseCount = steps.filter((s) => s.side !== 2).length;
  const exerciseNumber = steps.slice(0, state.index + 1).filter((s) => s.side !== 2).length;
  const gettingReady = state.phase === 'buffer';
  const timerLabel = finished ? 'Done' : state.paused ? 'Paused' : gettingReady ? 'Get ready' : '';
  const countdown = { totalMs: phaseTotalMs, remainingMs: state.remainingMs, running, countdown: state.countdown };
  // A two-sided exercise's progress segment fills one half per side.
  const segmentSpan: [number, number] = step.side === 1 ? [0, 0.5] : step.side === 2 ? [0.5, 1] : [0, 1];

  // The last seconds of a hold count down with a pulse of the clock and a tick.
  const secondsLeft = Math.ceil(state.remainingMs / 1000);
  const finalSeconds = state.phase === 'active' && running && secondsLeft > 0 && secondsLeft <= FINAL_SECONDS;
  const clockScale = useSharedValue(1);
  useEffect(() => {
    if (!finalSeconds) return;
    haptic.select();
    clockScale.set(withSequence(withTiming(1.12, { duration: 120 }), withSpring(1, { damping: 12, stiffness: 220 })));
  }, [finalSeconds, secondsLeft, clockScale]);
  const clockStyle = useAnimatedStyle(() => ({ transform: [{ scale: clockScale.get() }] }));

  const complete = () => {
    setCompleting(true);
    onComplete();
  };

  return (
    <ThemedView style={styles.screen}>
      {/* In place of the stack header, which this screen hides. */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <BackButton onPress={onBack} />
      </View>
      <View>
        {/* Fades in each new exercise, rather than snapping to it; the second side is the same exercise, so it stays. */}
        <Animated.View key={step.exercise.id} entering={FadeIn.duration(CHANGE_MS)}>
          <ExerciseVideo photo={step.exercise.photo} animation={step.exercise.animation} paused={state.paused || onTimeout} />
        </Animated.View>
        {/* Dims slightly while getting ready, so it's clear the hold hasn't started. */}
        <Animated.View pointerEvents="none" style={[cssStyles.dim, { opacity: gettingReady ? 1 : 0 }]} />
      </View>

      <View style={styles.status}>
        <WorkoutProgress
          count={exerciseCount}
          current={exerciseNumber}
          finished={finished}
          countdown={countdown}
          filling={state.phase === 'active'}
          span={segmentSpan}
        />
        <View style={styles.tags}>
          <Pill label={`Exercise ${exerciseNumber} of ${exerciseCount}`} />
          <Pill label={step.exercise.active ? 'Active' : 'Passive'} />
          {step.side && <Pill label={`Side ${step.side} of 2`} tone="accent" />}
        </View>
      </View>

      {/* Takes up whatever space is left, so long names or instructions scroll instead of moving the timer. */}
      <Pager>
        <ScrollView key={state.index} contentContainerStyle={styles.page}>
          <Animated.View entering={FadeIn.duration(CHANGE_MS)} style={styles.pageContent}>
            <ThemedText type="title" accessibilityRole="header">
              {step.exercise.name}
            </ThemedText>
            <View style={styles.stimulus}>
              <ThemedText type="eyebrow" themeColor="textSecondary">
                Stimulus
              </ThemedText>
              <ThemedText>{step.exercise.stimulus}</ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
        <ScrollView key={state.index} contentContainerStyle={styles.page}>
          <Animated.View entering={FadeIn.duration(CHANGE_MS)} style={styles.pageContent}>
            <InstructionList instructions={step.exercise.instructions} />
          </Animated.View>
        </ScrollView>
      </Pager>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.timer}>
          {/* Always laid out, so the clock doesn't move when the label comes and goes. */}
          <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.timerLabel}>
            {timerLabel}
          </ThemedText>
          <View style={styles.clockRow}>
            <Animated.View style={clockStyle}>
              <ThemedText
                type="stat"
                themeColor={finalSeconds ? 'tint' : 'text'}
                style={styles.clock}
                accessibilityLiveRegion="polite">
                {formatClock(secondsLeft)}
              </ThemedText>
            </Animated.View>
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
              label={completeLabel}
              icon={{ ios: 'checkmark', android: 'check' }}
              primary
              glow={finished}
              finishes
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

type ControlButtonProps = {
  label: string;
  icon: ComponentProps<typeof Icon>['name'];
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  /** Pulses a halo around the button to draw attention to it. */
  glow?: boolean;
  /** Completes the workout, so it gets the success haptic instead of a tap. */
  finishes?: boolean;
};

function ControlButton({ label, icon, onPress, primary, disabled, glow, finishes }: ControlButtonProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  // CSS animations don't follow the reduce motion setting themselves, so it gets a still halo instead.
  const reducedMotion = useReducedMotion();

  return (
    <View>
      {glow && (
        <Animated.View
          style={[reducedMotion ? styles.stillGlow : cssStyles.glow, { backgroundColor: theme.tint }]}
        />
      )}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        pressedScale={0.9}
        onPress={() => {
          if (finishes) haptic.success();
          else haptic.tap();
          onPress();
        }}
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
      onPress={() => {
        haptic.tap();
        onPress();
      }}
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

type WorkoutProgressProps = {
  count: number;
  current: number;
  finished: boolean;
  /** The step's countdown, which the current segment fills along with. */
  countdown: Parameters<typeof useCountdownProgress>[0];
  /** Whether the hold is on; the get-ready countdown doesn't fill anything. */
  filling: boolean;
  /** The part of the current segment this step fills, e.g. its second half for side 2. */
  span: [number, number];
};

/** One segment per exercise: done ones filled, the current one filling as its hold runs. */
function WorkoutProgress({ count, current, finished, countdown, filling, span }: WorkoutProgressProps) {
  const theme = useTheme();

  return (
    <View style={styles.segments} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => {
        const done = finished || i + 1 < current;
        const active = !finished && i + 1 === current;
        return (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: done ? theme.tint : theme.backgroundSelected }]}>
            {active && <SegmentFill countdown={countdown} filling={filling} span={span} />}
          </View>
        );
      })}
    </View>
  );
}

function SegmentFill({ countdown, filling, span: [from, to] }: Pick<WorkoutProgressProps, 'countdown' | 'filling' | 'span'>) {
  const theme = useTheme();
  const progress = useCountdownProgress(countdown);
  const fillStyle = useAnimatedStyle(() => {
    const fraction = from + (to - from) * (filling ? Math.min(1, Math.max(0, progress.get())) : 0);
    return { width: `${fraction * 100}%` };
  });

  return <Animated.View style={[styles.segmentFill, { backgroundColor: theme.tint }, fillStyle]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    justifyContent: 'center',
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: Spacing.screen,
  },
  status: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  page: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  stimulus: {
    gap: Spacing.half,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
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
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pageContent: {
    gap: Spacing.three,
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
    paddingHorizontal: Spacing.twoAndHalf,
    borderRadius: Radius.full,
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
  disabled: {
    opacity: 0.3,
  },
  stillGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 32,
    opacity: 0.3,
    transform: [{ scale: 1.3 }],
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
