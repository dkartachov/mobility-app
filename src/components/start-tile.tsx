import { Image, type ImageSource } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type StartTileProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Optional background photo. Text switches to white over a dark scrim when set. */
  image?: ImageSource;
};

/** Large tappable tile on the Start tab. */
export function StartTile({ title, subtitle, onPress, image }: StartTileProps) {
  const theme = useTheme();
  const onImage = image !== undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {onImage && (
        <>
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        </>
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
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right' }}
          size={20}
          tintColor={onImage ? '#FFFFFF' : theme.textSecondary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    height: 180,
    borderRadius: Radius.large,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: Spacing.four,
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  onImage: {
    color: '#FFFFFF',
  },
  onImageSecondary: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.7,
  },
});
