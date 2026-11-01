import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Field, TextField } from '@/components/field';
import { FormScreen } from '@/components/form-screen';
import { PageHeader } from '@/components/page-header';
import { BirthDateField, SexField } from '@/components/profile-fields';
import { Radius, Spacing } from '@/constants/theme';
import { updateProfile, updateProfilePhoto, useProfile, type Profile } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { syncDisplayName } from '@/lib/auth';
import { deleteProfilePhoto, pickProfilePhoto } from '@/lib/profile-photo';

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
      if (form.firstName !== initial.firstName || form.lastName !== initial.lastName) syncDisplayName(form);
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

      <BirthDateField value={form.dateOfBirth} onChange={(value) => set('dateOfBirth', value)} />

      <SexField value={form.sex} onChange={(value) => set('sex', value)} />

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
});
