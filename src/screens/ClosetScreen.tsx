import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { showAlert } from '../lib/alert';
import { isRecentlyWorn } from '../lib/recentlyWorn';
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
  const [updating, setUpdating] = useState(false);

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

  async function applyUpdate(patch: Partial<Item>) {
    if (!actionItem) return;
    setUpdating(true);
    const { error } = await supabase.from('items').update(patch).eq('id', actionItem.id);
    setUpdating(false);
    if (error) {
      showAlert('Something went wrong', error.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === actionItem.id ? { ...i, ...patch } : i)));
    setActionItem(null);
  }

  const toggleLaundry = () => applyUpdate({ in_laundry: !actionItem!.in_laundry });
  const markRecentlyWorn = () =>
    applyUpdate({ last_worn_at: new Date().toISOString(), recently_worn_exception: false });
  const toggleException = () => applyUpdate({ recently_worn_exception: !actionItem!.recently_worn_exception });

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
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.photo_url }} style={[styles.image, item.in_laundry && styles.inWashImage]} />
              {isRecentlyWorn(item) && (
                <>
                  <View style={styles.wornTagString} />
                  <View style={styles.wornTag}>
                    <View style={styles.wornTagHole} />
                  </View>
                </>
              )}
            </View>
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
              label={updating ? 'Updating...' : actionItem.in_laundry ? 'I CAN WEAR THIS NOW' : 'Mark As In Wash?'}
              onPress={toggleLaundry}
              disabled={updating}
            />

            {isRecentlyWorn(actionItem) ? (
              <PrimaryButton
                label={
                  updating
                    ? 'Updating...'
                    : actionItem.recently_worn_exception
                      ? 'Remove Exception'
                      : 'Make An Exception'
                }
                onPress={toggleException}
                disabled={updating}
              />
            ) : (
              <PrimaryButton
                label={updating ? 'Updating...' : 'Mark As Recently Worn'}
                onPress={markRecentlyWorn}
                disabled={updating}
              />
            )}

            <PrimaryButton
              label="Cancel"
              onPress={() => setActionItem(null)}
              disabled={updating}
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
  imageWrap: { position: 'relative' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#f2f2f2' },
  inWashImage: { borderWidth: 4, borderColor: '#F5C518' },
  caption: { marginTop: 4, fontSize: 12, color: '#555' },
  wornTagString: {
    position: 'absolute',
    top: -8,
    right: 22,
    width: 2,
    height: 10,
    backgroundColor: '#000',
  },
  wornTag: {
    position: 'absolute',
    top: -16,
    right: 8,
    width: 24,
    height: 16,
    backgroundColor: '#000',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-20deg' }],
  },
  wornTagHole: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },
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
