import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { REACTION_EMOJI } from '../data/reactionEmoji';
import { showAlert } from '../lib/alert';
import { supabase } from '../lib/supabase';
import { FriendRequest, Item, OutfitReaction, Profile, SavedOutfit } from '../types';
import { ChatScreen } from './ChatScreen';

type PersonRow = { profile: Profile; requestId: string };

export function FriendsScreen({ profileId }: { profileId: string }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [peopleById, setPeopleById] = useState<Record<string, Profile>>({});
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [messagingFriend, setMessagingFriend] = useState<Profile | null>(null);

  const [viewingFriend, setViewingFriend] = useState<Profile | null>(null);
  const [friendOutfits, setFriendOutfits] = useState<SavedOutfit[]>([]);
  const [friendItemsById, setFriendItemsById] = useState<Record<string, Item>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string>>({}); // outfit_id -> emoji
  const [loadingOutfits, setLoadingOutfits] = useState(false);

  const [myOutfits, setMyOutfits] = useState<SavedOutfit[]>([]);
  const [myItemsById, setMyItemsById] = useState<Record<string, Item>>({});
  const [reactionsByOutfit, setReactionsByOutfit] = useState<Record<string, { emoji: string; name: string }[]>>({});
  const [loadingMyOutfits, setLoadingMyOutfits] = useState(true);

  useEffect(() => {
    loadRequests();
    loadMyOutfits();
  }, [profileId]);

  async function loadMyOutfits() {
    setLoadingMyOutfits(true);
    const { data: outfits, error } = await supabase.from('outfits').select('*').eq('profile_id', profileId);
    if (error || !outfits) {
      setLoadingMyOutfits(false);
      return;
    }
    const rows = outfits as SavedOutfit[];
    setMyOutfits(rows);

    const allItemIds = Array.from(new Set(rows.flatMap((o) => o.item_ids)));
    if (allItemIds.length > 0) {
      const { data: items } = await supabase.from('items').select('*').in('id', allItemIds);
      const itemMap: Record<string, Item> = {};
      (items as Item[] | null)?.forEach((item) => (itemMap[item.id] = item));
      setMyItemsById(itemMap);
    } else {
      setMyItemsById({});
    }

    const outfitIds = rows.map((o) => o.id);
    if (outfitIds.length > 0) {
      const { data: reactions } = await supabase.from('outfit_reactions').select('*').in('outfit_id', outfitIds);
      const reactorIds = Array.from(new Set((reactions as OutfitReaction[] | null)?.map((r) => r.profile_id) ?? []));
      let namesById: Record<string, string> = {};
      if (reactorIds.length > 0) {
        const { data: reactors } = await supabase.from('profiles').select('id, display_name').in('id', reactorIds);
        (reactors ?? []).forEach((p: any) => (namesById[p.id] = p.display_name));
      }
      const grouped: Record<string, { emoji: string; name: string }[]> = {};
      (reactions as OutfitReaction[] | null)?.forEach((r) => {
        if (!grouped[r.outfit_id]) grouped[r.outfit_id] = [];
        grouped[r.outfit_id].push({ emoji: r.emoji, name: namesById[r.profile_id] ?? 'Someone' });
      });
      setReactionsByOutfit(grouped);
    } else {
      setReactionsByOutfit({});
    }
    setLoadingMyOutfits(false);
  }

  async function loadRequests() {
    setLoadingRequests(true);
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);
    if (error || !data) {
      setLoadingRequests(false);
      return;
    }
    const rows = data as FriendRequest[];
    setRequests(rows);

    const otherIds = Array.from(
      new Set(rows.map((r) => (r.requester_id === profileId ? r.addressee_id : r.requester_id)))
    );
    if (otherIds.length > 0) {
      const { data: people } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, style_profile')
        .in('id', otherIds);
      const map: Record<string, Profile> = {};
      (people ?? []).forEach((p: any) => {
        map[p.id] = {
          id: p.id,
          user_id: p.user_id ?? null,
          username: p.username ?? null,
          display_name: p.display_name,
          avatar_url: p.avatar_url ?? null,
          style_profile: p.style_profile ?? null,
        };
      });
      setPeopleById(map);
    }
    setLoadingRequests(false);
  }

  async function search() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, avatar_url, style_profile')
      .ilike('username', `%${q}%`)
      .neq('id', profileId)
      .limit(10);
    setSearching(false);
    if (error) {
      showAlert('Something went wrong', error.message);
      return;
    }
    setResults((data as Profile[]) ?? []);
  }

  async function sendRequest(addresseeId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .insert({ requester_id: profileId, addressee_id: addresseeId });
    if (error) {
      if (error.code === '23505') {
        showAlert("You've already sent a request to this person.");
      } else {
        showAlert('Something went wrong', error.message);
      }
      return;
    }
    showAlert('Friend request sent!');
    loadRequests();
  }

  async function acceptRequest(requestId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) showAlert('Something went wrong', error.message);
    else loadRequests();
  }

  async function removeRequest(requestId: string) {
    const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
    if (error) showAlert('Something went wrong', error.message);
    else loadRequests();
  }

  async function openFriend(friend: Profile) {
    setViewingFriend(friend);
    setLoadingOutfits(true);
    const { data: outfits, error } = await supabase.from('outfits').select('*').eq('profile_id', friend.id);
    if (error || !outfits) {
      setLoadingOutfits(false);
      showAlert('Something went wrong', error?.message);
      return;
    }
    const rows = outfits as SavedOutfit[];
    setFriendOutfits(rows);

    const allItemIds = Array.from(new Set(rows.flatMap((o) => o.item_ids)));
    if (allItemIds.length > 0) {
      const { data: items } = await supabase.from('items').select('*').in('id', allItemIds);
      const map: Record<string, Item> = {};
      (items as Item[] | null)?.forEach((item) => (map[item.id] = item));
      setFriendItemsById(map);
    } else {
      setFriendItemsById({});
    }

    const outfitIds = rows.map((o) => o.id);
    if (outfitIds.length > 0) {
      const { data: reactions } = await supabase
        .from('outfit_reactions')
        .select('*')
        .eq('profile_id', profileId)
        .in('outfit_id', outfitIds);
      const map: Record<string, string> = {};
      (reactions as OutfitReaction[] | null)?.forEach((r) => (map[r.outfit_id] = r.emoji));
      setMyReactions(map);
    } else {
      setMyReactions({});
    }
    setLoadingOutfits(false);
  }

  async function react(outfitId: string, emoji: string) {
    const { error } = await supabase
      .from('outfit_reactions')
      .upsert({ outfit_id: outfitId, profile_id: profileId, emoji }, { onConflict: 'outfit_id,profile_id' });
    if (error) {
      showAlert('Something went wrong', error.message);
      return;
    }
    setMyReactions((prev) => ({ ...prev, [outfitId]: emoji }));
  }

  const incoming = requests.filter((r) => r.addressee_id === profileId && r.status === 'pending');
  const outgoing = requests.filter((r) => r.requester_id === profileId && r.status === 'pending');
  const friends: PersonRow[] = requests
    .filter((r) => r.status === 'accepted')
    .map((r) => ({
      requestId: r.id,
      profile: peopleById[r.requester_id === profileId ? r.addressee_id : r.requester_id],
    }))
    .filter((p) => p.profile);

  if (messagingFriend) {
    return <ChatScreen profileId={profileId} friend={messagingFriend} onBack={() => setMessagingFriend(null)} />;
  }

  if (viewingFriend) {
    return (
      <View style={styles.container}>
        <PrimaryButton label="← Back to friends" onPress={() => setViewingFriend(null)} variant="secondary" />
        <Text style={styles.title}>{viewingFriend.display_name}'s outfits</Text>

        {loadingOutfits && <Text>Loading...</Text>}
        {!loadingOutfits && friendOutfits.length === 0 && (
          <Text style={{ color: '#888', marginTop: 12 }}>No saved outfits yet.</Text>
        )}
        <ScrollView>
          {friendOutfits.map((outfit) => (
            <View key={outfit.id} style={styles.outfitCard}>
              <Text style={styles.outfitMood}>{outfit.mood}</Text>
              <View style={styles.outfitItemsGrid}>
                {outfit.item_ids.map((itemId) => {
                  const item = friendItemsById[itemId];
                  if (!item) return null;
                  return (
                    <View key={itemId} style={styles.outfitItem}>
                      <Image source={{ uri: item.photo_url }} style={styles.outfitImage} />
                      <Text style={styles.outfitCaption}>{item.category}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.reactionRow}>
                {REACTION_EMOJI.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={[styles.reactionButton, myReactions[outfit.id] === emoji && styles.reactionButtonActive]}
                    onPress={() => react(outfit.id, emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Friends</Text>

      <Text style={styles.sectionLabel}>My saved outfits</Text>
      {loadingMyOutfits && <Text>Loading...</Text>}
      {!loadingMyOutfits && myOutfits.length === 0 && (
        <Text style={{ color: '#888' }}>
          No saved outfits yet — save one from the Mood tab so friends can react to it.
        </Text>
      )}
      {myOutfits.map((outfit) => (
        <View key={outfit.id} style={styles.outfitCard}>
          <Text style={styles.outfitMood}>{outfit.mood}</Text>
          <View style={styles.outfitItemsGrid}>
            {outfit.item_ids.map((itemId) => {
              const item = myItemsById[itemId];
              if (!item) return null;
              return (
                <View key={itemId} style={styles.outfitItem}>
                  <Image source={{ uri: item.photo_url }} style={styles.outfitImage} />
                  <Text style={styles.outfitCaption}>{item.category}</Text>
                </View>
              );
            })}
          </View>
          {(reactionsByOutfit[outfit.id]?.length ?? 0) > 0 ? (
            <View style={styles.reactionRow}>
              {reactionsByOutfit[outfit.id].map((r, i) => (
                <View key={i} style={styles.reactionBadge}>
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text style={styles.reactionName}>{r.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noReactionsYet}>No reactions yet.</Text>
          )}
        </View>
      ))}

      <Text style={styles.sectionLabel}>Find a friend</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="search by username"
      />
      <PrimaryButton label={searching ? 'Searching...' : 'Search'} onPress={search} disabled={searching} />
      {results.map((r) => (
        <View key={r.id} style={styles.personRow}>
          <View>
            <Text style={styles.personName}>{r.display_name}</Text>
            <Text style={styles.personHandle}>@{r.username}</Text>
          </View>
          <PrimaryButton label="Add Friend" onPress={() => sendRequest(r.id)} variant="secondary" />
        </View>
      ))}

      {!loadingRequests && incoming.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Friend requests</Text>
          {incoming.map((req) => (
            <View key={req.id} style={styles.personRow}>
              <Text style={styles.personName}>{peopleById[req.requester_id]?.display_name ?? '...'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PrimaryButton label="Accept" onPress={() => acceptRequest(req.id)} />
                <PrimaryButton label="Ignore" onPress={() => removeRequest(req.id)} variant="secondary" />
              </View>
            </View>
          ))}
        </>
      )}

      {!loadingRequests && outgoing.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Sent requests</Text>
          {outgoing.map((req) => (
            <View key={req.id} style={styles.personRow}>
              <Text style={styles.personName}>{peopleById[req.addressee_id]?.display_name ?? '...'} (pending)</Text>
              <PrimaryButton label="Cancel" onPress={() => removeRequest(req.id)} variant="danger" />
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>My friends</Text>
      {!loadingRequests && friends.length === 0 && (
        <Text style={{ color: '#888' }}>No friends yet — search a username above to add one.</Text>
      )}
      {friends.map(({ profile, requestId }) => (
        <View key={requestId} style={styles.personRow}>
          <Pressable onPress={() => openFriend(profile)}>
            <Text style={styles.personName}>{profile.display_name}</Text>
            <Text style={styles.personHandle}>@{profile.username}</Text>
          </Pressable>
          <PrimaryButton label="Message" onPress={() => setMessagingFriend(profile)} variant="secondary" />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 8 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  personName: { fontSize: 15, fontWeight: '600', color: '#222' },
  personHandle: { fontSize: 12, color: '#999' },
  outfitCard: { padding: 12, borderRadius: 12, backgroundColor: '#f8f8f8', marginTop: 12 },
  outfitMood: { fontSize: 14, fontWeight: '700', marginBottom: 8, textTransform: 'capitalize' },
  outfitItemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outfitItem: { width: 90 },
  outfitImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee' },
  outfitCaption: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  reactionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reactionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  reactionButtonActive: { backgroundColor: '#cdeccd' },
  reactionEmoji: { fontSize: 18 },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  reactionName: { fontSize: 12, color: '#555', fontWeight: '600' },
  noReactionsYet: { fontSize: 12, color: '#aaa', marginTop: 10 },
});
