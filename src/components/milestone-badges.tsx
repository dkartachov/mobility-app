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
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { badgeLook, PRISM_COLORS, type BadgeLook } from '@/lib/badge-looks';
import { badgeNumberScale, badgeShape, type BadgeShape as Shape } from '@/lib/badge-shapes';
import { MILESTONE_HOURS } from '@/lib/milestones';

import { PressableScale } from './pressable-scale';
import { ScrollView } from './scroll-view';
import { ThemedText } from './themed-text';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const BADGE_SIZE = 76;
const BADGE_GAP = Spacing.three;
const NUMBER_SIZE = 16;
/**
 * Shapes are drawn reaching 1 each way from the middle, so the measurements below are fractions
 * of half a badge's size. This outline is drawn in the fill color with round joins, which softens corners.
 */
const OUTLINE = 0.06;
/** Leaves room for the outline, which would otherwise be cut off at the edges. */
const SHAPE_SCALE = 0.94;
/** One sweep of the shine, then a pause, then again. */
const SHINE_MS = 900;
const SHINE_CYCLE_MS = 3600;
/** One pulse of the glow and one round of twinkles. */
const AURA_MS = 2800;
/** How far past the badge its glow reaches, as a multiple of its size. */
const AURA_SCALE = 1.5;
const SPARKLES = 6;

/**
 * SVG points for a shape with a corner at the top, which is what sparkles are made of. A star
 * alternates with corners further in, at `inner` times the radius.
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
  const shape = badgeShape(hours);
  const look = color ? null : badgeLook(hours);
  const gradient = look && look.fill.length > 1;
  const fill = color ?? (gradient ? `url(#${id}-fill)` : look!.fill[0]);
  const shine = look?.shine && !still;

  return (
    <Svg width={size} height={size} viewBox="-1 -1 2 2">
      {look && (
        <Defs>
          {/* Set across the whole badge rather than each part, so the parts share one sweep of color. */}
          {gradient && (
            <LinearGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" x1={-1} y1={-1} x2={1} y2={1}>
              {look.fill.map((stop, i) => (
                <Stop key={i} offset={i / (look.fill.length - 1)} stopColor={stop} />
              ))}
            </LinearGradient>
          )}
          {/* Light from above: brightens the top of whatever it's laid over and darkens the bottom. */}
          <LinearGradient id={`${id}-light`} gradientUnits="userSpaceOnUse" x1={0} y1={-1} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={0.5} stopColor="#000000" stopOpacity={0} />
            <Stop offset={1} stopColor="#000000" stopOpacity={0.3} />
          </LinearGradient>
          {shine && (
            <>
              <LinearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.75} />
                <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
              <ClipPath id={`${id}-clip`}>
                {shape.silhouette.map((d, i) => (
                  <Path key={i} d={d} />
                ))}
              </ClipPath>
            </>
          )}
        </Defs>
      )}
      <G transform={`scale(${SHAPE_SCALE})`}>
        {shape.silhouette.map((d, i) => (
          <Path key={i} d={d} fill={fill} stroke={fill} strokeWidth={OUTLINE} strokeLinejoin="round" />
        ))}
        {look && <BadgeDetail shape={shape} look={look} fill={fill} lightId={`${id}-light`} />}
        {shine && <Shine gradientId={`${id}-shine`} clipId={`${id}-clip`} />}
      </G>
    </Svg>
  );
}

/** The outline of a part: the look's ring where it has one, otherwise a faint highlight. */
function edge(look: BadgeLook, width: number) {
  return look.ring
    ? { stroke: look.ring, strokeWidth: width }
    : { stroke: '#FFFFFF', strokeOpacity: 0.3, strokeWidth: width * 0.6 };
}

/** What's drawn inside a badge's silhouette to give it depth, leaving the middle clear for its number. */
function BadgeDetail({ shape, look, fill, lightId }: { shape: Shape; look: BadgeLook; fill: string; lightId: string }) {
  const { silhouette, detail } = shape;
  const light = `url(#${lightId})`;

  switch (detail.kind) {
    case 'face':
      return (
        <>
          <Path d={silhouette[0]} fill={light} />
          <Path
            d={silhouette[0]}
            transform={`scale(${detail.scale})`}
            fill={fill}
            strokeLinejoin="round"
            {...edge(look, 0.05)}
          />
        </>
      );
    case 'disc':
      return (
        <>
          <Path d={silhouette[0]} fill={light} />
          <Circle r={detail.radius} fill={fill} {...edge(look, 0.045)} />
          {detail.double && <Circle r={detail.radius - 0.09} fill="none" opacity={0.7} {...edge(look, 0.02)} />}
        </>
      );
    case 'facets':
      return (
        <>
          {detail.facets.map((facet, i) => (
            <Path
              key={i}
              d={facet.path}
              fill={facet.light > 0 ? '#FFFFFF' : '#000000'}
              fillOpacity={facet.light > 0 ? Math.min(0.5, facet.light * 0.42) : Math.min(0.4, facet.light * -0.34)}
              stroke="#FFFFFF"
              strokeOpacity={0.3}
              strokeWidth={0.014}
              strokeLinejoin="round"
            />
          ))}
          <Path d={detail.table} fill={fill} strokeLinejoin="round" {...edge(look, 0.035)} />
        </>
      );
    case 'layers':
      return (
        <>
          <Path d={silhouette[0]} fill={light} />
          <Path d={silhouette[1]} fill={fill} />
          <Path
            d={silhouette[1]}
            fill="#FFFFFF"
            fillOpacity={0.26}
            stroke="#FFFFFF"
            strokeOpacity={0.5}
            strokeWidth={0.02}
            strokeLinejoin="round"
          />
          <Circle r={detail.disc} fill={fill} {...edge(look, 0.04)} />
        </>
      );
  }
}

/** A slanted band of light sweeping across the badge, clipped to its shape. */
function Shine({ gradientId, clipId }: { gradientId: string; clipId: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withRepeat(withTiming(1, { duration: SHINE_CYCLE_MS, easing: Easing.linear }), -1, false));
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const sweep = Math.min(1, (progress.get() * SHINE_CYCLE_MS) / SHINE_MS);
    return { x: -2.4 + sweep * 4.4 };
  });

  return (
    <G clipPath={`url(#${clipId})`}>
      <G transform="rotate(20)">
        <AnimatedRect animatedProps={animatedProps} y={-2} width={0.6} height={4} fill={`url(#${gradientId})`} />
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
  const numberSize = { fontSize: NUMBER_SIZE * badgeNumberScale(hours) };

  if (!reached) {
    return (
      <View accessible accessibilityLabel={`${label}, not reached yet`} style={styles.badge}>
        <BadgeShape hours={hours} size={BADGE_SIZE} color={theme.backgroundSelected} />
        <View style={styles.number}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={numberSize}>
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
        <ThemedText type="smallBold" style={[numberSize, { color: badgeLook(hours).text }]}>
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
});
