import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { showAlert } from '../lib/alert';
import { supabase } from '../lib/supabase';
import { Message, Profile } from '../types';

const POLL_MS = 4000;

export function ChatScreen({
  profileId,
  friend,
  onBack,
}: {
  profileId: string;
  friend: Profile;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const lastCreatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${profileId},recipient_id.eq.${friend.id}),and(sender_id.eq.${friend.id},recipient_id.eq.${profileId})`
        )
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        const rows = data as Message[];
        setMessages(rows);
        if (rows.length > 0) lastCreatedAtRef.current = rows[rows.length - 1].created_at;
      }
      setLoading(false);
    }

    async function poll() {
      if (!lastCreatedAtRef.current) return;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${profileId},recipient_id.eq.${friend.id}),and(sender_id.eq.${friend.id},recipient_id.eq.${profileId})`
        )
        .gt('created_at', lastCreatedAtRef.current)
        .order('created_at', { ascending: true });
      if (cancelled || error || !data || data.length === 0) return;
      const newRows = data as Message[];
      lastCreatedAtRef.current = newRows[newRows.length - 1].created_at;
      setMessages((prev) => [...prev, ...newRows]);
    }

    loadInitial();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profileId, friend.id]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: profileId, recipient_id: friend.id, body })
      .select('*')
      .single();
    setSending(false);
    if (error || !data) {
      showAlert('Something went wrong', error?.message);
      return;
    }
    const row = data as Message;
    setMessages((prev) => [...prev, row]);
    lastCreatedAtRef.current = row.created_at;
    setDraft('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PrimaryButton label="← Back to friends" onPress={onBack} variant="secondary" />
        <Text style={styles.title}>{friend.display_name}</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      )}

      {!loading && (
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={{ padding: 12 }}
          data={messages}
          keyExtractor={(m) => m.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>
              No messages yet — say hi!
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === profileId;
            return (
              <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.body}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message..."
          multiline
        />
        <PrimaryButton label={sending ? '...' : 'Send'} onPress={send} disabled={sending || !draft.trim()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  list: { flex: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleMine: { backgroundColor: '#2a6df4' },
  bubbleTheirs: { backgroundColor: '#eee' },
  bubbleTextMine: { color: '#fff', fontSize: 15 },
  bubbleTextTheirs: { color: '#222', fontSize: 15 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    maxHeight: 100,
  },
});
