/**
 * Calendar days are stored as local `YYYY-MM-DD` keys so training days and goal windows follow
 * the user's wall-clock day, not UTC.
 */

export type DateKey = string;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  const ms = fromDateKey(to).getTime() - fromDateKey(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDateKey(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** A time of day as a `Date`, for time pickers and formatting. The day itself is arbitrary. */
export function timeOfDayDate(hour: number, minute: number): Date {
  return new Date(2024, 0, 1, hour, minute);
}

/** A time of day in the device's format, like "6:30 PM" or "18:30". */
export function formatTimeOfDay(hour: number, minute: number): string {
  return timeOfDayDate(hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Days since the Monday of the week `date` falls in. */
function daysSinceMonday(date: Date) {
  return (date.getDay() + 6) % 7;
}

/** The Monday of the week `key` falls in. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -daysSinceMonday(fromDateKey(key)));
}

/** The first day of the month `key` falls in. Months are passed around as this key. */
export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function addMonths(month: DateKey, months: number): DateKey {
  const date = fromDateKey(month);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

export function formatMonth(month: DateKey): string {
  return fromDateKey(month).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

/** The month as calendar rows of seven, Monday first, with `null` for days outside the month. */
export function monthWeeks(month: DateKey): (DateKey | null)[][] {
  const first = fromDateKey(month);
  const blanksBefore = daysSinceMonday(first);
  const dayCount = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (DateKey | null)[] = [
    ...Array.from({ length: blanksBefore }, () => null),
    ...Array.from({ length: dayCount }, (_, i) => addDays(month, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/** "2h 15m", "45m", "0m" */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Age in whole years on the day `on`, today by default. */
export function ageFromDateKey(key: DateKey, on: DateKey = todayKey()): number {
  const dob = fromDateKey(key);
  const now = fromDateKey(on);
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthday =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthday) age--;
  return age;
}
