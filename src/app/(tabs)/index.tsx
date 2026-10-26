import { router } from 'expo-router';

import { Button } from '@/components/button';
import { DevSessionLogger } from '@/components/dev-session-logger';
import { Screen } from '@/components/screen';

export default function StartScreen() {
  return (
    <Screen title="Start exercising" subtitle="Pick an exercise and follow along.">
      <Button title="Library" onPress={() => router.push('/library')} />

      <DevSessionLogger />
    </Screen>
  );
}
