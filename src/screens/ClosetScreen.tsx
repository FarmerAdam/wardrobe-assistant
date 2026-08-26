import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Item } from '../types';

export function ClosetScreen({ profileId, refreshKey }: { profileId: string; refreshKey: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('items')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setItems(data as Item[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, refreshKey]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading closet...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#888' }}>No items yet — add your first one!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={{ padding: 8 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.photo_url }} style={styles.image} />
          <Text style={styles.caption}>
            {item.category} · {item.primary_color}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { flex: 1, margin: 8 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#f2f2f2' },
  caption: { marginTop: 4, fontSize: 12, color: '#555' },
});
