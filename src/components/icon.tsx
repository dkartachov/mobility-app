import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconProps = {
  /** SF Symbol on iOS, Material Symbol on Android. */
  name: { ios: SFSymbol; android: AndroidSymbol };
  size?: number;
  color?: ThemeColor;
};

export function Icon({ name, size = 20, color = 'text' }: IconProps) {
  const theme = useTheme();
  return <SymbolView name={name} size={size} tintColor={theme[color]} />;
}
