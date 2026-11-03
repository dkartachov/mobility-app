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
        <MilestoneBadge key={hours} hours={hours} reached={i < reachedCount} />
      ))}
    </ScrollView>
  );
}

/** The artwork of a milestone's badge, without its number. */
export function BadgeShape({ hours, size, color }: { hours: number; size: number; color: string }) {
  const shape = SHAPES[MILESTONE_HOURS.indexOf(hours) % SHAPES.length];
  const outline = (OUTLINE * size) / BADGE_SIZE;

  return (
    <Svg width={size} height={size} viewBox={`${-outline / 2} ${-outline / 2} ${size} ${size}`}>
      <Polygon
        points={shapePoints(size - outline, shape.sides, shape.star)}
        fill={color}
        stroke={color}
        strokeWidth={outline}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MilestoneBadge({ hours, reached }: { hours: number; reached: boolean }) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${hours} ${hours === 1 ? 'hour' : 'hours'}, ${reached ? 'reached' : 'not reached yet'}`}
      style={styles.badge}>
      <BadgeShape hours={hours} size={BADGE_SIZE} color={reached ? theme.tint : theme.backgroundSelected} />
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
