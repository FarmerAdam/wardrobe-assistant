import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChoiceRow } from '../components/ChoiceRow';
import { showAlert } from '../lib/alert';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { PrimaryButton } from '../components/PrimaryButton';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'jumper', label: 'Jumper' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'dress', label: 'Dress' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'accessory', label: 'Accessory' },
];

export function AddItemScreen({ profileId, onSaved }: { profileId: string; onSaved: () => void }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('top');
  const [primaryColor, setPrimaryColor] = useState('');
  const [pattern, setPattern] = useState('solid');
  const [formality, setFormality] = useState(2);
  const [warmth, setWarmth] = useState(2);
  const [moodTags, setMoodTags] = useState('');
  const [saving, setSaving] = useState(false);

  async function takePhoto() {
    // requestCameraPermissionsAsync is a no-op on web (the browser owns camera
    // permission, not the OS), so calling it there just wastes the user gesture
    // that launchCameraAsync needs to be called within on mobile browsers.
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert('Camera permission needed', 'Enable camera access to photograph an item.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function pickFromLibrary() {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('Photo access needed', 'Enable photo library access to choose an item photo.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function save() {
    if (!photoUri) {
      showAlert('Add a photo first');
      return;
    }
    if (!primaryColor.trim()) {
      showAlert('Add a primary color');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      // On web, photoUri is a blob: or data: URI with no real file extension,
      // so derive the content type from the fetched blob itself rather than
      // parsing the URI (which used to produce garbage like "image/io/1234").
      const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
      const fileExt = contentType.split('/')[1] || 'jpeg';
      const filePath = `${profileId}/${Date.now()}.${fileExt}`;
      const arrayBuffer = await blob.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('item-photos')
        .upload(filePath, arrayBuffer, { contentType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('item-photos').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('items').insert({
        profile_id: profileId,
        photo_url: publicUrlData.publicUrl,
        category,
        primary_color: primaryColor.trim().toLowerCase(),
        pattern,
        formality,
        warmth,
        mood_tags: moodTags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
      if (insertError) throw insertError;

      setPhotoUri(null);
      setPrimaryColor('');
      setMoodTags('');
      onSaved();
      showAlert('Saved!', 'Item added to the closet.');
    } catch (err: any) {
      showAlert('Something went wrong', err.message ?? String(err));
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
      <PrimaryButton label="Choose from library" onPress={pickFromLibrary} />

      <ChoiceRow label="Category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />

      <Text style={styles.label}>Primary color</Text>
      <TextInput
        style={styles.input}
        value={primaryColor}
        onChangeText={setPrimaryColor}
        placeholder="e.g. black, olive, navy"
      />

      <ChoiceRow
        label="Pattern"
        options={[
          { value: 'solid', label: 'Solid' },
          { value: 'striped', label: 'Striped' },
          { value: 'floral', label: 'Floral' },
          { value: 'plaid', label: 'Plaid' },
          { value: 'graphic', label: 'Graphic' },
          { value: 'other', label: 'Other' },
        ]}
        value={pattern}
        onChange={setPattern}
      />

      <ChoiceRow
        label="Formality (1 = very casual, 5 = very dressy)"
        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        value={formality}
        onChange={setFormality}
      />

      <ChoiceRow
        label="Warmth"
        options={[
          { value: 1, label: 'Light' },
          { value: 2, label: 'Medium' },
          { value: 3, label: 'Heavy' },
        ]}
        value={warmth}
        onChange={setWarmth}
      />

      <Text style={styles.label}>Mood tags (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={moodTags}
        onChangeText={setMoodTags}
        placeholder="e.g. cozy, confident"
      />

      <PrimaryButton label={saving ? 'Saving...' : 'Save item'} onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  preview: { width: '100%', height: 260, borderRadius: 12, marginBottom: 12, backgroundColor: '#f2f2f2' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 15,
  },
});
