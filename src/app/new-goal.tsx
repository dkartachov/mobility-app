import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Field, TextField } from '@/components/field';
import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { createGoal, GOAL_PERIOD_DAYS } from '@/db/goals';
import { addDays, formatDateKey, todayKey } from '@/lib/dates';

const PRESET_HOURS = [5, 10, 15, 20];
const MAX_HOURS = GOAL_PERIOD_DAYS * 24;

export default function NewGoalScreen() {
  const db = useSQLiteContext();
  const [hoursText, setHoursText] = useState('10');
  const [saving, setSaving] = useState(false);

  const hours = Number(hoursText.replace(',', '.'));
  const isValid = Number.isFinite(hours) && hours > 0 && hours <= MAX_HOURS;
  const minutesPerDay = isValid ? Math.ceil((hours * 60) / GOAL_PERIOD_DAYS) : 0;
  const endDate = addDays(todayKey(), GOAL_PERIOD_DAYS - 1);

  const save = async () => {
    setSaving(true);
    try {
      await createGoal(db, Math.round(hours * 10) / 10);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen>
      <ThemedText type="title" accessibilityRole="header">
        New goal
      </ThemedText>
      <ThemedText>How many hours do you want to train in the next {GOAL_PERIOD_DAYS} days?</ThemedText>

      <View accessibilityRole="radiogroup" style={styles.chips}>
        {PRESET_HOURS.map((preset) => (
          <Chip
            key={preset}
            label={`${preset}h`}
            selected={hours === preset}
            onPress={() => setHoursText(String(preset))}
          />
        ))}
      </View>

      <Field label="Hours">
        <TextField value={hoursText} onChangeText={setHoursText} keyboardType="decimal-pad" maxLength={5} />
      </Field>

      <ThemedText type="small" themeColor={isValid || !hoursText ? 'textSecondary' : 'danger'}>
        {isValid
          ? `About ${minutesPerDay} min per day. Runs from today until ${formatDateKey(endDate)}.`
          : `Enter a number of hours between 0 and ${MAX_HOURS}.`}
      </ThemedText>

      <Button title="Create goal" onPress={save} disabled={!isValid} loading={saving} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
