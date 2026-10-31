import { useRef } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MILESTONE_HOURS } from '@/lib/milestones';

import { ScrollView } from './scroll-view';
import { ThemedText } from './themed-text';

const BADGE_SIZE = 76;
const BADGE_GAP = Spacing.three;
/** Drawn in the fill color with round joins, which softens the shapes' corners. */
const OUTLINE = 6;

/** Placeholder artwork, repeating along the list. 32 sides reads as a circle. */
const SHAPES = [
  { sides: 6 },
  { sides: 4 },
  { sides: 32 },
  { sides: 5 },
  { sides: 5, star: true },
  { sides: 8 },
];

/** SVG points for a shape with a corner at the top. A star alternates with corners further in. */
export function shapePoints(size: number, sides: number, star = false) {
  const radius = size / 2;
  const corners = star ? sides * 2 : sides;
  return Array.from({ length: corners }, (_, i) => {
    const angle = (i / corners) * 2 * Math.PI - Math.PI / 2;
    const r = star && i % 2 === 1 ? radius * 0.65 : radius;
    return `${radius + r * Math.cos(angle)},${radius + r * Math.sin(angle)}`;
  }).join(' ');
}

/**
 * A sideways-scrolling row with a badge per milestone, greyed out until it's reached. Opens with
 * the latest reached one first, so what's next is in view.
 */
export function MilestoneBadges({ totalSeconds }: { totalSeconds: number }) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const reachedCount = MILESTONE_HOURS.filter((hours) => totalSeconds >= hours * 3600).length;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      onContentSizeChange={() =>
        scrollRef.current?.scrollTo({ x: Math.max(0, reachedCount - 1) * (BADGE_SIZE + BADGE_GAP), animated: false })
      }
      style={styles.list}
      contentContainerStyle={styles.content}>
      {MILESTONE_HOURS.map((hours, i) => (
        <MilestoneBadge key={hours} hours={hours} reached={i < reachedCount} shape={SHAPES[i % SHAPES.length]} />
      ))}
    </ScrollView>
  );
}

type MilestoneBadgeProps = {
  hours: number;
  reached: boolean;
  shape: (typeof SHAPES)[number];
};

function MilestoneBadge({ hours, reached, shape }: MilestoneBadgeProps) {
  const theme = useTheme();
  const color = reached ? theme.tint : theme.backgroundSelected;
  const inner = BADGE_SIZE - OUTLINE;

  return (
    <View
      accessible
      accessibilityLabel={`${hours} ${hours === 1 ? 'hour' : 'hours'}, ${reached ? 'reached' : 'not reached yet'}`}
      style={styles.badge}>
      <Svg width={BADGE_SIZE} height={BADGE_SIZE} viewBox={`${-OUTLINE / 2} ${-OUTLINE / 2} ${BADGE_SIZE} ${BADGE_SIZE}`}>
        <Polygon
          points={shapePoints(inner, shape.sides, shape.star)}
          fill={color}
          stroke={color}
          strokeWidth={OUTLINE}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={styles.number}>
        <ThemedText type="smallBold" themeColor={reached ? 'onTint' : 'textSecondary'} style={styles.numberText}>
          {hours}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Runs to the screen's edges, so badges scroll off them instead of being cut short inside the padding.
  list: {
    marginHorizontal: -Spacing.three,
  },
  content: {
    gap: BADGE_GAP,
    paddingHorizontal: Spacing.three,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  number: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 16,
  },
});
