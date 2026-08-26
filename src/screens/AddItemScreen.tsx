import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChoiceRow } from '../components/ChoiceRow';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { PrimaryButton } from '../components/PrimaryButton';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
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
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access to photograph an item.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function save() {
    if (!photoUri) {
      Alert.alert('Add a photo first');
      return;
    }
    if (!primaryColor.trim()) {
      Alert.alert('Add a primary color');
      return;
    }

    setSaving(true);
    try {
      const fileExt = photoUri.split('.').pop() ?? 'jpg';
      const filePath = `${profileId}/${Date.now()}.${fileExt}`;
      const response = await fetch(photoUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('item-photos')
        .upload(filePath, arrayBuffer, { contentType: `image/${fileExt}` });
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
      Alert.alert('Saved!', 'Item added to the closet.');
    } catch (err: any) {
      Alert.alert('Something went wrong', err.message ?? String(err));
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
