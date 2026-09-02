import * as ImagePicker from 'expo-image-picker';
import { showAlert } from './alert';
import { resizeForUpload } from './photoUpload';

/**
 * Native (iOS/Android) photo capture. The web build resolves to
 * photoInput.web.ts instead, which uses a plain file input so the
 * "Take photo" button actually does something in a browser.
 */
export async function captureFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    showAlert('Camera permission needed', 'Enable camera access to photograph an item.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
  if (result.canceled) return null;
  return resizeForUpload(result.assets[0].uri);
}

export async function pickFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    showAlert('Photo access needed', 'Enable photo library access to choose an item photo.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });
  if (result.canceled) return null;
  return resizeForUpload(result.assets[0].uri);
}
