import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Sex } from '@/data/mobility-tests';
import { SEX_LABELS, SEXES } from '@/db/profile';
import type { DateKey } from '@/lib/dates';

import { Chip } from './chip';
import { DateField } from './date-field';
import { Field } from './field';

const MIN_BIRTH_DATE = new Date(1900, 0, 1);
const DEFAULT_BIRTH_DATE = new Date(1990, 0, 1);

export function BirthDateField({ value, onChange }: { value: DateKey | null; onChange: (value: DateKey) => void }) {
  return (
    <Field label="Date of birth">
      <DateField
        value={value}
        onChange={onChange}
        defaultDate={DEFAULT_BIRTH_DATE}
        minimumDate={MIN_BIRTH_DATE}
        maximumDate={new Date()}
      />
    </Field>
  );
}

/** Tapping the selected option clears it. */
export function SexField({ value, onChange }: { value: Sex | null; onChange: (value: Sex | null) => void }) {
  return (
    <Field label="Sex at birth">
      <View accessibilityRole="radiogroup" style={styles.chips}>
        {SEXES.map((sex) => (
          <Chip
            key={sex}
            label={SEX_LABELS[sex]}
            selected={value === sex}
            onPress={() => onChange(value === sex ? null : sex)}
          />
        ))}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
