import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const PROFILE_ID_KEY = 'wardrobe_profile_id';

/**
 * v1 is single-profile-per-device: on first launch, create one `profiles`
 * row and remember its id locally. Multi-profile support (e.g. separate
 * closets per person) can layer on top of this later without a schema change.
 */
export async function getOrCreateProfileId(displayName: string): Promise<string> {
  const cached = await AsyncStorage.getItem(PROFILE_ID_KEY);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('profiles')
    .insert({ display_name: displayName, style_profile: {} })
    .select('id')
    .single();

  if (error) throw error;

  await AsyncStorage.setItem(PROFILE_ID_KEY, data.id);
  return data.id;
}
