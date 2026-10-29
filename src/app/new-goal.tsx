import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Field, TextField } from '@/components/field';
import { FormScreen } from '@/components/form-screen';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
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
      <PageHeader
        eyebrow={`${GOAL_PERIOD_DAYS}-day goal`}
        title="New goal"
        subtitle={`How many hours do you want to train in the next ${GOAL_PERIOD_DAYS} days?`}
      />

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

      {isValid ? (
        <Card style={styles.plan}>
          <IconBadge name={{ ios: 'calendar.badge.clock', android: 'event_available' }} size={44} />
          <View style={styles.planText}>
            <ThemedText type="subtitle">About {minutesPerDay} min a day</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Runs from today until {formatDateKey(endDate)}.
            </ThemedText>
          </View>
        </Card>
      ) : (
        <ThemedText type="small" themeColor={hoursText ? 'danger' : 'textSecondary'}>
          Enter a number of hours between 0 and {MAX_HOURS}.
        </ThemedText>
      )}

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
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  planText: {
    flex: 1,
    gap: Spacing.half,
  },
});
