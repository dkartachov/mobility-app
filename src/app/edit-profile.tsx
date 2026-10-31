import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { Field, TextField } from '@/components/field';
import { FormScreen } from '@/components/form-screen';
import { PageHeader } from '@/components/page-header';
import { Radius, Spacing } from '@/constants/theme';
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

export default function EditProfileScreen() {
  const profile = useProfile();
  // Mount the form only once the saved profile has loaded, so it starts from real values.
  return profile ? <ProfileForm initial={profile} /> : null;
}

function ProfileForm({ initial }: { initial: Profile }) {
  const db = useSQLiteContext();
  const theme = useTheme();
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

  return (
    <FormScreen>
      <PageHeader title="Edit profile" />
      <View style={styles.photo}>
        <View style={[styles.avatarRing, { borderColor: theme.tint }]}>
          <Avatar photoFile={form.photoFile} initials={initials} size={112} />
        </View>
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

      <Button title="Save" onPress={save} loading={saving} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarRing: {
    padding: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 2,
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
});
