import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MannequinOutfit } from '../components/MannequinOutfit';
import { PrimaryButton } from '../components/PrimaryButton';
import { MOODS } from '../data/moodRules';
import { Weather, WEATHERS } from '../data/weatherRules';
import { suggestOutfits } from '../lib/matchOutfit';
import { supabase } from '../lib/supabase';
import { Item, Outfit, StyleProfile } from '../types';

export function MoodScreen({ profileId, styleProfile }: { profileId: string; styleProfile: StyleProfile }) {
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState<Weather | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  async function pickMood(moodKey: string) {
    if (!selectedWeather) return;
    setSelectedMood(moodKey);
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*').eq('profile_id', profileId);
    setLoading(false);
    if (error || !data) return;
    setOutfits(suggestOutfits(data as Item[], moodKey, selectedWeather, styleProfile, 3));
  }

  if (!selectedWeather) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>What's the weather?</Text>
        <View style={styles.weatherGrid}>
          {WEATHERS.map((w) => (
            <Pressable
              key={w.key}
              style={[styles.weatherButton, { backgroundColor: w.backgroundColor }]}
              onPress={() => setSelectedWeather(w.key)}
            >
              <Text style={[styles.weatherLabel, { color: w.textColor }]}>{w.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (!selectedMood) {
    return (
      <View style={styles.center}>
        <PrimaryButton label="← Change weather" onPress={() => setSelectedWeather(null)} variant="secondary" />
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
      <PrimaryButton label="← Pick a different mood" onPress={() => setSelectedMood(null)} variant="secondary" />
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
            <MannequinOutfit outfit={outfit} poseIndex={i} />
            <Text style={styles.outfitList}>
              {Object.values(outfit)
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .map((item) => item.category)
                .join(' · ')}
            </Text>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  weatherGrid: { width: '100%', gap: 12 },
  weatherButton: {
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  weatherLabel: { fontSize: 18, fontWeight: '800' },
  moodGrid: { width: '100%' },
  moodItem: { width: '100%' },
  outfitCard: { marginBottom: 20, padding: 12, borderRadius: 12, backgroundColor: '#f8f8f8' },
  outfitTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  outfitList: { fontSize: 12, color: '#666', marginTop: 10, textAlign: 'center', textTransform: 'capitalize' },
});
