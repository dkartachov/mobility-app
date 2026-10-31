import { createTestDb } from '@/test-utils/sqlite';

import { getProfile, updateProfile, updateProfilePhoto, type Profile } from './profile';

describe('profile', () => {
  it('starts empty', async () => {
    const db = await createTestDb();

    expect(await getProfile(db)).toEqual({
      firstName: '',
      lastName: '',
      dateOfBirth: null,
      gender: null,
      photoFile: null,
    });
  });

  it('saves the profile, trimming names', async () => {
    const db = await createTestDb();
    const profile: Profile = {
      firstName: '  Ada ',
      lastName: ' Lovelace  ',
      dateOfBirth: '1990-12-10',
      gender: 'female',
      photoFile: 'photo.jpg',
    };

    await updateProfile(db, profile);

    expect(await getProfile(db)).toEqual({ ...profile, firstName: 'Ada', lastName: 'Lovelace' });
  });

  it('updates only the photo', async () => {
    const db = await createTestDb();
    await updateProfile(db, { ...(await getProfile(db)), firstName: 'Ada' });

    await updateProfilePhoto(db, 'new.jpg');

    expect(await getProfile(db)).toMatchObject({ firstName: 'Ada', photoFile: 'new.jpg' });
  });
});
