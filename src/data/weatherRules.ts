export type Weather = 'cold' | 'warm' | 'hot';

export const WEATHERS: { key: Weather; label: string; textColor: string; backgroundColor: string }[] = [
  { key: 'cold', label: 'Cold', textColor: '#000000', backgroundColor: '#ADE8F4' },
  { key: 'warm', label: 'Warm', textColor: '#1B5E20', backgroundColor: '#FFF176' },
  { key: 'hot', label: 'HOT!', textColor: '#FFFFFF', backgroundColor: '#D32F2F' },
];

// How many outer layers (jumper/jacket/outerwear) to put on, and the warmth
// range to favor when picking every item -- weather is a more literal signal
// for this than mood is, so it overrides mood's warmth targeting entirely.
export const WEATHER_RULES: Record<Weather, { warmthRange: [number, number]; layers: 'both' | 'one' | 'none' }> = {
  cold: { warmthRange: [2, 3], layers: 'both' },
  warm: { warmthRange: [1, 2], layers: 'one' },
  hot: { warmthRange: [1, 1], layers: 'none' },
};
