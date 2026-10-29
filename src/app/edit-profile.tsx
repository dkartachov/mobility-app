import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { Field, TextField } from '@/components/field';
import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { BODY_MEASUREMENT_LABELS, DEFAULT_BODY, type BodyMeasurements } from '@/data/mobility-tests';
import {
  GENDER_LABELS,
  GENDERS,
  updateProfile,
  updateProfilePhoto,
  useProfile,
  type Profile,
} from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { deleteProfilePhoto, pickProfilePhoto } from '@/lib/profile-photo';

const MIN_BIRTH_DATE = new Date(1900, 0, 1);
const DEFAULT_BIRTH_DATE = new Date(1990, 0, 1);
const SCROLL_TO_SECTION_DELAY_MS = 300;
/** Flash of the body measurements section after scrolling to it. Starts once the scroll has mostly finished. */
const HIGHLIGHT = { afterScrollMs: 250, fadeInMs: 400, holdMs: 200, fadeOutMs: 400 };

export default function EditProfileScreen() {
  const profile = useProfile();
  // Mount the form only once the saved profile has loaded, so it starts from real values.
  return profile ? <ProfileForm initial={profile} /> : null;
}

function ProfileForm({ initial }: { initial: Profile }) {
  const db = useSQLiteContext();
  const { section } = useLocalSearchParams<{ section?: 'body' }>();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Photo changes are saved immediately; the old file is deleted once replaced.
  const savePhoto = async (photoFile: string | null) => {
    await updateProfilePhoto(db, photoFile);
    deleteProfilePhoto(form.photoFile);
    set('photoFile', photoFile);
  };

  const changePhoto = async () => {
    const fileName = await pickProfilePhoto();
    if (fileName) await savePhoto(fileName);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(db, form);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const initials = `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase();

  // Opened from a flexibility test to add body measurements: scroll to that section once, after
  // a pause at the top so it's clear this is the Edit profile screen, then flash it.
  const theme = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(scrollTimer.current), []);
  const highlight = useSharedValue(0);
  const highlightStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(highlight.get(), [0, 1], [theme.background, theme.tintSoft]),
  }));
  const scrollToBodySection = (event: LayoutChangeEvent) => {
    if (section !== 'body' || scrollTimer.current) return;
    const y = event.nativeEvent.layout.y - Spacing.three;
    scrollTimer.current = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
      highlight.set(
        withDelay(
          HIGHLIGHT.afterScrollMs,
          withSequence(
            withTiming(1, { duration: HIGHLIGHT.fadeInMs }),
            withDelay(HIGHLIGHT.holdMs, withTiming(0, { duration: HIGHLIGHT.fadeOutMs }))
          )
        )
      );
    }, SCROLL_TO_SECTION_DELAY_MS);
  };

  return (
    <FormScreen ref={scrollRef}>
      <ThemedText type="title" accessibilityRole="header">
        Edit profile
      </ThemedText>
      <View style={styles.photo}>
        <Avatar photoFile={form.photoFile} initials={initials} size={112} />
        <View style={styles.photoButtons}>
          <Button title={form.photoFile ? 'Change photo' : 'Add photo'} variant="secondary" onPress={changePhoto} />
          {form.photoFile && (
            <Button title="Remove" variant="destructive" onPress={() => savePhoto(null)} />
          )}
        </View>
      </View>

      <Field label="First name">
        <TextField
          value={form.firstName}
          onChangeText={(text) => set('firstName', text)}
          placeholder="First name"
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          returnKeyType="next"
        />
      </Field>

      <Field label="Last name">
        <TextField
          value={form.lastName}
          onChangeText={(text) => set('lastName', text)}
          placeholder="Last name"
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
        />
      </Field>

      <Field label="Date of birth">
        <DateField
          value={form.dateOfBirth}
          onChange={(value) => set('dateOfBirth', value)}
          defaultDate={DEFAULT_BIRTH_DATE}
          minimumDate={MIN_BIRTH_DATE}
          maximumDate={new Date()}
        />
      </Field>

      <Field label="Gender">
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {GENDERS.map((gender) => (
            <Chip
              key={gender}
              label={GENDER_LABELS[gender]}
              selected={form.gender === gender}
              onPress={() => set('gender', form.gender === gender ? null : gender)}
            />
          ))}
        </View>
      </Field>

      <Animated.View style={[styles.bodySection, highlightStyle]} onLayout={scrollToBodySection}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Body measurements</ThemedText>
          <ThemedText themeColor="textSecondary">
            Optional, in cm. Used to make the hints in flexibility tests match your body. Empty fields use
            average sizes.
          </ThemedText>
        </View>

        {BODY_FIELDS.map(({ key, label, howTo, placeholder }) => (
          <Field key={key} label={label}>
            <ThemedText type="small" themeColor="textSecondary">
              {howTo}
            </ThemedText>
            <CentimetreField
              value={form.body[key]}
              placeholder={placeholder}
              accessibilityLabel={`${label}, in centimetres`}
              onChange={(value) => set('body', { ...form.body, [key]: value })}
            />
          </Field>
        ))}
      </Animated.View>

      <Button title="Save" onPress={save} loading={saving} />
    </FormScreen>
  );
}

const HOW_TO_MEASURE: Record<keyof BodyMeasurements, string> = {
  handLength: 'Wrist crease to the tip of your middle finger.',
  fingerLength: 'Base to tip of your middle finger, on the palm side.',
  handSpan: 'Thumb tip to little finger tip, with the hand spread wide.',
};

const BODY_FIELDS = (Object.keys(HOW_TO_MEASURE) as (keyof BodyMeasurements)[]).map((key) => ({
  key,
  label: BODY_MEASUREMENT_LABELS[key],
  howTo: HOW_TO_MEASURE[key],
  // The default shows through when empty.
  placeholder: DEFAULT_BODY[key].toString(),
}));

function CentimetreField({
  value,
  onChange,
  placeholder,
  accessibilityLabel,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
  accessibilityLabel: string;
}) {
  // Kept as text while typing, so "18." doesn't get turned back into "18".
  const [text, setText] = useState(value === null ? '' : String(value));

  const change = (next: string) => {
    setText(next);
    const parsed = Number(next.replace(',', '.'));
    onChange(next.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  };

  return (
    <View style={styles.cmRow}>
      <TextField
        value={text}
        onChangeText={change}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        style={styles.cmInput}
      />
      <ThemedText themeColor="textSecondary">cm</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Bleeds slightly past the form's edges so the highlight has room around the fields.
  bodySection: {
    gap: Spacing.four,
    marginTop: Spacing.three,
    marginHorizontal: -Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.large,
  },
  sectionHeader: {
    gap: Spacing.one,
  },
  cmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cmInput: {
    flex: 1,
  },
});
