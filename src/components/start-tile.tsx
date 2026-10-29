import { Image, type ImageSource } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
};

/** Large tappable tile on the Start tab. */
export function StartTile({ title, subtitle, onPress, tag, image, style }: StartTileProps) {
  const theme = useTheme();
  const onImage = image !== undefined;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={[styles.tile, { backgroundColor: theme.backgroundElement }, style]}>
      {onImage && (
        <>
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
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
      <View style={styles.footer}>
        <View style={styles.text}>
          <ThemedText type="title" style={onImage && styles.onImage}>
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={onImage && styles.onImageSecondary}>
            {subtitle}
          </ThemedText>
        </View>
        <View style={[styles.go, { backgroundColor: onImage ? 'rgba(255, 255, 255, 0.22)' : theme.tintSoft }]}>
          <SymbolView
            name={{ ios: 'arrow.right', android: 'arrow_forward' }}
            size={20}
            tintColor={onImage ? '#FFFFFF' : theme.tint}
          />
        </View>
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
    padding: Spacing.four - Spacing.one,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two + Spacing.one,
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
  onImage: {
    color: '#FFFFFF',
  },
  onImageSecondary: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
});
