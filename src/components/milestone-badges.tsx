import { router } from 'expo-router';
import { useEffect, useId, useRef } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { badgeLook, PRISM_COLORS } from '@/lib/badge-looks';
import { MILESTONE_HOURS } from '@/lib/milestones';

import { PressableScale } from './pressable-scale';
import { ScrollView } from './scroll-view';
import { ThemedText } from './themed-text';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const BADGE_SIZE = 76;
const BADGE_GAP = Spacing.three;
/** Drawn in the fill color with round joins, which softens the shapes' corners. */
const OUTLINE = 6;
/** One sweep of the shine, then a pause, then again. */
const SHINE_MS = 900;
const SHINE_CYCLE_MS = 3600;
/** One pulse of the glow and one round of twinkles. */
const AURA_MS = 2800;
/** How far past the badge its glow reaches, as a multiple of its size. */
const AURA_SCALE = 1.5;
const SPARKLES = 6;

/** Placeholder artwork, repeating along the list. 32 sides reads as a circle. */
const SHAPES = [
  { sides: 6 },
  { sides: 4 },
  { sides: 32 },
  { sides: 5 },
  { sides: 5, star: true },
  { sides: 8 },
];

/**
 * SVG points for a shape with a corner at the top. A star alternates with corners further in,
 * at `inner` times the radius.
 */
export function shapePoints(size: number, sides: number, star = false, inner = 0.65) {
  const radius = size / 2;
  const corners = star ? sides * 2 : sides;
  return Array.from({ length: corners }, (_, i) => {
    const angle = (i / corners) * 2 * Math.PI - Math.PI / 2;
    const r = star && i % 2 === 1 ? radius * inner : radius;
    return `${radius + r * Math.cos(angle)},${radius + r * Math.sin(angle)}`;
  }).join(' ');
}

/** SVG ids are looked up by plain name, which `useId`'s colons would break. */
function useSvgId() {
  return useId().replace(/:/g, '');
}

/**
 * A sideways-scrolling row with a badge per milestone, greyed out until it's reached. Opens with
 * the latest reached one first, so what's next is in view. Reached ones open on their own screen,
 * which is where their effects play; here they're drawn still.
 */
export function MilestoneBadges({
  totalSeconds,
  inset = Spacing.screen,
}: {
  totalSeconds: number;
  /** The screen's side padding, which the row runs out over so badges scroll off the edges. */
  inset?: number;
}) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const reachedCount = MILESTONE_HOURS.filter((hours) => totalSeconds >= hours * 3600).length;
  // Scrolled along, the latest badge lines up with the screen's padding. A gap any narrower than
  // that would leave the edge of the badge before it peeking in from the side.
  const gap = Math.max(BADGE_GAP, inset);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      onContentSizeChange={() =>
        scrollRef.current?.scrollTo({ x: Math.max(0, reachedCount - 1) * (BADGE_SIZE + gap), animated: false })
      }
      style={{ marginHorizontal: -inset }}
      contentContainerStyle={{ gap, paddingHorizontal: inset }}>
      {MILESTONE_HOURS.map((hours, i) => (
        <MilestoneBadge key={hours} hours={hours} reached={i < reachedCount} />
      ))}
    </ScrollView>
  );
}

/**
 * The artwork of a milestone's badge, without its number. A `color` draws just its shape, flat,
 * for badges not reached yet and for shading over one. `still` leaves out the moving shine, for
 * lists of them, where many animating at once would make scrolling stutter.
 */
export function BadgeShape({
  hours,
  size,
  color,
  still = false,
}: {
  hours: number;
  size: number;
  color?: string;
  still?: boolean;
}) {
  const id = useSvgId();
  const shape = SHAPES[MILESTONE_HOURS.indexOf(hours) % SHAPES.length];
  const outline = (OUTLINE * size) / BADGE_SIZE;
  const points = shapePoints(size - outline, shape.sides, shape.star);
  const look = color ? null : badgeLook(hours);
  const gradient = look && look.fill.length > 1;
  const fill = color ?? (gradient ? `url(#${id}-fill)` : look!.fill[0]);
  const ringInset = size * 0.09;
  const shine = look?.shine && !still;

  return (
    <Svg width={size} height={size} viewBox={`${-outline / 2} ${-outline / 2} ${size} ${size}`}>
      {look && (
        <Defs>
          {gradient && (
            <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
              {look.fill.map((stop, i) => (
                <Stop key={i} offset={i / (look.fill.length - 1)} stopColor={stop} />
              ))}
            </LinearGradient>
          )}
          {shine && (
            <>
              <LinearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.75} />
                <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
              <ClipPath id={`${id}-clip`}>
                <Polygon points={points} />
              </ClipPath>
            </>
          )}
        </Defs>
      )}
      <Polygon points={points} fill={fill} stroke={fill} strokeWidth={outline} strokeLinejoin="round" />
      {look?.ring && (
        <Polygon
          points={shapePoints(size - outline - ringInset * 2, shape.sides, shape.star)}
          transform={`translate(${ringInset} ${ringInset})`}
          fill="none"
          stroke={look.ring}
          strokeWidth={size * 0.03}
          strokeLinejoin="round"
        />
      )}
      {shine && <Shine size={size - outline} gradientId={`${id}-shine`} clipId={`${id}-clip`} />}
    </Svg>
  );
}

/** A slanted band of light sweeping across the badge, clipped to its shape. */
function Shine({ size, gradientId, clipId }: { size: number; gradientId: string; clipId: string }) {
  const progress = useSharedValue(0);
  const band = size * 0.3;

  useEffect(() => {
    progress.set(withRepeat(withTiming(1, { duration: SHINE_CYCLE_MS, easing: Easing.linear }), -1, false));
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const sweep = Math.min(1, (progress.get() * SHINE_CYCLE_MS) / SHINE_MS);
    return { x: -size + sweep * size * 2.5 };
  });

  return (
    <G clipPath={`url(#${clipId})`}>
      <G transform={`rotate(20 ${size / 2} ${size / 2})`}>
        <AnimatedRect animatedProps={animatedProps} y={-size / 2} width={band} height={size * 2} fill={`url(#${gradientId})`} />
      </G>
    </G>
  );
}

/**
 * The glow and sparkles around a badge, for the looks that have them. Goes behind the badge,
 * centered on it, and doesn't turn with it.
 */
export function BadgeAura({ hours, size }: { hours: number; size: number }) {
  const id = useSvgId();
  const look = badgeLook(hours);
  const clock = useSharedValue(0);
  const animated = Boolean(look.glow || look.prism || look.sparkles);
  const auraSize = size * AURA_SCALE;

  useEffect(() => {
    if (animated) clock.set(withRepeat(withTiming(1, { duration: AURA_MS, easing: Easing.linear }), -1, false));
  }, [animated, clock]);

  const glowStyle = useAnimatedStyle(() => {
    const pulse = Math.sin(clock.get() * 2 * Math.PI);
    return {
      opacity: 0.7 + pulse * 0.3,
      transform: [{ scale: 1 + pulse * 0.04 }, { rotate: look.prism ? `${clock.get() * 360}deg` : '0deg' }],
    };
  });

  if (!animated) return null;

  const glowColors = look.prism ? PRISM_COLORS : look.glow ? [look.glow] : [];
  const center = auraSize / 2;

  return (
    <View
      pointerEvents="none"
      style={[styles.aura, { width: auraSize, height: auraSize, left: (size - auraSize) / 2, top: (size - auraSize) / 2 }]}>
      {glowColors.length > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
          <Svg width={auraSize} height={auraSize}>
            <Defs>
              {glowColors.map((color, i) => (
                <RadialGradient key={color} id={`${id}-glow${i}`}>
                  <Stop offset={0.4} stopColor={color} stopOpacity={0.8} />
                  <Stop offset={1} stopColor={color} stopOpacity={0} />
                </RadialGradient>
              ))}
            </Defs>
            {glowColors.length === 1 ? (
              <Circle cx={center} cy={center} r={center} fill={`url(#${id}-glow0)`} />
            ) : (
              // Blobs of each color set round the middle, so turning them sweeps the colors round.
              glowColors.map((color, i) => {
                const angle = (i / glowColors.length) * 2 * Math.PI;
                return (
                  <Circle
                    key={color}
                    cx={center + Math.cos(angle) * auraSize * 0.14}
                    cy={center + Math.sin(angle) * auraSize * 0.14}
                    r={center * 0.86}
                    fill={`url(#${id}-glow${i})`}
                  />
                );
              })
            )}
          </Svg>
        </Animated.View>
      )}
      {look.sparkles &&
        Array.from({ length: SPARKLES }, (_, i) => (
          <Sparkle key={i} index={i} badgeSize={size} auraSize={auraSize} color={look.sparkles!} clock={clock} />
        ))}
    </View>
  );
}

/** A four-pointed star round the badge's edge that fades in and out, each at its own moment. */
function Sparkle({
  index,
  badgeSize,
  auraSize,
  color,
  clock,
}: {
  index: number;
  badgeSize: number;
  auraSize: number;
  color: string;
  clock: SharedValue<number>;
}) {
  const angle = (index / SPARKLES) * 2 * Math.PI - Math.PI / 3;
  const distance = badgeSize * (index % 2 === 0 ? 0.6 : 0.52);
  const sparkleSize = badgeSize * (index % 2 === 0 ? 0.16 : 0.11);
  // Spread out of order, so they don't twinkle in a ring.
  const offset = (index * 0.37) % 1;

  const style = useAnimatedStyle(() => {
    const twinkle = Math.max(0, Math.sin(((clock.get() + offset) % 1) * 2 * Math.PI));
    return { opacity: twinkle * twinkle, transform: [{ scale: 0.4 + twinkle * 0.6 }, { rotate: `${twinkle * 45}deg` }] };
  });

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: auraSize / 2 + Math.cos(angle) * distance - sparkleSize / 2,
          top: auraSize / 2 + Math.sin(angle) * distance - sparkleSize / 2,
        },
        style,
      ]}>
      <Svg width={sparkleSize} height={sparkleSize}>
        <Polygon points={shapePoints(sparkleSize, 4, true, 0.3)} fill={color} />
      </Svg>
    </Animated.View>
  );
}

function MilestoneBadge({ hours, reached }: { hours: number; reached: boolean }) {
  const theme = useTheme();
  const label = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  if (!reached) {
    return (
      <View accessible accessibilityLabel={`${label}, not reached yet`} style={styles.badge}>
        <BadgeShape hours={hours} size={BADGE_SIZE} color={theme.backgroundSelected} />
        <View style={styles.number}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.numberText}>
            {hours}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}, reached`}
      onPress={() => router.push({ pathname: '/milestone-badge', params: { hours } })}
      pressedScale={0.92}
      style={styles.badge}>
      <BadgeShape hours={hours} size={BADGE_SIZE} still />
      <View style={styles.number}>
        <ThemedText type="smallBold" style={[styles.numberText, { color: badgeLook(hours).text }]}>
          {hours}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  aura: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
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
