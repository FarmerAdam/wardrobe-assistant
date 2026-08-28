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
