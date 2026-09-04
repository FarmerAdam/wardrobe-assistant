import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { showAlert } from '../lib/alert';
import { signIn, signUp } from '../lib/auth';
import { captureFromCamera, pickFromLibrary } from '../lib/photoInput';
import { Profile } from '../types';

type Mode = 'login' | 'signup';

export function AuthScreen({ onAuthed }: { onAuthed: (profile: Profile) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickAvatar(fromCamera: boolean) {
    const uri = fromCamera ? await captureFromCamera() : await pickFromLibrary();
    if (uri) setAvatarUri(uri);
  }

  async function submit() {
    setBusy(true);
    try {
      const profile =
        mode === 'login'
          ? await signIn(username, password)
          : await signUp({ username, password, displayName, avatarUri });
      onAuthed(profile);
    } catch (err: any) {
      showAlert(mode === 'login' ? "Couldn't log in" : "Couldn't sign up", err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Wardrobe</Text>
      <Text style={styles.subtitle}>
        {isSignup ? 'Make an account so you can add friends.' : 'Log in to your closet.'}
      </Text>

      {isSignup && (
        <View style={styles.avatarBlock}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={{ color: '#999', fontSize: 12 }}>photo</Text>
            </View>
          )}
          <View style={styles.avatarButtons}>
            <Text style={styles.linkSmall} onPress={() => pickAvatar(false)}>
              Choose photo
            </Text>
            <Text style={styles.linkSmall} onPress={() => pickAvatar(true)}>
              Take photo
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="what friends type to find you"
      />

      {isSignup && (
        <>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="the name friends see"
          />
        </>
      )}

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder={isSignup ? 'at least 6 characters' : ''}
      />

      <PrimaryButton
        label={busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        onPress={submit}
        disabled={busy || !username || !password || (isSignup && !displayName)}
      />

      <Text
        style={styles.switch}
        onPress={() => !busy && setMode(isSignup ? 'login' : 'signup')}
      >
        {isSignup ? 'I already have an account — log in' : "New here? Create an account"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 72 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  avatarBlock: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f2f2f2' },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarButtons: { flexDirection: 'row', gap: 16, marginTop: 8 },
  linkSmall: { color: '#2a6df4', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15 },
  switch: { color: '#2a6df4', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 20 },
});
