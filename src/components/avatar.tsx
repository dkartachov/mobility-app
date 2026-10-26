import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { profilePhotoUri } from '@/lib/profile-photo';

import { ThemedText } from './themed-text';

type AvatarProps = {
  photoFile: string | null;
  initials: string;
  size?: number;
};

export function Avatar({ photoFile, initials, size = 96 }: AvatarProps) {
  const theme = useTheme();
  const uri = profilePhotoUri(photoFile);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={shape} contentFit="cover" transition={150} />;
  }

  return (
    <View style={[styles.placeholder, shape, { backgroundColor: theme.tintSoft }]}>
      <ThemedText themeColor="tint" style={{ fontSize: size * 0.38, lineHeight: size * 0.46, fontWeight: 700 }}>
        {initials || '?'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
