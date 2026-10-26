import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { StartTile } from '@/components/start-tile';

export default function StartScreen() {
  return (
    <Screen title="Start exercising" subtitle="Pick a routine or browse exercises.">
      <StartTile
        title="Daily"
        subtitle="A quick guided routine"
        image={require('@/assets/images/daily.jpg')}
        onPress={() => router.push('/daily')}
      />
      <StartTile
        title="Library"
        subtitle="Browse every exercise"
        image={require('@/assets/images/library.jpg')}
        onPress={() => router.push('/library')}
      />
    </Screen>
  );
}
