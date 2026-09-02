import { resizeForUpload } from './photoUpload';

/**
 * Web photo input. Expo's launchCameraAsync is unreliable in browsers
 * (it hangs on desktop and is inconsistent on mobile), so instead we
 * drive a hidden <input type="file"> directly:
 *
 *  - camera=true adds capture="environment", which opens the camera on
 *    a phone browser and falls back to the normal file dialog on desktop
 *    (where there's no camera flow worth having anyway).
 *  - camera=false is a plain file picker.
 *
 * Either way the "Take photo" button now always leads somewhere.
 */
function openFilePicker(camera: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (camera) input.setAttribute('capture', 'environment');
    input.style.display = 'none';

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return finish(null);
      const objectUrl = URL.createObjectURL(file);
      try {
        finish(await resizeForUpload(objectUrl));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    });
    // Supported in current Chrome/Safari/Firefox; fires when the user
    // dismisses the picker without choosing a file.
    input.addEventListener('cancel', () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
}

export async function captureFromCamera(): Promise<string | null> {
  return openFilePicker(true);
}

export async function pickFromLibrary(): Promise<string | null> {
  return openFilePicker(false);
}
