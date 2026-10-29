import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DAILY_MINUTES } from '@/lib/workout';

export default function DailyScreen() {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(null);

  return (
    <ThemedView style={[styles.screen, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.content}>
        <ThemedText type="title" accessibilityRole="header">
          Daily
        </ThemedText>
        <ThemedText type="subtitle" accessibilityRole="header">
          Available time
        </ThemedText>
        <View style={styles.options} accessibilityRole="radiogroup">
          {DAILY_MINUTES.map((value) => (
            <TimeOption key={value} minutes={value} selected={minutes === value} onPress={() => setMinutes(value)} />
          ))}
        </View>
      </View>

      {minutes !== null && (
        <Button
          title="Let's go!"
          onPress={() => router.push({ pathname: '/workout', params: { minutes } })}
        />
      )}
    </ThemedView>
  );
}

function TimeOption({ minutes, selected, onPress }: { minutes: number; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const textColor = selected ? 'onTint' : 'text';

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${minutes} minutes`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.tint : theme.backgroundElement,
          borderColor: selected ? theme.tint : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="stat" themeColor={textColor}>
        {minutes}
      </ThemedText>
      <ThemedText type="smallBold" themeColor={selected ? 'onTint' : 'textSecondary'}>
        minutes
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  content: {
    gap: Spacing.three,
  },
  options: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  option: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.large,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
