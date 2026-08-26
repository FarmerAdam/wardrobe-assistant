import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { supabase } from '../lib/supabase';
import { StyleProfile } from '../types';

const STYLE_OPTIONS = ['minimalist', 'streetwear', 'preppy', 'boho', 'sporty', 'grunge', 'classic', 'colorful'];

export function StyleSetupScreen({
  profileId,
  onDone,
}: {
  profileId: string;
  onDone: (profile: StyleProfile) => void;
}) {
  const [styles_, setStyles] = useState<string[]>([]);
  const [favoriteColors, setFavoriteColors] = useState('');
  const [avoid, setAvoid] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleStyle(s: string) {
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function save() {
    setSaving(true);
    const styleProfile: StyleProfile = {
      styles: styles_,
      favorite_colors: favoriteColors
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
      avoid: avoid
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
    };
    await supabase.from('profiles').update({ style_profile: styleProfile }).eq('id', profileId);
    setSaving(false);
    onDone(styleProfile);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Let's set up your style</Text>
      <Text style={styles.subtitle}>This tunes every outfit suggestion — answer honestly, not aspirationally.</Text>

      <Text style={styles.label}>Which styles feel like you? (pick any)</Text>
      <View style={styles.chipRow}>
        {STYLE_OPTIONS.map((s) => {
          const selected = styles_.includes(s);
          return (
            <Text
              key={s}
              onPress={() => toggleStyle(s)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              {s}
            </Text>
          );
        })}
      </View>

      <Text style={styles.label}>Favorite colors (comma separated)</Text>
      <TextInput style={styles.input} value={favoriteColors} onChangeText={setFavoriteColors} placeholder="e.g. black, olive, cream" />

      <Text style={styles.label}>Colors or patterns you avoid</Text>
      <TextInput style={styles.input} value={avoid} onChangeText={setAvoid} placeholder="e.g. neon, floral" />

      <PrimaryButton label={saving ? 'Saving...' : "Done, let's go"} onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8, color: '#333' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#eee',
    color: '#333',
    fontSize: 13,
    overflow: 'hidden',
  },
  chipSelected: { backgroundColor: '#333', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15 },
});
