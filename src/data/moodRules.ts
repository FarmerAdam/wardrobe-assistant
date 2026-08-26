import { Mood } from '../types';

export const MOODS: Mood[] = [
  { key: 'cozy', label: 'Cozy', emoji: '🛋️' },
  { key: 'confident', label: 'Confident', emoji: '💪' },
  { key: 'adventurous', label: 'Adventurous', emoji: '🏔️' },
  { key: 'low_key', label: 'Low-key', emoji: '😌' },
  { key: 'dressed_up', label: 'Dressed up', emoji: '✨' },
  { key: 'playful', label: 'Playful', emoji: '🎨' },
];

// Each mood maps to a target range for the numeric fields on an item,
// plus which mood_tags count as a bonus match. Ranges are inclusive.
// Tune these numbers by feel once you're using the app for real —
// this is a starting point, not a fixed spec.
export const MOOD_RULES: Record<
  string,
  {
    formalityRange: [number, number];
    warmthRange: [number, number];
    preferBoldPatterns: boolean;
    boostTags: string[];
  }
> = {
  cozy: {
    formalityRange: [1, 2],
    warmthRange: [2, 3],
    preferBoldPatterns: false,
    boostTags: ['cozy', 'soft', 'relaxed'],
  },
  confident: {
    formalityRange: [3, 5],
    warmthRange: [1, 3],
    preferBoldPatterns: true,
    boostTags: ['confident', 'bold', 'sharp'],
  },
  adventurous: {
    formalityRange: [1, 3],
    warmthRange: [1, 3],
    preferBoldPatterns: true,
    boostTags: ['adventurous', 'durable', 'outdoors'],
  },
  low_key: {
    formalityRange: [1, 2],
    warmthRange: [1, 2],
    preferBoldPatterns: false,
    boostTags: ['low_key', 'simple', 'neutral'],
  },
  dressed_up: {
    formalityRange: [4, 5],
    warmthRange: [1, 3],
    preferBoldPatterns: false,
    boostTags: ['dressed_up', 'elegant'],
  },
  playful: {
    formalityRange: [1, 3],
    warmthRange: [1, 3],
    preferBoldPatterns: true,
    boostTags: ['playful', 'fun', 'colorful'],
  },
};
