import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimePicker } from '@/components/time-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DAILY_MINUTES } from '@/lib/workout';

/** What the routine is, in short points under the time picker. */
const POINTS = [
  { icon: { ios: 'moon.stars', android: 'bedtime' }, text: 'For after a workout or at the end of the day' },
  { icon: { ios: 'leaf', android: 'spa' }, text: 'Easy, passive stretches and gentle mobility' },
  { icon: { ios: 'figure.mind.and.body', android: 'self_improvement' }, text: 'No equipment needed' },
  { icon: { ios: 'wind', android: 'air' }, text: 'Ease into each stretch and breathe slowly' },
] as const;

export default function WindDownScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(null);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Wind-down routine" title="How much time do you have?" />
        <TimePicker minutes={minutes} onChange={setMinutes} />
        <View style={styles.points}>
          {POINTS.map(({ icon, text }) => (
            <View key={text} style={styles.point}>
              <View style={[styles.pointIcon, { backgroundColor: theme.tintSoft }]}>
                <Icon name={icon} color="tint" size={16} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.pointText}>
                {text}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Always laid out, so picking a time doesn't make the screen jump. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button
          title={minutes === null ? 'Pick a time' : `Start ${minutes} min routine`}
          disabled={minutes === null}
          onPress={() =>
            router.push({ pathname: '/workout', params: { minutes: minutes ?? DAILY_MINUTES[0], routine: 'wind-down' } })
          }
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.four,
  },
  points: {
    gap: Spacing.twoAndHalf,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
  },
});
