import { Image, type ImageSource } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

type StartTileProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Short label in a pill at the top-left, e.g. "5–15 min". */
  tag?: string;
  /** Optional background photo. Text switches to white over a dark gradient when set. */
  image?: ImageSource;
  /** E.g. `flex: 1` to fill the space left on the screen instead of the default fixed height. */
  style?: StyleProp<ViewStyle>;
  /** Smaller text and padding and no arrow, for tiles sharing a row. */
  compact?: boolean;
  /** Workout lengths shown as buttons that start one straight away, in place of the arrow. */
  minutes?: readonly number[];
  onStart?: (minutes: number) => void;
};

/** Large tappable tile on the Start tab. */
export function StartTile({ title, subtitle, onPress, tag, image, style, compact, minutes, onStart }: StartTileProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const onImage = image !== undefined;
  const lengths = onStart ? (minutes ?? []) : [];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      // The length buttons sit inside this tile, so screen readers reach them as its actions instead.
      accessibilityActions={lengths.map((value) => ({ name: String(value), label: `Start ${value} minutes` }))}
      onAccessibilityAction={(event) => onStart?.(Number(event.nativeEvent.actionName))}
      onPress={onPress}
      style={[styles.tile, compact && styles.compact, { backgroundColor: theme.backgroundElement }, style]}>
      {onImage && (
        <>
          {/* Drifts slowly in and out, so the photo feels alive. A CSS animation, which doesn't follow reduce motion by itself. */}
          <Animated.View style={reducedMotion ? StyleSheet.absoluteFill : cssStyles.drift}>
            <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          </Animated.View>
          {/* Clear at the top so the photo shows, dark at the bottom so the text reads. */}
          <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity={0.05} />
                <Stop offset="0.45" stopColor="#000" stopOpacity={0.15} />
                <Stop offset="1" stopColor="#000" stopOpacity={0.75} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#scrim)" />
          </Svg>
        </>
      )}
      {tag && (
        <View style={[styles.tag, onImage && styles.tagOnImage]}>
          <ThemedText type="eyebrow" style={onImage ? styles.onImage : { color: theme.tint }}>
            {tag}
          </ThemedText>
        </View>
      )}
      <View style={[styles.footer, lengths.length > 0 && styles.footerStacked]}>
        <View style={styles.text}>
          <ThemedText type={compact ? 'subtitle' : 'title'} style={onImage && styles.onImage}>
            {title}
          </ThemedText>
          <ThemedText
            type={compact ? 'small' : 'default'}
            themeColor="textSecondary"
            numberOfLines={compact ? 2 : undefined}
            style={onImage && styles.onImageSecondary}>
            {subtitle}
          </ThemedText>
        </View>
        {lengths.length > 0 ? (
          <View style={styles.lengths}>
            {lengths.map((value) => (
              <Pressable
                key={value}
                importantForAccessibility="no"
                onPress={() => {
                  haptic.select();
                  onStart?.(value);
                }}
                style={({ pressed }) => [
                  styles.length,
                  { backgroundColor: onImage ? 'rgba(255, 255, 255, 0.22)' : theme.tintSoft },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={onImage ? styles.onImage : { color: theme.tint }}>
                  {value} min
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : (
          !compact && (
            <View style={[styles.go, { backgroundColor: onImage ? 'rgba(255, 255, 255, 0.22)' : theme.tintSoft }]}>
              <SymbolView
                name={{ ios: 'arrow.right', android: 'arrow_forward' }}
                size={20}
                tintColor={onImage ? '#FFFFFF' : theme.tint}
              />
            </View>
          )
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    height: 220,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: Spacing.threeAndHalf,
  },
  compact: {
    padding: Spacing.three,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.twoAndHalf,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.full,
  },
  tagOnImage: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    marginTop: 'auto',
  },
  footerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  go: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lengths: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  length: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.twoAndHalf,
    borderRadius: Radius.full,
  },
  pressed: {
    opacity: 0.6,
  },
  onImage: {
    color: '#FFFFFF',
  },
  onImageSecondary: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
});

/** Reanimated CSS animations, which React Native's `StyleSheet.create` doesn't type. */
const cssStyles = css.create({
  drift: {
    ...StyleSheet.absoluteFill,
    animationName: {
      from: { transform: [{ scale: 1 }] },
      to: { transform: [{ scale: 1.06 }] },
    },
    animationDuration: '20s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'ease-in-out',
  },
});
