import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, WEBP or GIF images are allowed.';
  }
  if (file.size > MAX_SIZE) {
    return 'Image must be smaller than 5MB.';
  }
  return null;
}

export async function uploadImage(
  file: File,
  folder: 'products' | 'services' | 'branding',
): Promise<string> {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function deleteImageByUrl(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch {
    // Non-fatal: image may already be gone or URL may be external.
  }
}
