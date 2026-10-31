import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * Picked photos are copied into the app's document directory because picker URIs point at
 * a cache the OS may clear. Only the file name is stored in the DB: the absolute container
 * path on iOS can change between app updates.
 */
const photoDir = new Directory(Paths.document, 'profile');

/** A photo's file, creating the directory if needed so the file can be written to. */
export function profilePhotoFile(fileName: string) {
  photoDir.create({ intermediates: true, idempotent: true });
  return new File(photoDir, fileName);
}

export function profilePhotoUri(fileName: string | null) {
  if (!fileName) return null;
  const file = new File(photoDir, fileName);
  return file.exists ? file.uri : null;
}

/** Opens the photo library and returns the new file name, or null if cancelled. */
export async function pickProfilePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;

  const source = new File(result.assets[0].uri);
  const extension = source.extension || '.jpg';
  // A unique name per pick, so expo-image doesn't show a cached copy of the old photo.
  const fileName = `avatar-${Date.now()}${extension}`;

  photoDir.create({ intermediates: true, idempotent: true });
  await source.copy(new File(photoDir, fileName));
  return fileName;
}

export function deleteProfilePhoto(fileName: string | null) {
  if (!fileName) return;
  const file = new File(photoDir, fileName);
  if (file.exists) file.delete();
}
