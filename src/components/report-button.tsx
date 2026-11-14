import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

/** A round flag button, sized like the header's back button, that opens a report about what's on screen. */
export function ReportButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={Spacing.two}
      pressedScale={0.9}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Icon name={{ ios: 'flag', android: 'flag' }} size={18} color="text" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
