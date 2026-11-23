import { CalendarMark } from '../types';

export const LOCKED_MESSAGE_TITLE = 'LOCKED!';
export const LOCKED_MESSAGE_BODY = '(And Dont You Dare Think About Being Sneaky!)';

/** 'YYYY-MM-DD' from local calendar fields — never toISOString(), which reports
 * tomorrow's date for most of the local day in a positive UTC offset like Australia's. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses a 'YYYY-MM-DD' string as a local date (not UTC — new Date(dateStr) would
 * parse as UTC midnight and can land on the wrong weekday in negative-offset zones). */
export function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

export function isMoodUnlocked(todayDateStr: string, marksForToday: CalendarMark[]): boolean {
  return isWeekend(todayDateStr) || marksForToday.length > 0;
}
