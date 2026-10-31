import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

import { updateProfilePhoto } from '@/db/profile';
import { SCHEMA_VERSION } from '@/db/schema';
import { toDateKey, todayKey } from '@/lib/dates';
import { createTestDb } from '@/test-utils/sqlite';

// An in-memory bucket standing in for Supabase Storage.
const mockObjects = new Map<string, ArrayBuffer>();
const mockFailUploads = { value: false };
const SIGNED_IN = { user: { id: 'user-1' } };
const mockSession = { value: SIGNED_IN as object | null, error: null as { message: string } | null };
const mockApp = { id: 'com.hogos.mobilityapp.dev' };
const mockBucketsUsed = new Set<string>();
const mockDownloads: { bytes: Uint8Array; deleted: boolean } = { bytes: new Uint8Array(), deleted: false };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: mockSession.value }, error: mockSession.error }) },
    storage: {
      from: (bucket: string) => ({
        list: async (dir: string) => ({
          data: [...mockObjects.keys()]
            .filter((path) => path.startsWith(`${dir}/`))
            .map((path) => ({ name: path.slice(dir.length + 1) })),
          error: null,
        }),
        upload: async (path: string, body: ArrayBuffer) => {
          mockBucketsUsed.add(bucket);
          if (mockFailUploads.value) return { data: null, error: { message: 'project paused' } };
          mockObjects.set(path, body);
          return { data: {}, error: null };
        },
        remove: async (paths: string[]) => {
          paths.forEach((path) => mockObjects.delete(path));
          return { data: [], error: null };
        },
        createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://bucket/${path}` }, error: null }),
      }),
    },
  },
}));

jest.mock('expo-application', () => ({
  get applicationId() {
    return mockApp.id;
  },
}));

const mockLocalFiles = new Set<string>();

jest.mock('expo-file-system', () => {
  class File {
    name: string;
    constructor(...parts: unknown[]) {
      this.name = String(parts[parts.length - 1]);
    }
    get exists() {
      return mockLocalFiles.has(this.name) || this.name === 'backup-restore.db';
    }
    async bytes() {
      return mockDownloads.bytes;
    }
    delete() {
      mockDownloads.deleted = true;
    }
    static downloadFileAsync = jest.fn(async (_url: string, destination: File) => destination);
  }
  class Directory {
    create() {}
  }
  return { File, Directory, Paths: { document: 'document', cache: 'cache' } };
});

jest.mock('expo-image-picker', () => ({}));

const mockBackupDatabaseAsync = jest.fn(async () => {});
const mockDeserialize = jest.fn();
jest.mock('expo-sqlite', () => ({
  backupDatabaseAsync: (...args: unknown[]) => (mockBackupDatabaseAsync as (...a: unknown[]) => unknown)(...args),
  deserializeDatabaseAsync: (...args: unknown[]) => mockDeserialize(...args),
}));

// `lib/backup` reads its saved state on import, so each test loads a fresh copy.
function loadBackup() {
  let backup!: typeof import('./backup');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs a synchronous load.
    backup = require('./backup');
  });
  return backup;
}

const SERIALIZED = new Uint8Array(32).fill(2);

async function createDbWithSerialize() {
  const db = await createTestDb();
  return Object.assign(db, { serializeAsync: jest.fn(async () => SERIALIZED) }) as SQLiteDatabase;
}

function snapshotPaths() {
  return [...mockObjects.keys()].filter((path) => path.startsWith('user-1/snapshots/')).sort();
}

function restorableSource(userVersion: number, integrity = 'ok') {
  return {
    getFirstAsync: async (sql: string) => {
      if (sql === 'PRAGMA integrity_check') return { integrity_check: integrity };
      if (sql === 'PRAGMA user_version') return { user_version: userVersion };
      return { photo_file: null };
    },
    closeAsync: jest.fn(async () => {}),
  };
}

describe('backups', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = await createDbWithSerialize();
    mockObjects.clear();
    mockLocalFiles.clear();
    mockFailUploads.value = false;
    mockSession.value = SIGNED_IN;
    mockApp.id = 'com.hogos.mobilityapp.dev';
    mockBucketsUsed.clear();
    mockSession.error = null;
    mockDownloads.bytes = new Uint8Array();
    mockDownloads.deleted = false;
    mockBackupDatabaseAsync.mockClear();
    mockDeserialize.mockReset();
    Storage.clearSync();
  });

  it('switches a snapshot from the WAL header to a rollback journal, leaving the rest alone', () => {
    const { withRollbackJournalHeader } = loadBackup();
    const patched = withRollbackJournalHeader(SERIALIZED);
    expect([patched[17], patched[18], patched[19], patched[20]]).toEqual([2, 1, 1, 2]);
    expect(SERIALIZED[18]).toBe(2);
  });

  it("doesn't upload until the device is linked", async () => {
    const { backUp, linkDevice } = loadBackup();
    await backUp(db);
    expect(snapshotPaths()).toEqual([]);

    await linkDevice(db);
    expect(snapshotPaths()).toEqual([`user-1/snapshots/${todayKey()}.db`]);
  });

  it('uploads a snapshot that can be restored', async () => {
    const { linkDevice } = loadBackup();
    await linkDevice(db);
    const uploaded = new Uint8Array(mockObjects.get(`user-1/snapshots/${todayKey()}.db`)!);
    expect(uploaded[18]).toBe(1);
    expect(uploaded[19]).toBe(1);
    expect(uploaded.length).toBe(SERIALIZED.length);
  });

  it('keeps one snapshot per day, replacing the same day', async () => {
    const { backUp, linkDevice } = loadBackup();
    await linkDevice(db);
    await backUp(db);
    expect(snapshotPaths()).toHaveLength(1);
  });

  it('deletes only the oldest snapshots beyond the limit', async () => {
    const { linkDevice, SNAPSHOTS_TO_KEEP } = loadBackup();
    const oldest = 'user-1/snapshots/2020-01-01.db';
    mockObjects.set(oldest, new ArrayBuffer(1));
    for (let i = 1; i < SNAPSHOTS_TO_KEEP; i++) {
      const day = new Date(2021, 0, i);
      mockObjects.set(`user-1/snapshots/${toDateKey(day)}.db`, new ArrayBuffer(1));
    }
    mockObjects.set('user-1/photos/keep-me.jpg', new ArrayBuffer(1));

    await linkDevice(db); // today's upload makes SNAPSHOTS_TO_KEEP + 1

    expect(snapshotPaths()).toHaveLength(SNAPSHOTS_TO_KEEP);
    expect(mockObjects.has(oldest)).toBe(false);
    expect(mockObjects.has('user-1/photos/keep-me.jpg')).toBe(true);
  });

  it.each([
    ['com.hogos.mobilityapp.dev', 'backups-dev'],
    ['com.hogos.mobilityapp', 'backups-prod'],
  ])('backs up %s to %s', async (id, bucket) => {
    mockApp.id = id;
    const { linkDevice } = loadBackup();
    await linkDevice(db);
    expect([...mockBucketsUsed]).toEqual([bucket]);
  });

  it('turns backups off in any other app', async () => {
    mockApp.id = 'host.exp.exponent';
    const { isBackupConfigured, linkDevice } = loadBackup();
    expect(isBackupConfigured).toBe(false);
    await linkDevice(db);
    expect(mockBucketsUsed.size).toBe(0);
  });

  it("keeps each user's backups in their own folder", async () => {
    const { linkDevice, listSnapshots } = loadBackup();
    mockObjects.set('user-2/snapshots/2026-01-01.db', new ArrayBuffer(1));
    await linkDevice(db);
    expect(mockObjects.has('user-2/snapshots/2026-01-01.db')).toBe(true);
    await expect(listSnapshots()).resolves.toEqual([todayKey()]);
  });

  it('lists snapshots newest first, ignoring other files', async () => {
    const { listSnapshots } = loadBackup();
    mockObjects.set('user-1/snapshots/2026-01-01.db', new ArrayBuffer(1));
    mockObjects.set('user-1/snapshots/2026-03-01.db', new ArrayBuffer(1));
    mockObjects.set('user-1/snapshots/notes.txt', new ArrayBuffer(1));
    await expect(listSnapshots()).resolves.toEqual(['2026-03-01', '2026-01-01']);
  });

  it('reports a failed upload and stays dirty so it can be retried', async () => {
    const { linkDevice, retryBackupIfDirty, backUpIfDirty } = loadBackup();
    mockFailUploads.value = true;
    await linkDevice(db);
    expect(snapshotPaths()).toEqual([]);
    expect(Storage.getItemSync('backup.dirty')).toBe('true');

    // A plain change doesn't hammer a failing project; opening the app does retry.
    mockFailUploads.value = false;
    await backUpIfDirty(db);
    expect(snapshotPaths()).toEqual([]);
    await retryBackupIfDirty(db);
    expect(snapshotPaths()).toHaveLength(1);
    expect(Storage.getItemSync('backup.dirty')).toBe('false');
  });

  it('skips uploading without a session, keeping changes for later', async () => {
    const { linkDevice, markBackupDirty } = loadBackup();
    mockSession.value = null;
    markBackupDirty();
    await linkDevice(db);
    expect(snapshotPaths()).toEqual([]);
    expect(Storage.getItemSync('backup.dirty')).toBe('true');
  });

  it('reports a failure to refresh the session, as a paused project causes', async () => {
    const { backUp, getBackupState, linkDevice } = loadBackup();
    await linkDevice(db);
    mockObjects.clear();
    mockSession.value = null;
    mockSession.error = { message: 'Failed to fetch' };
    await backUp(db);

    expect(snapshotPaths()).toEqual([]);
    expect(Storage.getItemSync('backup.dirty')).toBe('true');
    expect(getBackupState().lastError).toBe('Failed to fetch');
  });

  it('counts a change made during an upload as a new change', async () => {
    const { linkDevice, markBackupDirty } = loadBackup();
    (db.serializeAsync as jest.Mock).mockImplementationOnce(async () => {
      markBackupDirty();
      return SERIALIZED;
    });
    await linkDevice(db);
    expect(Storage.getItemSync('backup.dirty')).toBe('true');
  });

  it('uploads the profile photo once, before the snapshot that refers to it', async () => {
    const { backUp, linkDevice } = loadBackup();
    await updateProfilePhoto(db, 'avatar-1.jpg');
    mockLocalFiles.add('avatar-1.jpg');

    await linkDevice(db);
    expect(mockObjects.has('user-1/photos/avatar-1.jpg')).toBe(true);

    mockObjects.delete('user-1/photos/avatar-1.jpg');
    await backUp(db);
    expect(mockObjects.has('user-1/photos/avatar-1.jpg')).toBe(false);
  });

  it('restores a healthy snapshot and links the device', async () => {
    const { restoreSnapshot } = loadBackup();
    const source = restorableSource(SCHEMA_VERSION);
    mockDeserialize.mockResolvedValue(source);

    await restoreSnapshot(db, '2026-01-01');

    expect(mockBackupDatabaseAsync).toHaveBeenCalledWith({ sourceDatabase: source, destDatabase: db });
    expect(source.closeAsync).toHaveBeenCalled();
    expect(mockDownloads.deleted).toBe(true);
    expect(Storage.getItemSync('backup.linked')).toBe('true');
  });

  it('restores an older snapshot, leaving it for the migrations to upgrade', async () => {
    const { restoreSnapshot } = loadBackup();
    mockDeserialize.mockResolvedValue(restorableSource(1));
    await restoreSnapshot(db, '2026-01-01');
    expect(mockBackupDatabaseAsync).toHaveBeenCalled();
  });

  it.each([
    ['a damaged file', restorableSource(SCHEMA_VERSION, 'row 3 missing'), 'damaged'],
    ['a database from another app', restorableSource(0), 'not a Plie database'],
    ['a newer schema', restorableSource(SCHEMA_VERSION + 1), 'newer version'],
  ])('refuses %s without touching the database', async (_name, source, message) => {
    const { restoreSnapshot } = loadBackup();
    mockDeserialize.mockResolvedValue(source);

    await expect(restoreSnapshot(db, '2026-01-01')).rejects.toThrow(message);

    expect(mockBackupDatabaseAsync).not.toHaveBeenCalled();
    expect(source.closeAsync).toHaveBeenCalled();
    expect(mockDownloads.deleted).toBe(true);
    expect(Storage.getItemSync('backup.linked')).toBeNull();
  });
});
