export type Category = 'top' | 'jumper' | 'bottom' | 'dress' | 'shoes' | 'outerwear' | 'jacket' | 'accessory';

export type Item = {
  id: string;
  profile_id: string;
  photo_url: string;
  category: Category;
  primary_color: string;
  secondary_color: string | null;
  pattern: string;
  formality: number; // 1-5
  warmth: number; // 1-3
  mood_tags: string[];
  style_tags: string[];
  last_worn_at: string | null;
  in_laundry: boolean;
  recently_worn_exception: boolean;
  created_at: string;
};

export type Mood = {
  key: string;
  label: string;
  emoji: string;
};

export type StyleProfile = {
  styles: string[]; // e.g. ['minimalist', 'streetwear']
  favorite_colors: string[];
  avoid: string[];
};

export type Profile = {
  id: string;
  user_id: string | null;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  style_profile: StyleProfile | null;
};

export type DayType = 'casual' | 'holiday';

export type CalendarMark = {
  id: string;
  profile_id: string;
  date: string; // 'YYYY-MM-DD'
  day_type: DayType;
  created_at: string;
};

export type FriendRequestStatus = 'pending' | 'accepted';

export type FriendRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
};

export type SavedOutfit = {
  id: string;
  profile_id: string;
  mood: string;
  item_ids: string[];
  is_favorite: boolean;
  worn_at: string | null;
  created_at: string;
};

export type OutfitReaction = {
  id: string;
  outfit_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

export type Outfit = {
  top?: Item;
  jumper?: Item;
  bottom?: Item;
  dress?: Item;
  shoes?: Item;
  outerwear?: Item;
  jacket?: Item;
  accessory?: Item;
};
