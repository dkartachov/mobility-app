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
import {
  formatScoreChange,
  SCORE_AREAS,
  SCORE_COLOR_STOPS,
  SCORE_COLORS,
  scoreChange,
  type AreaScores,
} from '@/data/mobility-score';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

const BAR_HEIGHT = 180;
const BAR_WIDTH = 10;
const FILL_MS = 1200;
/** Each bar starts filling this long after the one before it. */
const STAGGER_MS = 80;

/** Red at the bottom of the track to green at the top, so a bar's top color matches its score. */
const GRADIENT = `linear-gradient(to top, ${SCORE_COLORS.map((color, i) => `${color} ${SCORE_COLOR_STOPS[i] * 100}%`).join(', ')})`;

type ScoreBarsProps = {
  /** 0–100 for each area, `null` for none yet. */
  scores: AreaScores;
  /** Scores from the previous test, to show each area's change under its label. */
  previous?: AreaScores | null;
  delayMs?: number;
};

/**
 * A vertical bar per score area, filling up from the bottom on mount and again from where it is
 * whenever its score changes.
 */
export function ScoreBars({ scores, previous, delayMs = 0 }: ScoreBarsProps) {
  return (
    <View style={styles.row}>
      {SCORE_AREAS.map(({ id, label }, i) => (
        <ScoreBar
          key={id}
          label={label}
          score={scores[id]}
          // `undefined` without a previous test, so no change row shows at all.
          change={previous ? scoreChange(scores[id], previous[id]) : undefined}
          delayMs={delayMs + i * STAGGER_MS}
        />
      ))}
    </View>
  );
}

type ScoreBarProps = {
  label: string;
  score: number | null;
  /** Points since the previous test, `null` if either test has no score for this area. */
  change: number | null | undefined;
  delayMs: number;
};

function ScoreBar({ label, score, change, delayMs }: ScoreBarProps) {
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
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.label}>
        {label}
      </ThemedText>
      {change !== undefined && (
        <ThemedText
          type="smallBold"
          themeColor={change === null || change === 0 ? 'textSecondary' : change > 0 ? 'tint' : 'danger'}
          accessibilityLabel={change === null ? undefined : `${formatScoreChange(change)} since last test`}
          style={styles.label}>
          {change === null ? '—' : formatScoreChange(change)}
        </ThemedText>
      )}
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
  /**
   * One size for every label, a little wider than a column on narrow phones so the longest
   * ("Shoulders", "Postchain") fit; they stay centered under their bar and clear of each other.
   */
  label: {
    width: 68,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
  },
});
