import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, fromDateKey, toDateKey, type DateKey } from '@/lib/dates';

import { inputStyles } from './field';
import { Icon } from './icon';
import { ThemedText } from './themed-text';

type DateFieldProps = {
  value: DateKey | null;
  onChange: (value: DateKey) => void;
  /** Date the picker opens on when no value is set yet. */
  defaultDate: Date;
  minimumDate?: Date;
  maximumDate?: Date;
};

/**
 * Tappable date row. Android opens the system date dialog; iOS expands an inline
 * spinner below the row (easier than a calendar for picking a birth year).
 */
export function DateField({ value, onChange, defaultDate, minimumDate, maximumDate }: DateFieldProps) {
  const theme = useTheme();
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const date = value ? fromDateKey(value) : defaultDate;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate,
        maximumDate,
        onValueChange: (_event, selected) => onChange(toDateKey(selected)),
      });
    } else {
      if (!value) onChange(toDateKey(defaultDate));
      setIosPickerOpen((isOpen) => !isOpen);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={[
          inputStyles.box,
          styles.row,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <ThemedText themeColor={value ? 'text' : 'textSecondary'}>
          {value ? formatDateKey(value) : 'Not set'}
        </ThemedText>
        <Icon name={{ ios: 'calendar', android: 'calendar_month' }} color="textSecondary" size={18} />
      </Pressable>

      {Platform.OS === 'ios' && iosPickerOpen && (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          accentColor={theme.tint}
          onValueChange={(_event, selected) => onChange(toDateKey(selected))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
