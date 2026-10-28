import type { SQLiteDatabase } from 'expo-sqlite';

import type { BodyMeasurements } from '@/data/mobility-tests';
import type { DateKey } from '@/lib/dates';

import { useDbQuery } from './use-db-query';

export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export type Profile = {
  firstName: string;
  lastName: string;
  dateOfBirth: DateKey | null;
  gender: Gender | null;
  /** File name inside the app's profile photo directory, see `lib/profile-photo.ts`. */
  photoFile: string | null;
  body: BodyMeasurements;
};

type ProfileRow = {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  photo_file: string | null;
  hand_length_cm: number | null;
  finger_length_cm: number | null;
  hand_span_cm: number | null;
};

async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  return {
    firstName: row?.first_name ?? '',
    lastName: row?.last_name ?? '',
    dateOfBirth: row?.date_of_birth ?? null,
    gender: row?.gender ?? null,
    photoFile: row?.photo_file ?? null,
    body: {
      handLength: row?.hand_length_cm ?? null,
      fingerLength: row?.finger_length_cm ?? null,
      handSpan: row?.hand_span_cm ?? null,
    },
  };
}

export async function updateProfile(db: SQLiteDatabase, profile: Profile) {
  await db.runAsync(
    `UPDATE profile
     SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, photo_file = ?,
       hand_length_cm = ?, finger_length_cm = ?, hand_span_cm = ?
     WHERE id = 1`,
    profile.firstName.trim(),
    profile.lastName.trim(),
    profile.dateOfBirth,
    profile.gender,
    profile.photoFile,
    profile.body.handLength,
    profile.body.fingerLength,
    profile.body.handSpan
  );
}

export async function updateProfilePhoto(db: SQLiteDatabase, photoFile: string | null) {
  await db.runAsync('UPDATE profile SET photo_file = ? WHERE id = 1', photoFile);
}

export function useProfile() {
  return useDbQuery(getProfile, ['profile']);
}
