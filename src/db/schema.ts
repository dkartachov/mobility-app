import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'mobility.db';

/**
 * Each entry migrates the schema from version `index` to `index + 1`.
 * Append new migrations; never edit ones that have already shipped.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    date_of_birth TEXT,
    gender TEXT,
    photo_file TEXT
  );
  INSERT INTO profile (id) VALUES (1);

  CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    target_minutes INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    routine_id TEXT
  );
  CREATE INDEX sessions_local_date ON sessions (local_date);
  `,
  `
  CREATE TABLE mobility_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taken_at TEXT NOT NULL,
    local_date TEXT NOT NULL
  );
  CREATE INDEX mobility_tests_local_date ON mobility_tests (local_date);
  `,
  `
  CREATE TABLE mobility_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobility_test_id INTEGER NOT NULL REFERENCES mobility_tests (id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    side TEXT,
    value REAL NOT NULL
  );
  CREATE INDEX mobility_test_results_test ON mobility_test_results (mobility_test_id);
  `,
  // Results saved before this were raw 0–1 slider positions.
  `
  ALTER TABLE mobility_test_results ADD COLUMN unit TEXT NOT NULL DEFAULT 'slider';
  `,
  // Optional body measurements in cm, for more accurate flexibility test hints.
  `
  ALTER TABLE profile ADD COLUMN hand_length_cm REAL;
  ALTER TABLE profile ADD COLUMN finger_length_cm REAL;
  ALTER TABLE profile ADD COLUMN hand_span_cm REAL;
  ALTER TABLE profile ADD COLUMN leg_length_cm REAL;
  `,
  // Leg length was only used by the straddle, which is now measured with the phone.
  `
  ALTER TABLE profile DROP COLUMN leg_length_cm;
  `,
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}
