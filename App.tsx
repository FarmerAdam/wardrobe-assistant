import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ClosetScreen } from './src/screens/ClosetScreen';
import { EditItemScreen } from './src/screens/EditItemScreen';
import { MoodScreen } from './src/screens/MoodScreen';
import { StyleSetupScreen } from './src/screens/StyleSetupScreen';
import { getMyProfile, signOut } from './src/lib/auth';
import { showConfirm } from './src/lib/alert';
import { supabase } from './src/lib/supabase';
import { Item, Profile, StyleProfile } from './src/types';

type Tab = 'closet' | 'add' | 'mood';

const EMPTY_STYLE_PROFILE: StyleProfile = { styles: [], favorite_colors: [], avoid: [] };

function Root() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('closet');
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setProfile(await getMyProfile());
      } catch (err: any) {
        setError(err.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setTab('closet');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const confirmed = await showConfirm('Log out?', 'You can log back in with your username and password.', 'Log out');
    if (confirmed) await signOut();
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', textAlign: 'center', padding: 20 }}>
          {error}
          {'\n\n'}Check that .env has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set, and that the
          schema in supabase/schema.sql has been run.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!profile) {
    return <AuthScreen onAuthed={setProfile} />;
  }

  if (!profile.style_profile) {
    return (
      <StyleSetupScreen
        profileId={profile.id}
        onDone={(sp) => setProfile({ ...profile, style_profile: sp })}
      />
    );
  }

  const profileId = profile.id;
  const styleProfile = profile.style_profile;

  if (editingItem) {
    return (
      <View style={styles.container}>
        <EditItemScreen
          item={editingItem}
          profileId={profileId}
          onCancel={() => setEditingItem(null)}
          onDone={() => {
            setEditingItem(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (insets.top || 8) + 4 }]}>
        <Text style={styles.headerName} numberOfLines={1}>
          {profile.display_name}
          {profile.username ? <Text style={styles.headerHandle}> @{profile.username}</Text> : null}
        </Text>
        <Text style={styles.logout} onPress={handleLogout}>
          Log out
        </Text>
      </View>

      <View style={styles.screen}>
        {tab === 'closet' && (
          <ClosetScreen
            profileId={profileId}
            refreshKey={refreshKey}
            onAddItem={() => setTab('add')}
            onEditItem={setEditingItem}
          />
        )}
        {tab === 'add' && (
          <AddItemScreen
            profileId={profileId}
            onSaved={() => {
              setRefreshKey((k) => k + 1);
              setTab('closet');
            }}
          />
        )}
        {tab === 'mood' && <MoodScreen profileId={profileId} styleProfile={styleProfile ?? EMPTY_STYLE_PROFILE} />}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 12 }]}>
        <TabButton label="Closet" active={tab === 'closet'} onPress={() => setTab('closet')} />
        <TabButton label="+ Add" active={tab === 'add'} onPress={() => setTab('add')} />
        <TabButton label="Mood" active={tab === 'mood'} onPress={() => setTab('mood')} />
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#222' },
  headerHandle: { fontWeight: '500', color: '#999' },
  logout: { fontSize: 13, color: '#2a6df4', fontWeight: '600', paddingLeft: 12 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  tabButton: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 13, color: '#999', fontWeight: '600' },
  tabLabelActive: { color: '#222' },
});
