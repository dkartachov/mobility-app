import { StyleSheet, View } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';

type IconBadgeProps = {
  name: Parameters<typeof Icon>[0]['name'];
  color?: ThemeColor;
  background?: ThemeColor;
  size?: number;
};

/** An icon on a soft circle, used to label stat cards. */
export function IconBadge({ name, color = 'tint', background = 'tintSoft', size = 36 }: IconBadgeProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme[background] },
      ]}>
      <Icon name={name} color={color} size={size * 0.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
