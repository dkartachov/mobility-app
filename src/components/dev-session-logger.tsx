/**
 * TEMPORARY: lets you log fake sessions (including on past days) to exercise the Dashboard,
 * streaks and goal progress before the real workout player exists. Delete this file and its
 * usage in `app/(tabs)/index.tsx` once real sessions are recorded.
 */
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { logSession } from '@/db/sessions';

import { Button } from './button';
import { Card } from './card';
import { Chip } from './chip';
import { ThemedText } from './themed-text';

const DURATIONS = [10, 20, 30];
const DAYS_AGO = [
  { label: 'Today', value: 0 },
  { label: 'Yesterday', value: 1 },
  { label: '2 days ago', value: 2 },
  { label: '3 days ago', value: 3 },
  { label: 'A week ago', value: 7 },
];

export function DevSessionLogger() {
  const db = useSQLiteContext();
  const [minutes, setMinutes] = useState(10);
  const [daysAgo, setDaysAgo] = useState(0);

  const log = async () => {
    const startedAt = new Date();
    startedAt.setDate(startedAt.getDate() - daysAgo);
    await logSession(db, { startedAt, durationSeconds: minutes * 60, routineId: 'dev-test' });
  };

  const clear = () => {
    Alert.alert('Delete all sessions?', 'This removes every logged session, real or test.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => db.runAsync('DELETE FROM sessions'),
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">Test sessions (temporary)</ThemedText>
      <View style={styles.row}>
        {DURATIONS.map((d) => (
          <Chip key={d} label={`${d} min`} selected={minutes === d} onPress={() => setMinutes(d)} />
        ))}
      </View>
      <View style={styles.row}>
        {DAYS_AGO.map((d) => (
          <Chip key={d.value} label={d.label} selected={daysAgo === d.value} onPress={() => setDaysAgo(d.value)} />
        ))}
      </View>
      <Button title={`Log ${minutes}-min session`} onPress={log} />
      <Button title="Delete all sessions" variant="destructive" onPress={clear} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
