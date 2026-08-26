import { MOOD_RULES } from '../data/moodRules';
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

/** Score a single item against the chosen mood and the wearer's style profile. Higher is better. */
export function scoreItem(item: Item, moodKey: string, styleProfile: StyleProfile): number {
  const rule = MOOD_RULES[moodKey];
  if (!rule) return 0;

  let score = 0;

  if (inRange(item.formality, rule.formalityRange)) score += 2;
  if (inRange(item.warmth, rule.warmthRange)) score += 2;

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

/** Rank items in a category, best first, dropping anything in the laundry. */
function rankCategory(items: Item[], category: Item['category'], moodKey: string, styleProfile: StyleProfile) {
  return items
    .filter((i) => i.category === category && !i.in_laundry)
    .map((item) => ({ item, score: scoreItem(item, moodKey, styleProfile) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Build up to `count` outfit suggestions for the given mood.
 * Strategy: rank each category independently, then combine top candidates,
 * preferring combinations with good color harmony, and avoid reusing the
 * exact same item across suggestions unless the wardrobe is too small.
 */
export function suggestOutfits(items: Item[], moodKey: string, styleProfile: StyleProfile, count = 3): Outfit[] {
  const dresses = rankCategory(items, 'dress', moodKey, styleProfile);
  const tops = rankCategory(items, 'top', moodKey, styleProfile);
  const bottoms = rankCategory(items, 'bottom', moodKey, styleProfile);
  const shoes = rankCategory(items, 'shoes', moodKey, styleProfile);
  const outerwear = rankCategory(items, 'outerwear', moodKey, styleProfile);
  const accessories = rankCategory(items, 'accessory', moodKey, styleProfile);

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
    if (outerwear[0] && MOOD_RULES[moodKey]?.warmthRange[1] >= 2) outfit.outerwear = outerwear[0].item;
    if (accessories[0]) outfit.accessory = accessories[0].item;

    outfits.push(outfit);
  }

  return outfits;
}
