import { createTestDb } from '@/test-utils/sqlite';

import { migrateDbIfNeeded } from './schema';

describe('migrateDbIfNeeded', () => {
  it('creates the latest schema with a single empty profile row', async () => {
    const db = await createTestDb();

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    expect(tables.map((t) => t.name)).toEqual(['goals', 'mobility_test_results', 'mobility_tests', 'profile', 'sessions']);

    const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(profile)');
    expect(profileColumns.map((c) => c.name)).toEqual([
      'id',
      'first_name',
      'last_name',
      'date_of_birth',
      'gender',
      'photo_file',
    ]);
    expect(await db.getAllAsync('SELECT id, first_name FROM profile')).toEqual([{ id: 1, first_name: '' }]);
  });

  it('is safe to run again on an up-to-date database', async () => {
    const db = await createTestDb();
    const before = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

    await migrateDbIfNeeded(db);

    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual(before);
    expect(await db.getAllAsync('SELECT id FROM profile')).toHaveLength(1);
  });

  it('cascades deleting a mobility test to its results', async () => {
    const db = await createTestDb();
    const { lastInsertRowId } = await db.runAsync(
      "INSERT INTO mobility_tests (taken_at, local_date) VALUES ('2026-10-01T10:00:00Z', '2026-10-01')"
    );
    await db.runAsync(
      "INSERT INTO mobility_test_results (mobility_test_id, exercise_id, side, value, unit) VALUES (?, 'straddle', NULL, 120, 'deg')",
      lastInsertRowId
    );

    await db.runAsync('DELETE FROM mobility_tests WHERE id = ?', lastInsertRowId);

    expect(await db.getAllAsync('SELECT * FROM mobility_test_results')).toEqual([]);
  });
});
