import type { SQLiteDatabase } from 'expo-sqlite';

import type { Sex } from '@/data/mobility-tests';
import type { DateKey } from '@/lib/dates';

import { useDbQuery } from './use-db-query';

export const SEXES: readonly Sex[] = ['male', 'female'];

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Male',
  female: 'Female',
};

export type Profile = {
  firstName: string;
  lastName: string;
  dateOfBirth: DateKey | null;
  sex: Sex | null;
  /** File name inside the app's profile photo directory, see `lib/profile-photo.ts`. */
  photoFile: string | null;
};

type ProfileRow = {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  /** Holds the sex at birth. Older rows can also say `other` or `prefer_not_to_say`, read as not set. */
  gender: string | null;
  photo_file: string | null;
};

export async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  return {
    firstName: row?.first_name ?? '',
    lastName: row?.last_name ?? '',
    dateOfBirth: row?.date_of_birth ?? null,
    sex: SEXES.find((sex) => sex === row?.gender) ?? null,
    photoFile: row?.photo_file ?? null,
  };
}

export async function updateProfile(db: SQLiteDatabase, profile: Profile) {
  await db.runAsync(
    `UPDATE profile
     SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, photo_file = ?
     WHERE id = 1`,
    profile.firstName.trim(),
    profile.lastName.trim(),
    profile.dateOfBirth,
    profile.sex,
    profile.photoFile
  );
}

export async function updateProfilePhoto(db: SQLiteDatabase, photoFile: string | null) {
  await db.runAsync('UPDATE profile SET photo_file = ? WHERE id = 1', photoFile);
}

export function useProfile() {
  return useDbQuery(getProfile, ['profile']);
}
