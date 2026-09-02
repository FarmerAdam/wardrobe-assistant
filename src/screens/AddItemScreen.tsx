import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ItemFormFields, ItemFormValues } from '../components/ItemFormFields';
import { showAlert } from '../lib/alert';
import { captureFromCamera, pickFromLibrary } from '../lib/photoInput';
import { uploadPhoto } from '../lib/photoUpload';
import { supabase } from '../lib/supabase';

const DEFAULT_VALUES: ItemFormValues = {
  category: 'top',
  primaryColor: '',
  pattern: 'solid',
  formality: 2,
  warmth: 2,
  moodTags: '',
};

export function AddItemScreen({ profileId, onSaved }: { profileId: string; onSaved: () => void }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [values, setValues] = useState<ItemFormValues>(DEFAULT_VALUES);
  const [saving, setSaving] = useState(false);

  function patchValues(patch: Partial<ItemFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function takePhoto() {
    const uri = await captureFromCamera();
    if (uri) setPhotoUri(uri);
  }

  async function chooseFromLibrary() {
    const uri = await pickFromLibrary();
    if (uri) setPhotoUri(uri);
  }

  async function save() {
    if (!photoUri) {
      showAlert('Add a photo first');
      return;
    }
    if (!values.primaryColor.trim()) {
      showAlert('Add a primary color');
      return;
    }

    setSaving(true);
    try {
      const publicUrl = await uploadPhoto(profileId, photoUri);

      const { error: insertError } = await supabase.from('items').insert({
        profile_id: profileId,
        photo_url: publicUrl,
        category: values.category,
        primary_color: values.primaryColor.trim().toLowerCase(),
        pattern: values.pattern,
        formality: values.formality,
        warmth: values.warmth,
        mood_tags: values.moodTags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
      if (insertError) throw insertError;

      setPhotoUri(null);
      setValues(DEFAULT_VALUES);
      onSaved();
      showAlert('Saved!', 'Item added to the closet.');
    } catch (err: any) {
      const message = err.message ?? String(err);
      if (message === 'Failed to fetch') {
        showAlert('Connection dropped', 'The upload didn’t make it through — check your signal/WiFi and try again.');
      } else {
        showAlert('Something went wrong', message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Add an item</Text>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <View style={[styles.preview, styles.placeholder]}>
          <Text style={{ color: '#888' }}>No photo yet</Text>
        </View>
      )}
      <PrimaryButton label="Take photo" onPress={takePhoto} />
      <PrimaryButton label="Choose from library" onPress={chooseFromLibrary} />

      <ItemFormFields values={values} onChange={patchValues} />

      <PrimaryButton label={saving ? 'Saving...' : 'Save item'} onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  preview: { width: '100%', height: 260, borderRadius: 12, marginBottom: 12, backgroundColor: '#f2f2f2' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
