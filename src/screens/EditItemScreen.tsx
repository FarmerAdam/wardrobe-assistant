import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ItemFormFields, ItemFormValues } from '../components/ItemFormFields';
import { showAlert, showConfirm } from '../lib/alert';
import { captureFromCamera, pickFromLibrary } from '../lib/photoInput';
import { uploadPhoto } from '../lib/photoUpload';
import { supabase } from '../lib/supabase';
import { Item } from '../types';

export function EditItemScreen({
  item,
  profileId,
  onDone,
  onCancel,
}: {
  item: Item;
  profileId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [values, setValues] = useState<ItemFormValues>({
    category: item.category,
    primaryColor: item.primary_color,
    pattern: item.pattern,
    formality: item.formality,
    warmth: item.warmth,
    moodTags: item.mood_tags.join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function patchValues(patch: Partial<ItemFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function retakePhoto() {
    const uri = await captureFromCamera();
    if (uri) setPhotoUri(uri);
  }

  async function chooseFromLibrary() {
    const uri = await pickFromLibrary();
    if (uri) setPhotoUri(uri);
  }

  async function save() {
    if (!values.primaryColor.trim()) {
      showAlert('Add a primary color');
      return;
    }

    setSaving(true);
    try {
      const photoUrl = photoUri ? await uploadPhoto(profileId, photoUri) : item.photo_url;

      const { error: updateError } = await supabase
        .from('items')
        .update({
          photo_url: photoUrl,
          category: values.category,
          primary_color: values.primaryColor.trim().toLowerCase(),
          pattern: values.pattern,
          formality: values.formality,
          warmth: values.warmth,
          mood_tags: values.moodTags
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
        })
        .eq('id', item.id);
      if (updateError) throw updateError;

      onDone();
      showAlert('Saved!', 'Item updated.');
    } catch (err: any) {
      const message = err.message ?? String(err);
      if (message === 'Failed to fetch') {
        showAlert('Connection dropped', 'The update didn’t make it through — check your signal/WiFi and try again.');
      } else {
        showAlert('Something went wrong', message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    const confirmed = await showConfirm(
      'Delete this item?',
      'This removes it from the closet for good.',
      'Delete'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('items').delete().eq('id', item.id);
      if (error) throw error;
      onDone();
    } catch (err: any) {
      showAlert('Something went wrong', err.message ?? String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Edit item</Text>

      <Image source={{ uri: photoUri ?? item.photo_url }} style={styles.preview} />
      <PrimaryButton label="Retake photo" onPress={retakePhoto} />
      <PrimaryButton label="Choose from library" onPress={chooseFromLibrary} />

      <ItemFormFields values={values} onChange={patchValues} />

      <PrimaryButton label={saving ? 'Saving...' : 'Save changes'} onPress={save} disabled={saving || deleting} />
      <PrimaryButton label="Cancel" onPress={onCancel} disabled={saving || deleting} variant="secondary" />
      <PrimaryButton
        label={deleting ? 'Deleting...' : 'Delete item'}
        onPress={deleteItem}
        disabled={saving || deleting}
        variant="danger"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  preview: { width: '100%', height: 260, borderRadius: 12, marginBottom: 12, backgroundColor: '#f2f2f2' },
});
