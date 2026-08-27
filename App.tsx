import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { ClosetScreen } from './src/screens/ClosetScreen';
import { MoodScreen } from './src/screens/MoodScreen';
import { StyleSetupScreen } from './src/screens/StyleSetupScreen';
import { getOrCreateProfileId } from './src/lib/profile';
import { supabase } from './src/lib/supabase';
import { StyleProfile } from './src/types';

type Tab = 'closet' | 'add' | 'mood';

const EMPTY_STYLE_PROFILE: StyleProfile = { styles: [], favorite_colors: [], avoid: [] };

function Root() {
  const insets = useSafeAreaInsets();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [tab, setTab] = useState<Tab>('closet');
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const id = await getOrCreateProfileId('Wardrobe');
        setProfileId(id);
        const { data } = await supabase.from('profiles').select('style_profile').eq('id', id).single();
        const sp = data?.style_profile as StyleProfile | undefined;
        setStyleProfile(sp && sp.styles ? sp : null);
      } catch (err: any) {
        setError(err.message ?? String(err));
      }
    })();
  }, []);

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

  if (!profileId) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!styleProfile) {
    return (
      <StyleSetupScreen
        profileId={profileId}
        onDone={(sp) => setStyleProfile(sp)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {tab === 'closet' && (
          <ClosetScreen profileId={profileId} refreshKey={refreshKey} onAddItem={() => setTab('add')} />
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
