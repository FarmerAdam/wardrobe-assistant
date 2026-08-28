import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { MOODS } from '../data/moodRules';
import { suggestOutfits } from '../lib/matchOutfit';
import { supabase } from '../lib/supabase';
import { Item, Outfit, StyleProfile } from '../types';

export function MoodScreen({ profileId, styleProfile }: { profileId: string; styleProfile: StyleProfile }) {
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  async function pickMood(moodKey: string) {
    setSelectedMood(moodKey);
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*').eq('profile_id', profileId);
    setLoading(false);
    if (error || !data) return;
    setOutfits(suggestOutfits(data as Item[], moodKey, styleProfile, 3));
  }

  if (!selectedMood) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>What's your mood today?</Text>
        <View style={styles.moodGrid}>
          {MOODS.map((m) => (
            <View key={m.key} style={styles.moodItem}>
              <PrimaryButton label={`${m.emoji} ${m.label}`} onPress={() => pickMood(m.key)} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <PrimaryButton label="← Pick a different mood" onPress={() => setSelectedMood(null)} />
      {loading && <Text>Finding outfits...</Text>}
      {!loading && outfits && outfits.length === 0 && (
        <Text style={{ color: '#888', marginTop: 12 }}>
          Not enough items in the closet yet to build an outfit for this mood — add a few more tops, bottoms and
          shoes.
        </Text>
      )}
      {!loading &&
        outfits?.map((outfit, i) => (
          <View key={i} style={styles.outfitCard}>
            <Text style={styles.outfitTitle}>Option {i + 1}</Text>
            <View style={styles.outfitRow}>
              {Object.entries(outfit).map(([slot, item]) =>
                item ? (
                  <View key={slot} style={styles.outfitItem}>
                    <Image source={{ uri: item.photo_url }} style={styles.outfitImage} />
                    {/* Label by the item's real category, not its outfit slot --
                        a jumper filling the "top" slot should still say "jumper". */}
                    <Text style={styles.outfitCaption}>{item.category}</Text>
                  </View>
                ) : null
              )}
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  moodGrid: { width: '100%' },
  moodItem: { width: '100%' },
  outfitCard: { marginBottom: 20, padding: 12, borderRadius: 12, backgroundColor: '#f8f8f8' },
  outfitTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  outfitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outfitItem: { width: 90 },
  outfitImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee' },
  outfitCaption: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
});
