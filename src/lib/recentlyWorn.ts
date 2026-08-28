import { Item } from '../types';

/** An item tagged "recently worn" stays tagged for this many days, then the tag disappears on its own. */
export const RECENTLY_WORN_DAYS = 5;

export function daysSinceWorn(item: Item): number {
  if (!item.last_worn_at) return Infinity;
  return (Date.now() - new Date(item.last_worn_at).getTime()) / (1000 * 60 * 60 * 24);
}

export function isRecentlyWorn(item: Item): boolean {
  return daysSinceWorn(item) < RECENTLY_WORN_DAYS;
}

/** Recently worn items are excluded from outfit suggestions unless an exception was granted. */
export function isExcludedFromOutfits(item: Item): boolean {
  return isRecentlyWorn(item) && !item.recently_worn_exception;
}
