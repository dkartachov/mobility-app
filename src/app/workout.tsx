import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useReducer, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseVideo } from '@/components/exercise-video';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { logSession } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { BUFFER_SECONDS, DAILY_MINUTES, buildWorkout, formatClock, type WorkoutStep } from '@/lib/workout';

/** `buffer` is the get-ready countdown; `finished` only happens after the last exercise. */
type Phase = 'buffer' | 'active' | 'finished';

type PlayerState = {
  index: number;
  phase: Phase;
  remainingMs: number;
  paused: boolean;
  /** Time spent actually holding exercises (not buffers or pauses), logged as the session length. */
  activeMs: number;
};

type PlayerAction =
  | { type: 'tick'; deltaMs: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'goTo'; index: number };

const BUFFER_MS = BUFFER_SECONDS * 1000;
const TICK_MS = 250;

function startStep(state: PlayerState, index: number): PlayerState {
  return { ...state, index, phase: 'buffer', remainingMs: BUFFER_MS };
}

function createReducer(steps: WorkoutStep[]) {
  return function reducer(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
      case 'tick': {
        if (state.paused || state.phase === 'finished') return state;
        const elapsed = Math.min(action.deltaMs, state.remainingMs);
        const activeMs = state.phase === 'active' ? state.activeMs + elapsed : state.activeMs;
        const remainingMs = state.remainingMs - action.deltaMs;
        if (remainingMs > 0) return { ...state, remainingMs, activeMs };

        if (state.phase === 'buffer') {
          return { ...state, activeMs, phase: 'active', remainingMs: steps[state.index].durationSeconds * 1000 };
        }
        if (state.index < steps.length - 1) return startStep({ ...state, activeMs }, state.index + 1);
        return { ...state, activeMs, phase: 'finished', remainingMs: 0 };
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
  const [steps] = useState(() => buildWorkout(totalMinutes));

  return (
    <>
      <Stack.Screen options={{ title: `Daily · ${totalMinutes} min` }} />
      <WorkoutPlayer steps={steps} />
    </>
  );
}

function WorkoutPlayer({ steps }: { steps: WorkoutStep[] }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [startedAt] = useState(() => new Date());
  const [reducer] = useState(() => createReducer(steps));
  const [state, dispatch] = useReducer(reducer, {
    index: 0,
    phase: 'buffer',
    remainingMs: BUFFER_MS,
    paused: false,
    activeMs: 0,
  });
  const [completing, setCompleting] = useState(false);

  const running = !state.paused && state.phase !== 'finished';
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
  const phaseTotalMs = state.phase === 'buffer' ? BUFFER_MS : step.durationSeconds * 1000;

  const complete = async () => {
    setCompleting(true);
    await logSession(db, {
      startedAt,
      durationSeconds: Math.round(state.activeMs / 1000),
      routineId: 'daily',
    });
    router.dismissTo('/');
  };

  return (
    <ThemedView style={styles.screen}>
      <ExerciseVideo />

      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.info}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Exercise {state.index + 1} of {steps.length}
          </ThemedText>
          <ThemedText type="title" accessibilityRole="header">
            {step.exercise.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{step.exercise.stimulus}</ThemedText>
        </View>

        <View style={styles.timer} accessibilityLiveRegion="polite">
          <ThemedText type="smallBold" themeColor="tint">
            {finished ? 'Workout complete' : state.paused ? 'Paused' : state.phase === 'buffer' ? 'Get ready' : 'Hold'}
          </ThemedText>
          <ThemedText type="stat" style={styles.clock}>
            {formatClock(Math.ceil(state.remainingMs / 1000))}
          </ThemedText>
          <View style={styles.progress}>
            <ProgressBar progress={finished ? 1 : 1 - state.remainingMs / phaseTotalMs} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {finished
              ? 'Tap the checkmark to finish'
              : next
                ? `Next: ${next.exercise.name} · ${formatClock(next.durationSeconds)}`
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
          {finished ? (
            <ControlButton
              label="Complete workout"
              icon={{ ios: 'checkmark', android: 'check' }}
              primary
              disabled={completing}
              onPress={complete}
            />
          ) : (
            <ControlButton
              label="Next exercise"
              icon={{ ios: 'chevron.right', android: 'chevron_right' }}
              disabled={isLast}
              onPress={() => dispatch({ type: 'goTo', index: state.index + 1 })}
            />
          )}
        </View>
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
};

function ControlButton({ label, icon, onPress, primary, disabled }: ControlButtonProps) {
  const theme = useTheme();

  return (
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
});
