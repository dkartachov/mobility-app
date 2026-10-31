/**
 * Snapshot backups: SQLite stays the app's only live database, and a copy of the whole file goes
 * to a private Supabase Storage bucket, one per day, in a folder only that user can reach (see
 * `supabase/setup.sql`). Each app variant has its own bucket, picked by the installed app's ID
 * rather than `APP_VARIANT`, so how the dev server was started can't send it to the wrong one.
 *
 * A device only backs up once it's linked: after sign-in, if the bucket already has backups, you
 * choose between restoring one and keeping this phone's data. Without that, a fresh install could
 * replace today's good snapshot with an empty database.
 */
import * as Application from 'expo-application';
import { File, Paths } from 'expo-file-system';
import { backupDatabaseAsync, deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { getProfile } from '@/db/profile';
import { SCHEMA_VERSION } from '@/db/schema';
import { todayKey, type DateKey } from '@/lib/dates';
import { profilePhotoFile } from '@/lib/profile-photo';
import { supabase } from '@/lib/supabase';

/** Days of history kept in the bucket. */
export const SNAPSHOTS_TO_KEEP = 30;

const SNAPSHOT_DIR = 'snapshots';
const PHOTO_DIR = 'photos';
const SNAPSHOT_NAME = /^(\d{4}-\d{2}-\d{2})\.db$/;

const LINKED_KEY = 'backup.linked';
const DIRTY_KEY = 'backup.dirty';
const LAST_BACKUP_KEY = 'backup.lastBackupAt';
const UPLOADED_PHOTO_KEY = 'backup.uploadedPhoto';

const BUCKETS: Record<string, string> = {
  'com.hogos.mobilityapp': 'backups-prod',
  'com.hogos.mobilityapp.dev': 'backups-dev',
};

// Anything else, like Expo Go, has no bucket: guessing could put test data among real backups.
const bucketName = Application.applicationId ? BUCKETS[Application.applicationId] : undefined;

export const isBackupConfigured = supabase !== null && bucketName !== undefined;

export type BackupState = {
  /** This device may upload, see the top of this file. */
  linked: boolean;
  lastBackupAt: string | null;
  /** Why the most recent backup failed, `null` once one succeeds. Not persisted. */
  lastError: string | null;
  running: boolean;
};

let state: BackupState = {
  linked: Storage.getItemSync(LINKED_KEY) === 'true',
  lastBackupAt: Storage.getItemSync(LAST_BACKUP_KEY),
  lastError: null,
  running: false,
};
const listeners = new Set<() => void>();

function setState(next: Partial<BackupState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBackupState() {
  return state;
}

export function useBackupState() {
  return useSyncExternalStore(subscribe, getBackupState);
}

function setDirty(dirty: boolean) {
  Storage.setItemSync(DIRTY_KEY, String(dirty));
}

/** Records that the database has changes the bucket doesn't, surviving an app restart. */
export function markBackupDirty() {
  setDirty(true);
}

function bucket() {
  if (!supabase || !bucketName) throw new Error('Backups are not set up in this build');
  return supabase.storage.from(bucketName);
}

function assertOk(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** The signed-in user's ID, which is also the name of their folder in the bucket. */
async function currentUserId() {
  const { data, error } = await supabase!.auth.getSession();
  assertOk(error);
  return data.session?.user.id ?? null;
}

async function requireUserId() {
  const userId = await currentUserId();
  if (!userId) throw new Error('Sign in first');
  return userId;
}

/** Supabase's documented upload body for React Native is an `ArrayBuffer`. */
function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * The live database uses WAL, and SQLite refuses to open a serialized WAL database from memory, so
 * a raw snapshot could never be restored. Bytes 18 and 19 of the header are the file format's
 * read and write versions: 1 means a rollback journal. The contents don't change, as the snapshot
 * already includes everything from the WAL file.
 */
export function withRollbackJournalHeader(bytes: Uint8Array) {
  const copy = bytes.slice();
  copy[18] = 1;
  copy[19] = 1;
  return copy;
}

/** Days with a backup, newest first. */
export async function listSnapshots(): Promise<DateKey[]> {
  const { data, error } = await bucket().list(`${await requireUserId()}/${SNAPSHOT_DIR}`, { limit: 1000 });
  assertOk(error);
  return (data ?? [])
    .map((file) => SNAPSHOT_NAME.exec(file.name)?.[1])
    .filter((date) => date !== undefined)
    .sort()
    .reverse();
}

async function pruneSnapshots() {
  const expired = (await listSnapshots()).slice(SNAPSHOTS_TO_KEEP);
  if (expired.length === 0) return;
  const userId = await requireUserId();
  const { error } = await bucket().remove(expired.map((date) => `${userId}/${SNAPSHOT_DIR}/${date}.db`));
  assertOk(error);
}

/**
 * Photos go up before the snapshot, so a snapshot never refers to one the bucket doesn't have.
 * Each pick has a unique file name, so old photos stay usable by older snapshots.
 */
async function uploadProfilePhoto(db: SQLiteDatabase, userId: string) {
  const { photoFile } = await getProfile(db);
  if (!photoFile || Storage.getItemSync(UPLOADED_PHOTO_KEY) === photoFile) return;

  const file = profilePhotoFile(photoFile);
  if (!file.exists) return;
  const { error } = await bucket().upload(`${userId}/${PHOTO_DIR}/${photoFile}`, toArrayBuffer(await file.bytes()), {
    contentType: 'application/octet-stream',
    upsert: true,
  });
  assertOk(error);
  Storage.setItemSync(UPLOADED_PHOTO_KEY, photoFile);
}

async function uploadSnapshot(db: SQLiteDatabase) {
  setState({ running: true });
  try {
    // A paused project can fail here, when the session needs refreshing, so this must be reported.
    const userId = await currentUserId();
    if (!userId) return;

    // Cleared first, so a change made during the upload counts as a new change.
    setDirty(false);
    await uploadProfilePhoto(db, userId);
    const snapshot = withRollbackJournalHeader(await db.serializeAsync());
    const { error } = await bucket().upload(`${userId}/${SNAPSHOT_DIR}/${todayKey()}.db`, toArrayBuffer(snapshot), {
      contentType: 'application/octet-stream',
      upsert: true,
    });
    assertOk(error);

    const now = new Date().toISOString();
    Storage.setItemSync(LAST_BACKUP_KEY, now);
    setState({ lastBackupAt: now, lastError: null });
  } catch (error) {
    setDirty(true);
    setState({ lastError: error instanceof Error ? error.message : String(error) });
    return;
  } finally {
    setState({ running: false });
  }

  // The snapshot is safely stored, so failing to tidy up isn't a failed backup.
  await pruneSnapshots().catch(console.warn);
}

let inFlight: Promise<void> | null = null;

/** Uploads a snapshot now. Failures end up in `lastError` rather than rejecting. */
export function backUp(db: SQLiteDatabase): Promise<void> {
  if (!isBackupConfigured || !state.linked) return Promise.resolve();
  inFlight ??= uploadSnapshot(db).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Backs up only if there are unsaved changes, including ones made during an upload in progress. */
export async function backUpIfDirty(db: SQLiteDatabase): Promise<void> {
  if (inFlight) await inFlight;
  if (Storage.getItemSync(DIRTY_KEY) !== 'true' || state.lastError) return;
  await backUp(db);
}

/** Like `backUpIfDirty`, but tries again after a failure. For moments worth a retry. */
export async function retryBackupIfDirty(db: SQLiteDatabase): Promise<void> {
  if (inFlight) await inFlight;
  if (Storage.getItemSync(DIRTY_KEY) === 'true') await backUp(db);
}

/** Allows this device to upload, keeping what's on it, and uploads it right away. */
export function linkDevice(db: SQLiteDatabase) {
  Storage.setItemSync(LINKED_KEY, 'true');
  setState({ linked: true });
  return backUp(db);
}

/** Forgets this device's link, so signing in again asks what to do with existing backups. */
export function unlinkDevice() {
  Storage.removeItemSync(LINKED_KEY);
  Storage.removeItemSync(LAST_BACKUP_KEY);
  Storage.removeItemSync(UPLOADED_PHOTO_KEY);
  setState({ linked: false, lastBackupAt: null, lastError: null });
}

/** Rejects anything that isn't a healthy database this version of the app can migrate. */
async function assertRestorable(source: SQLiteDatabase) {
  const integrity = await source.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  if (integrity?.integrity_check !== 'ok') throw new Error('This backup is damaged');

  const version = await source.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (!version?.user_version) throw new Error('This backup is not a Plie database');
  if (version.user_version > SCHEMA_VERSION) {
    throw new Error('This backup is from a newer version of the app. Update the app first');
  }
}

async function downloadFromBucket(path: string, destination: File) {
  const { data, error } = await bucket().createSignedUrl(path, 60);
  assertOk(error);
  return File.downloadFileAsync(data!.signedUrl, destination, { idempotent: true });
}

async function restoreProfilePhoto(source: SQLiteDatabase, userId: string) {
  const { photoFile } = await getProfile(source);
  if (!photoFile) return;
  const file = profilePhotoFile(photoFile);
  if (!file.exists) await downloadFromBucket(`${userId}/${PHOTO_DIR}/${photoFile}`, file);
  Storage.setItemSync(UPLOADED_PHOTO_KEY, photoFile);
}

/**
 * Replaces everything in `db` with one day's snapshot, after checking it on an in-memory copy so a
 * bad download can't touch your data. Change listeners don't fire for this and the snapshot may
 * need migrating, so the caller must reload the app afterwards.
 */
export async function restoreSnapshot(db: SQLiteDatabase, date: DateKey) {
  setState({ running: true });
  const download = new File(Paths.cache, 'backup-restore.db');
  try {
    const userId = await requireUserId();
    await downloadFromBucket(`${userId}/${SNAPSHOT_DIR}/${date}.db`, download);
    const source = await deserializeDatabaseAsync(await download.bytes());
    try {
      await assertRestorable(source);
      // Without the photo the profile just shows its placeholder, which is no reason to stop.
      await restoreProfilePhoto(source, userId).catch(console.warn);
      await backupDatabaseAsync({ sourceDatabase: source, destDatabase: db });
    } finally {
      await source.closeAsync();
    }
    setDirty(false);
    Storage.setItemSync(LINKED_KEY, 'true');
    setState({ linked: true, lastError: null });
  } finally {
    if (download.exists) download.delete();
    setState({ running: false });
  }
}
