import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, formatShortDate, type DateKey } from '@/lib/dates';

import { ThemedText } from './themed-text';

const HEIGHT = 160;
/** Room left of the plot for the score labels. */
const AXIS_WIDTH = 24;
/** Room inside the plot so markers and the selected value aren't cut off at its edges. */
const INSET = { top: 22, right: 10, bottom: 8, left: 10 };
/** The edges of the average band, where most people score. */
const GRID_SCORES = [0, 25, 50, 75, 100];
const MARKER_RADIUS = 4;
const SELECTED_RADIUS = 6;
/** Beyond this many tests, only the selected one is marked, so the line doesn't turn into a row of beads. */
const MAX_MARKERS = 16;

export type ChartPoint = { id: number; date: DateKey; score: number };

type ScoreHistoryChartProps = {
  /** Oldest first. */
  points: ChartPoint[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** What the scores are of, for screen readers, e.g. "Overall score". */
  label: string;
};

/**
 * A line of scores over time, spaced by date so a quick retest sits close to the test before it.
 * Tapping anywhere on it selects the nearest test, which is marked and has its score shown.
 */
export function ScoreHistoryChart({ points, selectedId, onSelect, label }: ScoreHistoryChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const plotLeft = AXIS_WIDTH + INSET.left;
  const plotRight = width - INSET.right;
  const plotTop = INSET.top;
  const plotBottom = HEIGHT - INSET.bottom;

  const first = points[0]?.date;
  const span = first ? daysBetween(first, points[points.length - 1].date) : 0;
  const xOf = (date: DateKey) =>
    span === 0 ? (plotLeft + plotRight) / 2 : plotLeft + (daysBetween(first, date) / span) * (plotRight - plotLeft);
  const yOf = (score: number) => plotBottom - (Math.min(100, Math.max(0, score)) / 100) * (plotBottom - plotTop);

  const placed = points.map((point) => ({ ...point, x: xOf(point.date), y: yOf(point.score) }));
  const selected = placed.find((point) => point.id === selectedId);
  const line = placed.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  const selectNearest = (x: number) => {
    const nearest = placed.reduce<(typeof placed)[number] | undefined>(
      (best, point) => (!best || Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best),
      undefined
    );
    if (nearest && nearest.id !== selectedId) onSelect(nearest.id);
  };

  return (
    <View style={styles.chart}>
      <Pressable
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${label} over time: ${points
          .map((point) => `${formatShortDate(point.date)}, ${Math.round(point.score)}`)
          .join('; ')}`}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onPress={(event) => selectNearest(event.nativeEvent.locationX)}
        style={{ height: HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {GRID_SCORES.map((score) => (
              <Line
                key={score}
                x1={plotLeft - INSET.left}
                x2={width}
                y1={yOf(score)}
                y2={yOf(score)}
                stroke={theme.border}
                strokeWidth={StyleSheet.hairlineWidth}
                strokeDasharray={score === 0 ? undefined : '3 4'}
              />
            ))}
            {GRID_SCORES.filter((score) => score % 50 === 0).map((score) => (
              <SvgText
                key={score}
                x={0}
                y={yOf(score) + 4}
                fontSize={11}
                fill={theme.textSecondary}>
                {score}
              </SvgText>
            ))}
            {selected && (
              <Line
                x1={selected.x}
                x2={selected.x}
                y1={plotTop - 4}
                y2={plotBottom}
                stroke={theme.border}
                strokeWidth={1}
              />
            )}
            {placed.length > 1 && (
              <Path d={line} stroke={theme.tint} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            )}
            {placed.map((point) => {
              const isSelected = point.id === selectedId;
              if (!isSelected && placed.length > MAX_MARKERS) return null;
              return (
                <Circle
                  key={point.id}
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? SELECTED_RADIUS : MARKER_RADIUS}
                  fill={isSelected ? theme.tint : theme.backgroundElement}
                  stroke={theme.tint}
                  strokeWidth={2}
                />
              );
            })}
            {selected && (
              <SvgText
                x={Math.min(Math.max(selected.x, plotLeft + 8), plotRight - 8)}
                // Below the marker when it's too near the top for the label to fit above.
                y={selected.y - plotTop < 14 ? selected.y + 22 : selected.y - 12}
                textAnchor="middle"
                fontSize={14}
                fontFamily={Fonts.display}
                fontWeight="800"
                fill={theme.text}>
                {Math.round(selected.score)}
              </SvgText>
            )}
          </Svg>
        )}
      </Pressable>
      {first && (
        <View style={[styles.dates, { paddingLeft: plotLeft - INSET.left }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
            {formatShortDate(first)}
          </ThemedText>
          {span > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
              {formatShortDate(points[points.length - 1].date)}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    gap: Spacing.half,
  },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
  },
});
