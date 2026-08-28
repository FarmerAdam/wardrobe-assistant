import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { showAlert } from '../lib/alert';
import { supabase } from '../lib/supabase';
import { Item } from '../types';

export function ClosetScreen({
  profileId,
  refreshKey,
  onAddItem,
  onEditItem,
}: {
  profileId: string;
  refreshKey: number;
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<Item | null>(null);
  const [updatingLaundry, setUpdatingLaundry] = useState(false);

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

  async function toggleLaundry() {
    if (!actionItem) return;
    setUpdatingLaundry(true);
    const nextInLaundry = !actionItem.in_laundry;
    const { error } = await supabase.from('items').update({ in_laundry: nextInLaundry }).eq('id', actionItem.id);
    setUpdatingLaundry(false);
    if (error) {
      showAlert('Something went wrong', error.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === actionItem.id ? { ...i, in_laundry: nextInLaundry } : i)));
    setActionItem(null);
  }

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
        <Text style={{ color: '#888', marginBottom: 8 }}>No items yet — add your first one!</Text>
        <View style={{ width: 200 }}>
          <PrimaryButton label="+ Add an item" onPress={onAddItem} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onEditItem(item)} onLongPress={() => setActionItem(item)}>
            <Image source={{ uri: item.photo_url }} style={[styles.image, item.in_laundry && styles.inWashImage]} />
            <Text style={styles.caption}>
              {item.category} · {item.primary_color}
            </Text>
          </Pressable>
        )}
      />

      {actionItem && (
        <View style={styles.overlay}>
          <View style={styles.actionCard}>
            <Image source={{ uri: actionItem.photo_url }} style={styles.actionImage} />
            <Text style={styles.actionTitle}>
              {actionItem.category} · {actionItem.primary_color}
            </Text>
            <PrimaryButton
              label={
                updatingLaundry
                  ? 'Updating...'
                  : actionItem.in_laundry
                    ? 'I CAN WEAR THIS NOW'
                    : 'Mark As In Wash?'
              }
              onPress={toggleLaundry}
              disabled={updatingLaundry}
            />
            <PrimaryButton
              label="Cancel"
              onPress={() => setActionItem(null)}
              disabled={updatingLaundry}
              variant="secondary"
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { flex: 1, margin: 8 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#f2f2f2' },
  inWashImage: { borderWidth: 4, borderColor: '#F5C518' },
  caption: { marginTop: 4, fontSize: 12, color: '#555' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  actionCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  actionImage: { width: 120, height: 120, borderRadius: 10, backgroundColor: '#f2f2f2', marginBottom: 10 },
  actionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, textTransform: 'capitalize' },
});
