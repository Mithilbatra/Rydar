import type { ActivityType, RideListItem } from '@/types';

// shortcut: all stats are computed on the phone from local rows; fine for thousands of rides,
// move to a Supabase view if this ever serves many users.

type StatRide = Pick<
  RideListItem,
  'id' | 'activityType' | 'startedAt' | 'distanceKm' | 'durationSeconds' | 'elevationGainM' | 'maxSpeedKmh'
>;

const addDays = (ts: number, days: number) => {
  const d = new Date(ts);
  d.setDate(d.getDate() + days); // calendar days, so DST shifts keep local midnight
  return d.getTime();
};

/** Local Monday 00:00 of the week containing `ts`. */
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function startOfMonth(ts: number, offsetMonths = 0): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + offsetMonths, 1).getTime();
}

export const previousWeek = (weekStart: number) => addDays(weekStart, -7);

export function inRange<T extends StatRide>(rides: readonly T[], from: number, to: number): T[] {
  return rides.filter((r) => r.startedAt >= from && r.startedAt < to);
}

export interface Totals {
  count: number;
  distanceKm: number;
  durationSeconds: number;
  elevationGainM: number;
}

export function totals(rides: readonly StatRide[]): Totals {
  return rides.reduce<Totals>(
    (t, r) => ({
      count: t.count + 1,
      distanceKm: t.distanceKm + r.distanceKm,
      durationSeconds: t.durationSeconds + r.durationSeconds,
      elevationGainM: t.elevationGainM + r.elevationGainM,
    }),
    { count: 0, distanceKm: 0, durationSeconds: 0, elevationGainM: 0 },
  );
}

export interface Bests<T> {
  longest: T | null;
  fastest: T | null;
  biggestClimb: T | null;
  longestTime: T | null;
}

/** Takes one activity on purpose: a motorbike top speed must never become a bicycle record. */
export function bests<T extends StatRide>(rides: readonly T[], activity: ActivityType): Bests<T> {
  const own = rides.filter((r) => r.activityType === activity);
  const top = (key: 'distanceKm' | 'maxSpeedKmh' | 'elevationGainM' | 'durationSeconds') =>
    own.reduce<T | null>((best, r) => (r[key] > (best?.[key] ?? 0) ? r : best), null);
  return {
    longest: top('distanceKm'),
    fastest: top('maxSpeedKmh'),
    biggestClimb: top('elevationGainM'),
    longestTime: top('durationSeconds'),
  };
}

/** Distance per week for the last `weeks` weeks, oldest first; the last entry is this week. */
export function weeklyDistance(rides: readonly StatRide[], weeks: number, now: number) {
  const thisWeek = startOfWeek(now);
  const starts = Array.from({ length: weeks }, (_, i) => addDays(thisWeek, -7 * (weeks - 1 - i)));
  const sums = new Map(starts.map((s) => [s, 0]));
  for (const r of rides) {
    const key = startOfWeek(r.startedAt);
    const sum = sums.get(key);
    if (sum !== undefined) sums.set(key, sum + r.distanceKm);
  }
  return starts.map((start) => ({ start, km: sums.get(start) ?? 0 }));
}

/** Distance per day of the current week, Monday first. */
export function dailyDistance(rides: readonly StatRide[], now: number): number[] {
  const week = startOfWeek(now);
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rides) {
    if (startOfWeek(r.startedAt) !== week) continue;
    days[(new Date(r.startedAt).getDay() + 6) % 7] += r.distanceKm;
  }
  return days;
}

/** Weeks in a row with at least one ride. An empty current week does not break the streak yet. */
export function weekStreak(rides: readonly StatRide[], now: number): number {
  const active = new Set(rides.map((r) => startOfWeek(r.startedAt)));
  let week = startOfWeek(now);
  if (!active.has(week)) week = previousWeek(week);
  let streak = 0;
  while (active.has(week)) {
    streak++;
    week = previousWeek(week);
  }
  return streak;
}

export const percentChange = (current: number, previous: number): number | null =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;
