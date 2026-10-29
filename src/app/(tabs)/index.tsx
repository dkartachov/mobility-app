import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { StartTile } from '@/components/start-tile';
import { Spacing } from '@/constants/theme';
import { EXERCISES } from '@/data/exercises';
import { DAILY_MINUTES } from '@/lib/workout';

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function StartScreen() {
  return (
    <Screen eyebrow={greeting()} title="Ready to move?" subtitle="Pick a routine or browse exercises." gap={Spacing.three}>
      <StartTile
        title="Daily"
        subtitle="A quick guided routine"
        tag={`${DAILY_MINUTES[0]}–${DAILY_MINUTES[DAILY_MINUTES.length - 1]} min`}
        image={require('@/assets/images/daily.jpg')}
        onPress={() => router.push('/daily')}
        style={styles.tile}
      />
      <StartTile
        title="Library"
        subtitle="Browse every exercise"
        tag={`${EXERCISES.length} exercises`}
        image={require('@/assets/images/library.jpg')}
        onPress={() => router.push('/library')}
        style={styles.tile}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The two tiles split the height below the header, so the screen fits without scrolling.
  // Only on very small screens does the minimum push it into scrolling.
  tile: {
    flex: 1,
    height: undefined,
    minHeight: 160,
  },
});
