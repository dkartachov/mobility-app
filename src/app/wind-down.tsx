import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimePicker } from '@/components/time-picker';
import { Spacing } from '@/constants/theme';
import { DAILY_MINUTES } from '@/lib/workout';

export default function WindDownScreen() {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(null);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Wind-down routine" title="How much time do you have?" />
        <TimePicker minutes={minutes} onChange={setMinutes} />
        <ThemedText type="small" themeColor="textSecondary">
          A low intensity routine for after a workout. Only easy, passive stretches and gentle mobility exercises, with
          no equipment needed, to help your body relax and recover. Ease into each stretch and breathe slowly.
        </ThemedText>
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
  footer: {
    paddingHorizontal: Spacing.screen,
  },
});
