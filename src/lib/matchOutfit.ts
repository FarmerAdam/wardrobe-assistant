import { MOOD_RULES } from '../data/moodRules';
import { Weather, WEATHER_RULES } from '../data/weatherRules';
import { Item, Outfit, StyleProfile } from '../types';

const NEUTRAL_COLORS = new Set([
  'black',
  'white',
  'grey',
  'gray',
  'navy',
  'beige',
  'cream',
  'olive',
  'brown',
  'tan',
]);

function inRange(value: number, range: [number, number]) {
  return value >= range[0] && value <= range[1];
}

/** How well two colors sit together. 1 = great pair, 0 = clashes. Deliberately simple. */
function colorHarmony(a: string, b?: string | null) {
  if (!b) return 1;
  if (a === b) return 1;
  if (NEUTRAL_COLORS.has(a) || NEUTRAL_COLORS.has(b)) return 1;
  return 0.4; // two different bold colors together — allowed, just scored lower
}

function daysSince(dateString: string | null) {
  if (!dateString) return Infinity;
  return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Score a single item against the chosen mood, weather, and the wearer's
 * style profile. Higher is better. Weather -- a literal temperature signal
 * -- overrides mood's warmth range, since mood is about style/formality,
 * not how cold it actually is outside.
 */
export function scoreItem(item: Item, moodKey: string, weather: Weather, styleProfile: StyleProfile): number {
  const rule = MOOD_RULES[moodKey];
  if (!rule) return 0;

  let score = 0;

  if (inRange(item.formality, rule.formalityRange)) score += 2;
  if (inRange(item.warmth, WEATHER_RULES[weather].warmthRange)) score += 2;

  const tagOverlap = item.mood_tags.filter((t) => rule.boostTags.includes(t)).length;
  score += tagOverlap * 1.5;

  if (rule.preferBoldPatterns && item.pattern !== 'solid') score += 1;
  if (!rule.preferBoldPatterns && item.pattern === 'solid') score += 1;

  const styleOverlap = item.style_tags.filter((t) => styleProfile.styles.includes(t)).length;
  score += styleOverlap * 2;

  if (styleProfile.favorite_colors.includes(item.primary_color)) score += 1.5;
  if (styleProfile.avoid.includes(item.primary_color) || styleProfile.avoid.includes(item.pattern)) {
    score -= 3;
  }

  // Nudge away from things worn in the last 3 days so suggestions don't repeat.
  const recency = daysSince(item.last_worn_at);
  if (recency < 3) score -= 2;

  return score;
}

/** Rank items across one or more categories, best first, dropping anything in the laundry. */
function rankCategory(
  items: Item[],
  categories: Item['category'][],
  moodKey: string,
  weather: Weather,
  styleProfile: StyleProfile
) {
  return items
    .filter((i) => categories.includes(i.category) && !i.in_laundry)
    .map((item) => ({ item, score: scoreItem(item, moodKey, weather, styleProfile) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Build up to `count` outfit suggestions for the given mood and weather.
 * Strategy: rank each category independently, then combine top candidates,
 * preferring combinations with good color harmony, and avoid reusing the
 * exact same item across suggestions unless the wardrobe is too small.
 *
 * Weather decides how many outer layers go on: "cold" puts on jumper AND
 * jacket together, "warm" picks whichever single layer (jumper, jacket, or
 * outerwear) scores best, "hot" skips layers entirely.
 */
export function suggestOutfits(
  items: Item[],
  moodKey: string,
  weather: Weather,
  styleProfile: StyleProfile,
  count = 3
): Outfit[] {
  const dresses = rankCategory(items, ['dress'], moodKey, weather, styleProfile);
  const tops = rankCategory(items, ['top'], moodKey, weather, styleProfile);
  const bottoms = rankCategory(items, ['bottom'], moodKey, weather, styleProfile);
  const shoes = rankCategory(items, ['shoes'], moodKey, weather, styleProfile);
  // Jumper, outerwear, and jacket are all kept fully separate -- each is its
  // own category with its own slot, layered on top of a top+bottom/dress
  // base rather than substituting for the top. Never pooled together.
  const jumpers = rankCategory(items, ['jumper'], moodKey, weather, styleProfile);
  const outerwear = rankCategory(items, ['outerwear'], moodKey, weather, styleProfile);
  const jackets = rankCategory(items, ['jacket'], moodKey, weather, styleProfile);
  const accessories = rankCategory(items, ['accessory'], moodKey, weather, styleProfile);

  const outfits: Outfit[] = [];
  const usedTopBottomOrDress = new Set<string>();

  // Build candidate top+bottom (or dress) combos scored by combined item score + color harmony.
  type Base = { top?: (typeof tops)[number]; bottom?: (typeof bottoms)[number]; dress?: (typeof dresses)[number]; score: number };
  const bases: Base[] = [];

  for (const d of dresses) {
    bases.push({ dress: d, score: d.score });
  }
  for (const t of tops) {
    for (const b of bottoms) {
      const harmony = colorHarmony(t.item.primary_color, b.item.primary_color);
      bases.push({ top: t, bottom: b, score: t.score + b.score + harmony * 2 });
    }
  }

  bases.sort((a, b) => b.score - a.score);

  const layerMode = WEATHER_RULES[weather].layers;

  for (const base of bases) {
    if (outfits.length >= count) break;

    const key = base.dress ? `dress:${base.dress.item.id}` : `top:${base.top!.item.id}+bottom:${base.bottom!.item.id}`;
    if (usedTopBottomOrDress.has(key)) continue;
    usedTopBottomOrDress.add(key);

    const outfit: Outfit = {};
    if (base.dress) outfit.dress = base.dress.item;
    if (base.top) outfit.top = base.top.item;
    if (base.bottom) outfit.bottom = base.bottom.item;
    if (shoes[0]) outfit.shoes = shoes[0].item;

    if (layerMode === 'both') {
      if (jumpers[0]) outfit.jumper = jumpers[0].item;
      if (jackets[0]) outfit.jacket = jackets[0].item;
      if (outerwear[0]) outfit.outerwear = outerwear[0].item;
    } else if (layerMode === 'one') {
      const bestLayer = [
        jumpers[0] && { kind: 'jumper' as const, ...jumpers[0] },
        jackets[0] && { kind: 'jacket' as const, ...jackets[0] },
        outerwear[0] && { kind: 'outerwear' as const, ...outerwear[0] },
      ]
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .sort((a, b) => b.score - a.score)[0];
      if (bestLayer) outfit[bestLayer.kind] = bestLayer.item;
    }
    // layerMode === 'none' -> no jumper/jacket/outerwear at all

    if (accessories[0]) outfit.accessory = accessories[0].item;

    outfits.push(outfit);
  }

  return outfits;
}
