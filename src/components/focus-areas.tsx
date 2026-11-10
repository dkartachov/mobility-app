import { StyleSheet, View } from 'react-native';
import { interpolateColor } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { SCORE_COLOR_STOPS, SCORE_COLORS, scoreAreaLabel, type AreaScores, type ScoreArea } from '@/data/mobility-score';

import { ThemedText } from './themed-text';

const COLORS = [...SCORE_COLORS];
const DOT_SIZE = 10;

type FocusAreasProps = {
  areas: ScoreArea[];
  scores: AreaScores;
  /** The movement to name under an area: its weakest, which focus workouts work on most. */
  movements?: Partial<Record<ScoreArea, string>>;
};

/** A row per focus area: a dot in its score's color, its name, its weakest movement if given, and its score. */
export function FocusAreas({ areas, scores, movements }: FocusAreasProps) {
  return (
    <View style={styles.list}>
      {areas.map((area) => {
        const score = Math.round(scores[area] ?? 0);
        const movement = movements?.[area];
        return (
          <View key={area} style={styles.row} accessible accessibilityLabel={`${scoreAreaLabel(area)}${movement ? `, weakest movement ${movement.toLowerCase()}` : ''}, score ${score}`}>
            <View
              style={[styles.dot, { backgroundColor: interpolateColor(score / 100, SCORE_COLOR_STOPS, COLORS) }]}
            />
            <ThemedText type="smallBold" numberOfLines={1} style={styles.label}>
              {scoreAreaLabel(area)}
              {movement && (
                <ThemedText type="small" themeColor="textSecondary">
                  {'  '}
                  {movement}
                </ThemedText>
              )}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {score}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  label: {
    flex: 1,
  },
});
