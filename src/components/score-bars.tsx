import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { SCORE_AREAS, SCORE_COLOR_STOPS, SCORE_COLORS, type AreaScores } from '@/data/mobility-score';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

const BAR_HEIGHT = 180;
const BAR_WIDTH = 16;
const FILL_MS = 1200;
/** Each bar starts filling this long after the one before it. */
const STAGGER_MS = 80;

/** Red at the bottom of the track to green at the top, so a bar's top color matches its score. */
const GRADIENT = `linear-gradient(to top, ${SCORE_COLORS.map((color, i) => `${color} ${SCORE_COLOR_STOPS[i] * 100}%`).join(', ')})`;

type ScoreBarsProps = {
  /** 0–100 for each area, `null` for none yet. */
  scores: AreaScores;
  delayMs?: number;
};

/**
 * A vertical bar per score area, filling up from the bottom on mount and again from where it is
 * whenever its score changes.
 */
export function ScoreBars({ scores, delayMs = 0 }: ScoreBarsProps) {
  return (
    <View style={styles.row}>
      {SCORE_AREAS.map(({ id, label }, i) => (
        <ScoreBar key={id} label={label} score={scores[id]} delayMs={delayMs + i * STAGGER_MS} />
      ))}
    </View>
  );
}

function ScoreBar({ label, score, delayMs }: { label: string; score: number | null; delayMs: number }) {
  const theme = useTheme();
  const target = score === null ? 0 : Math.min(100, Math.max(0, score));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(withDelay(delayMs, withTiming(target, { duration: FILL_MS, easing: Easing.out(Easing.cubic) })));
    // Only the score restarts it; the delay is for the first fill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const fillStyle = useAnimatedStyle(() => ({ height: `${fill.get()}%` }));

  return (
    <View style={styles.column}>
      <ThemedText type="smallBold" themeColor={score === null ? 'textSecondary' : 'text'}>
        {score === null ? '—' : Math.round(target)}
      </ThemedText>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={score === null ? undefined : { min: 0, max: 100, now: Math.round(target) }}
        style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <Animated.View style={[styles.fill, fillStyle]}>
          {/* Full track height inside a clipped fill, so the gradient stays put as the fill grows. */}
          <View style={[styles.gradient, { backgroundImage: GRADIENT }]} />
        </Animated.View>
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_WIDTH / 2,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BAR_WIDTH / 2,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
  },
});
