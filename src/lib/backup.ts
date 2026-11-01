/**
 * Snapshot backups: SQLite stays the app's only live database, and a copy of the whole file goes
 * to a private Supabase Storage bucket, one per day for the last week, in a folder only that user
 * can reach (see `supabase/setup.sql`). Each app variant has its own bucket, picked by the
 * installed app's ID rather than `APP_VARIANT`, so how the dev server was started can't send it to
 * the wrong one.
 *
 * A device only backs up once it's linked, which the login screen does right after sign-in by
 * restoring the latest backup or, if there's none or the user keeps the phone's data, linking it
 * as is. Without that, a fresh install could replace a good snapshot with an empty database.
 */
import * as Application from 'expo-application';
import { File, Paths } from 'expo-file-system';
import { backupDatabaseAsync, deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { getProfile } from '@/db/profile';
import { resetAllData } from '@/db/reset';
import { SCHEMA_VERSION } from '@/db/schema';
import { fromDateKey, todayKey, type DateKey } from '@/lib/dates';
import { deleteProfilePhoto, profilePhotoFile } from '@/lib/profile-photo';
import { supabase } from '@/lib/supabase';

/**
 * Days of snapshots kept. The app only ever restores the latest; the older ones are a safety net
 * for a bad change that got backed up, recoverable by hand from the Supabase dashboard.
 */
export const SNAPSHOTS_TO_KEEP = 7;

const SNAPSHOT_DIR = 'snapshots';
const PHOTO_DIR = 'photos';
const SNAPSHOT_NAME = /^(\d{4}-\d{2}-\d{2})\.db$/;

const LINKED_KEY = 'backup.linked';
const DIRTY_KEY = 'backup.dirty';
const LAST_BACKUP_KEY = 'backup.lastBackupAt';
const UPLOADED_PHOTO_KEY = 'backup.uploadedPhoto';
const ERASE_PENDING_KEY = 'backup.erasePending';

const BUCKETS: Record<string, string> = {
  'com.hogos.plie': 'backups-prod',
  'com.hogos.plie.dev': 'backups-dev',
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

/**
 * Records that the database has changes the bucket doesn't, surviving an app restart. Only a linked
 * phone's changes count: before that, writes like erasing after sign-out or saving a new profile
 * have no backup to fall behind, and counting them could offer to keep an empty phone over a backup.
 */
export function markBackupDirty() {
  if (state.linked) setDirty(true);
}

/**
 * Whether this phone has changes the bucket doesn't, so a fresh install has none and can restore
 * without asking.
 */
export function hasUnsavedChanges() {
  return Storage.getItemSync(DIRTY_KEY) === 'true';
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
 * Deletes photos no kept snapshot can refer to. A snapshot refers to the newest photo uploaded
 * before it, so photos from the oldest kept day onwards stay, plus the newest one from before that
 * day. Photos without a timestamp stay too: keeping one too many is harmless.
 */
async function prunePhotos(userId: string, current: string | null) {
  const oldestKept = (await listSnapshots()).at(-1);
  if (!oldestKept) return;
  const cutoff = fromDateKey(oldestKept).getTime();

  const { data, error } = await bucket().list(`${userId}/${PHOTO_DIR}`, { limit: 1000 });
  assertOk(error);
  const before = (data ?? [])
    .map((file) => ({ name: file.name, time: Date.parse(file.updated_at ?? file.created_at ?? '') }))
    .filter(({ time }) => time < cutoff)
    .sort((a, b) => b.time - a.time);
  // The newest one before the cutoff may be what the oldest kept snapshot shows.
  const expired = before
    .slice(1)
    .map(({ name }) => name)
    .filter((name) => name !== current);
  if (expired.length === 0) return;
  const { error: removeError } = await bucket().remove(expired.map((name) => `${userId}/${PHOTO_DIR}/${name}`));
  assertOk(removeError);
}

/** Refuses to back up a damaged database, so it can't replace a good snapshot. */
async function assertHealthy(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  if (result?.integrity_check !== 'ok') {
    throw new Error("This phone's data looks damaged, so it wasn't backed up. Your last good backup is safe");
  }
}

/**
 * Photos go up before the snapshot, so a snapshot never refers to one the bucket doesn't have.
 * Returns the photo the snapshot will refer to, which is the one cleanup keeps.
 */
async function uploadProfilePhoto(db: SQLiteDatabase, userId: string) {
  const { photoFile } = await getProfile(db);
  if (!photoFile || Storage.getItemSync(UPLOADED_PHOTO_KEY) === photoFile) return photoFile;

  const file = profilePhotoFile(photoFile);
  if (!file.exists) return photoFile;
  const { error } = await bucket().upload(`${userId}/${PHOTO_DIR}/${photoFile}`, toArrayBuffer(await file.bytes()), {
    contentType: 'application/octet-stream',
    upsert: true,
  });
  assertOk(error);
  Storage.setItemSync(UPLOADED_PHOTO_KEY, photoFile);
  return photoFile;
}

async function uploadSnapshot(db: SQLiteDatabase) {
  setState({ running: true });
  let userId: string | null;
  let photoFile: string | null;
  try {
    // A paused project can fail here, when the session needs refreshing, so this must be reported.
    userId = await currentUserId();
    if (!userId) return;

    // Cleared first, so a change made during the upload counts as a new change.
    setDirty(false);
    await assertHealthy(db);
    photoFile = await uploadProfilePhoto(db, userId);
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
  // Photos after snapshots, since which photos stay depends on which snapshots did.
  await pruneSnapshots()
    .then(() => prunePhotos(userId!, photoFile))
    .catch(console.warn);
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

/**
 * Uploads a final backup and signs out, rejecting without signing out if either fails, so nothing
 * unsaved can be lost. The caller must reload the app, which then erases this phone's data. That
 * waits for the reload so no screen or backup is running while the data goes.
 */
export async function signOutAndErase(db: SQLiteDatabase) {
  // An upload in progress may have started before the latest change.
  if (inFlight) await inFlight;
  await backUp(db);
  if (state.lastError) throw new Error(state.lastError);

  const { error } = await supabase!.auth.signOut({ scope: 'local' });
  assertOk(error);
  // Saved only once signed out: erasing a phone that's still signed in would look like lost data.
  Storage.setItemSync(ERASE_PENDING_KEY, 'true');
}

/** Finishes `signOutAndErase` on the next launch, before anything reads the database. */
export async function eraseIfPending(db: SQLiteDatabase) {
  if (Storage.getItemSync(ERASE_PENDING_KEY) !== 'true') return;
  const { photoFile } = await getProfile(db);
  await resetAllData(db);
  deleteProfilePhoto(photoFile);
  setDirty(false);
  Storage.removeItemSync(ERASE_PENDING_KEY);
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
 * need migrating, so the caller must reload the app afterwards. The link is only saved, taking
 * effect on that reload, so the app doesn't open for a moment before it.
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
    setState({ lastError: null });
  } finally {
    if (download.exists) download.delete();
    setState({ running: false });
  }
}
