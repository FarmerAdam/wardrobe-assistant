import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

/**
 * Modern phone cameras produce multi-MB photos even at moderate JPEG
 * quality, which was the cause of uploads intermittently failing with a
 * generic "Failed to fetch" over patchy mobile signal. Resize down to a
 * sensible max width before it ever reaches upload.
 */
export async function resizeForUpload(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 1200 });
    const imageRef = await context.renderAsync();
    const result = await imageRef.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    // If resizing fails for any reason, fall back to the original photo
    // rather than blocking the user from saving at all.
    return uri;
  }
}

/** Uploads a local photo uri to the item-photos bucket and returns its public URL. */
export async function uploadPhoto(profileId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  // On web, uri is a blob: or data: URI with no real file extension, so
  // derive the content type from the fetched blob itself rather than
  // parsing the URI (which used to produce garbage like "image/io/1234").
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const fileExt = contentType.split('/')[1] || 'jpeg';
  const filePath = `${profileId}/${Date.now()}.${fileExt}`;
  const arrayBuffer = await blob.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('item-photos')
    .upload(filePath, arrayBuffer, { contentType });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('item-photos').getPublicUrl(filePath);
  return data.publicUrl;
}
