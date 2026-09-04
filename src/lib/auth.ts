import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { uploadPhoto } from './photoUpload';
import { Profile, StyleProfile } from '../types';

const PROFILE_ID_KEY = 'wardrobe_profile_id';

// Supabase Auth requires an email address, but this app identifies people
// by username. We map a username to a fixed synthetic email so no one ever
// has to own or check a mailbox. Email confirmations must be turned OFF in
// the Supabase dashboard (Auth -> Providers -> Email) for this to work.
const SYNTH_EMAIL_DOMAIN = 'wardrobe-assistant.app';
const usernameToEmail = (username: string) => `${username}@${SYNTH_EMAIL_DOMAIN}`;

const PROFILE_COLUMNS = 'id, user_id, username, display_name, avatar_url, style_profile';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function toProfile(row: any): Profile {
  const sp = row.style_profile as StyleProfile | undefined;
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    username: row.username ?? null,
    display_name: row.display_name,
    avatar_url: row.avatar_url ?? null,
    style_profile: sp && sp.styles ? sp : null,
  };
}

/** The profile row for whoever is currently signed in, or null. */
export async function getMyProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return null;

  const { data: row, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return row ? toProfile(row) : null;
}

export async function signIn(usernameRaw: string, password: string): Promise<Profile> {
  const username = normaliseUsername(usernameRaw);
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) throw new Error('Wrong username or password.');

  const profile = await getMyProfile();
  if (!profile) throw new Error("That account doesn't have a profile yet.");
  await AsyncStorage.setItem(PROFILE_ID_KEY, profile.id);
  return profile;
}

export async function signUp(params: {
  username: string;
  password: string;
  displayName: string;
  avatarUri: string | null;
}): Promise<Profile> {
  const username = normaliseUsername(params.username);
  const displayName = params.displayName.trim() || username;

  if (!USERNAME_RE.test(username)) {
    throw new Error('Username must be 3–20 characters: letters, numbers or underscores.');
  }
  if (params.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { data: taken } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (taken) throw new Error('That username is already taken.');

  const { error: signUpError } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password: params.password,
  });
  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('already registered')) {
      throw new Error('That username is already taken.');
    }
    throw signUpError;
  }

  // Establish a session even if the project still has email confirmation on
  // (in which case signUp doesn't return one).
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password: params.password,
  });
  if (signInError || !signInData.session) {
    throw new Error(
      'Account created, but sign-in is blocked. Ask an adult to turn off "Confirm email" in the Supabase Auth settings.'
    );
  }
  const userId = signInData.session.user.id;

  // If this device already had a pre-login closet, claim that profile row so
  // existing clothes carry over. Otherwise create a fresh one.
  const profile = (await claimDeviceProfile(userId, username, displayName)) ??
    (await createProfile(userId, username, displayName));

  let finalProfile = profile;
  if (params.avatarUri) {
    try {
      const avatarUrl = await uploadPhoto(profile.id, params.avatarUri);
      const { data: updated } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id)
        .select(PROFILE_COLUMNS)
        .single();
      if (updated) finalProfile = toProfile(updated);
    } catch {
      // A missing profile picture isn't worth failing sign-up over — it can
      // be added later from the profile screen.
    }
  }

  await AsyncStorage.setItem(PROFILE_ID_KEY, finalProfile.id);
  return finalProfile;
}

async function claimDeviceProfile(
  userId: string,
  username: string,
  displayName: string
): Promise<Profile | null> {
  const deviceProfileId = await AsyncStorage.getItem(PROFILE_ID_KEY);
  if (!deviceProfileId) return null;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('id', deviceProfileId)
    .maybeSingle();
  if (!existing || existing.user_id) return null; // gone, or already owned

  const { data, error } = await supabase
    .from('profiles')
    .update({ user_id: userId, username, display_name: displayName })
    .eq('id', deviceProfileId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return toProfile(data);
}

async function createProfile(
  userId: string,
  username: string,
  displayName: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, username, display_name: displayName, style_profile: {} })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return toProfile(data);
}

export async function signOut() {
  await supabase.auth.signOut();
  await AsyncStorage.removeItem(PROFILE_ID_KEY);
}
