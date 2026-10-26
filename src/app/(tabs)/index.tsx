import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { DevSessionLogger } from '@/components/dev-session-logger';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Placeholder routines until the exercise library is defined.
const ROUTINES = [
  { id: 'morning', name: 'Morning mobility', minutes: 10, description: 'Wake up joints from head to toe.' },
  { id: 'hips', name: 'Hip opener', minutes: 15, description: 'Release tight hips after sitting.' },
  { id: 'full-body', name: 'Full body stretch', minutes: 20, description: 'A complete, gentle stretch.' },
];

export default function StartScreen() {
  return (
    <Screen title="Start exercising" subtitle="Pick a routine and follow along.">
      <View style={styles.list}>
        {ROUTINES.map((routine) => (
          <Card key={routine.id}>
            <View style={styles.routineHeader}>
              <ThemedText type="subtitle">{routine.name}</ThemedText>
              <View style={styles.duration}>
                <Icon name={{ ios: 'timer', android: 'timer' }} color="tint" size={16} />
                <ThemedText type="smallBold" themeColor="tint">
                  {routine.minutes} min
                </ThemedText>
              </View>
            </View>
            <ThemedText themeColor="textSecondary">{routine.description}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Coming soon
            </ThemedText>
          </Card>
        ))}
      </View>

      <DevSessionLogger />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
