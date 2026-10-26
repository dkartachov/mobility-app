import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * Runs `query` and re-runs it whenever one of `tables` changes, so every screen reading
 * a table stays in sync with writes made elsewhere (e.g. logging a session updates the
 * Dashboard and goal progress). Requires `enableChangeListener` on the provider.
 *
 * Pass a module-level function as `query` so it keeps the same identity across renders.
 */
export function useDbQuery<T>(query: (db: SQLiteDatabase) => Promise<T>, tables: string[]) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const tablesKey = tables.join(',');

  useEffect(() => {
    let cancelled = false;
    const watched = new Set(tablesKey.split(','));

    const run = () => {
      query(db).then((result) => {
        if (!cancelled) setData(result);
      }, console.error);
    };

    run();
    const subscription = addDatabaseChangeListener((event) => {
      if (watched.has(event.tableName)) run();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [db, query, tablesKey]);

  return data;
}
