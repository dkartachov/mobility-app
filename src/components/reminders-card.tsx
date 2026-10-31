import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  createReminder,
  deleteReminder,
  toggleWeekday,
  updateReminder,
  useReminders,
  WEEKDAYS,
  type Reminder,
  type Weekday,
} from '@/db/reminders';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeOfDay, timeOfDayDate } from '@/lib/dates';
import { isNotificationPermissionGranted, requestNotificationPermission } from '@/lib/reminders';

/** Where a new reminder starts when it can't ask for a time first, see `add`. */
const DEFAULT_HOUR = 18;
const DAY_SIZE = 36;

const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: 'Sunday',
  2: 'Monday',
  3: 'Tuesday',
  4: 'Wednesday',
  5: 'Thursday',
  6: 'Friday',
  7: 'Saturday',
};

/** The Settings card for exercise reminders: add, edit or remove times and the days they repeat. */
export function RemindersCard() {
  const db = useSQLiteContext();
  const reminders = useReminders();
  const [permission, setPermission] = useState<Notifications.NotificationPermissionsStatus>();
  const [iosPickerId, setIosPickerId] = useState<number>();

  // Permission can change in the system settings while the app is in the background.
  useEffect(() => {
    const refresh = () => Notifications.getPermissionsAsync().then(setPermission, console.warn);
    refresh();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => appState.remove();
  }, []);

  const askPermission = async () => {
    const status = await requestNotificationPermission();
    setPermission(status);
    return status;
  };

  const allowNotifications = async () => {
    const status = await askPermission();
    if (!isNotificationPermissionGranted(status) && !status.canAskAgain) await Linking.openSettings();
  };

  const create = async (hour: number, minute: number) => {
    const id = await createReminder(db, hour, minute);
    await askPermission();
    return id;
  };

  const add = async () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: timeOfDayDate(DEFAULT_HOUR, 0),
        mode: 'time',
        onValueChange: (_event, selected) => create(selected.getHours(), selected.getMinutes()),
      });
    } else {
      setIosPickerId(await create(DEFAULT_HOUR, 0));
    }
  };

  const showPermissionWarning =
    permission && !isNotificationPermissionGranted(permission) && reminders?.some((reminder) => reminder.enabled);

  return (
    <Card style={styles.card}>
      <View style={styles.rowTitle}>
        <IconBadge name={{ ios: 'bell.fill', android: 'notifications' }} size={32} />
        <ThemedText type="smallBold">Exercise reminders</ThemedText>
      </View>
      {reminders?.length === 0 && (
        <ThemedText themeColor="textSecondary">Pick the times of day you&apos;d like a nudge to exercise.</ThemedText>
      )}
      {showPermissionWarning && (
        <>
          <ThemedText themeColor="danger">Notifications are off, so these reminders won&apos;t appear.</ThemedText>
          <Button title="Allow notifications" variant="secondary" onPress={allowNotifications} />
        </>
      )}
      {reminders?.map((reminder) => (
        <ReminderRow
          key={reminder.id}
          reminder={reminder}
          onChange={(next) => updateReminder(db, next)}
          onEnable={askPermission}
          onDelete={() => deleteReminder(db, reminder.id)}
          iosPickerOpen={iosPickerId === reminder.id}
          onToggleIosPicker={() => setIosPickerId(iosPickerId === reminder.id ? undefined : reminder.id)}
        />
      ))}
      <Button title="Add reminder" variant="secondary" onPress={add} />
    </Card>
  );
}

type ReminderRowProps = {
  reminder: Reminder;
  onChange: (reminder: Reminder) => void;
  /** Called when the switch turns on, which is the moment to ask for permission again. */
  onEnable: () => void;
  onDelete: () => void;
  iosPickerOpen: boolean;
  onToggleIosPicker: () => void;
};

function ReminderRow({ reminder, onChange, onEnable, onDelete, iosPickerOpen, onToggleIosPicker }: ReminderRowProps) {
  const theme = useTheme();
  const { hour, minute, weekdays, enabled } = reminder;
  const time = formatTimeOfDay(hour, minute);

  const setTime = (selected: Date) => {
    onChange({ ...reminder, hour: selected.getHours(), minute: selected.getMinutes() });
  };

  const editTime = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: timeOfDayDate(hour, minute),
        mode: 'time',
        onValueChange: (_event, selected) => setTime(selected),
      });
    } else {
      onToggleIosPicker();
    }
  };

  return (
    <View style={[styles.reminder, { borderTopColor: theme.border }]}>
      <View style={styles.reminderHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change reminder time, ${time}`}
          onPress={editTime}
          style={styles.time}>
          <ThemedText type="subtitle" themeColor={enabled ? 'text' : 'textSecondary'}>
            {time}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${time} reminder`}
          hitSlop={Spacing.two}
          onPress={onDelete}>
          <Icon name={{ ios: 'trash', android: 'delete' }} color="textSecondary" />
        </Pressable>
        <Switch
          value={enabled}
          onValueChange={(next) => {
            onChange({ ...reminder, enabled: next });
            if (next) onEnable();
          }}
          trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
          accessibilityLabel={`${time} reminder`}
        />
      </View>
      <View style={styles.days}>
        {WEEKDAYS.map((day) => {
          const selected = weekdays.includes(day);
          return (
            <PressableScale
              key={day}
              accessibilityRole="checkbox"
              accessibilityLabel={WEEKDAY_NAMES[day]}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange({ ...reminder, weekdays: toggleWeekday(weekdays, day) })}
              style={[
                styles.day,
                {
                  backgroundColor: selected ? theme.tint : theme.backgroundElement,
                  borderColor: selected ? theme.tint : theme.border,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'onTint' : 'textSecondary'}>
                {WEEKDAY_NAMES[day][0]}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>
      {Platform.OS === 'ios' && iosPickerOpen && (
        <DateTimePicker
          value={timeOfDayDate(hour, minute)}
          mode="time"
          display="spinner"
          accentColor={theme.tint}
          onValueChange={(_event, selected) => setTime(selected)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  reminder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  time: {
    flex: 1,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
