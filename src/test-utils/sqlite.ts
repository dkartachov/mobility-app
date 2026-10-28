/// <reference types="node" />

import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/db/schema';

/**
 * A fresh in-memory database, migrated to the latest schema. Backed by Node's built-in SQLite,
 * wrapped in the parts of the expo-sqlite API the app uses, so queries run against real SQL.
 */
export async function createTestDb(): Promise<SQLiteDatabase> {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...params: SQLInputValue[]) => {
      const { lastInsertRowid, changes } = sqlite.prepare(sql).run(...params);
      return { lastInsertRowId: Number(lastInsertRowid), changes: Number(changes) };
    },
    getFirstAsync: async (sql: string, ...params: SQLInputValue[]) => sqlite.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql: string, ...params: SQLInputValue[]) => sqlite.prepare(sql).all(...params),
    withTransactionAsync: async (task: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const typed = db as unknown as SQLiteDatabase;
  await migrateDbIfNeeded(typed);
  return typed;
}
