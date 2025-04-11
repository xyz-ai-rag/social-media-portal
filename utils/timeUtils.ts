// timeUtils.ts

import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * Sets the time of the given date string to the start of the day (00:00:00)
 * and returns a formatted string in the format "yyyy-MM-dd HH:mm:ss".
 *
 * @param dateStr - The input date string.
 * @returns The formatted start-of-day date string.
 */
export function setStartOfDay(dateStr: string): string {
  const date = new Date(dateStr);
  return format(startOfDay(date), "yyyy-MM-dd HH:mm:ss");
}

/**
 * Sets the time of the given date string to the end of the day (23:59:59)
 * and returns a formatted string in the format "yyyy-MM-dd HH:mm:ss".
 *
 * @param dateStr - The input date string.
 * @returns The formatted end-of-day date string.
 */
export function setEndOfDay(dateStr: string): string {
  const date = new Date(dateStr);
  return format(endOfDay(date), "yyyy-MM-dd HH:mm:ss");
}
