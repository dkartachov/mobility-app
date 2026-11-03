import * as Application from 'expo-application';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

const DEV_COLOR = '#E8590C';

// The installed app's ID rather than `__DEV__`, which a development build loses when it runs an EAS update.
const isDevVariant = Application.applicationId === 'com.hogos.plie.dev';

/**
 * A "DEV" label in the development build, so it can't be mistaken for preview or production. It
 * sits just below the status bar, which Android draws over the app, in the top-right corner the
 * stack header leaves empty.
 */
export function DevVariantLabel() {
  return isDevVariant ? <DevLabel /> : null;
}

function DevLabel() {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.label, { top: insets.top + Spacing.one }]}>
      <Text style={styles.text}>DEVELOPMENT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    right: Spacing.three,
    backgroundColor: DEV_COLOR,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
