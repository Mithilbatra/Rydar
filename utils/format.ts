import { ACTIVITIES } from '@/lib/activities';
import type { ActivityType, UnitSystem } from '@/types';

const KM_PER_MILE = 1.609344;
const FT_PER_M = 3.28084;

export const mpsToKmh = (mps: number) => mps * 3.6;
export const kmToMiles = (km: number) => km / KM_PER_MILE;
export const msToSeconds = (ms: number) => Math.floor(ms / 1000);

export function avgSpeedKmh(distanceKm: number, seconds: number): number {
  return seconds > 0 ? distanceKm / (seconds / 3600) : 0;
}

/** A number and its unit kept apart, so screens can style them differently. */
export interface Measure {
  value: string;
  unit: string;
}

export const joinMeasure = (m: Measure) => `${m.value} ${m.unit}`;

export function fmtDistance(km: number, units: UnitSystem): Measure {
  const v = units === 'imperial' ? kmToMiles(km) : km;
  return { value: v.toFixed(v >= 100 ? 1 : 2), unit: units === 'imperial' ? 'mi' : 'km' };
}

export function fmtSpeed(kmh: number, units: UnitSystem, digits = 1): Measure {
  const v = units === 'imperial' ? kmToMiles(kmh) : kmh;
  return { value: v.toFixed(digits), unit: units === 'imperial' ? 'mph' : 'km/h' };
}

export function fmtElevation(m: number, units: UnitSystem): Measure {
  return units === 'imperial'
    ? { value: Math.round(m * FT_PER_M).toLocaleString(), unit: 'ft' }
    : { value: Math.round(m).toLocaleString(), unit: 'm' };
}

/** 75 -> "1:15", 3725 -> "1:02:05" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** 3725 -> "1h 02m", 300 -> "5m" */
export function formatDurationShort(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return m > 0 ? `${m}m` : `${s}s`;
}

export function rideTitle(startedAt: number, activity: ActivityType): string {
  const hour = new Date(startedAt).getHours();
  const part =
    hour < 5 ? 'Night' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 21 ? 'Evening' : 'Night';
  return `${part} ${ACTIVITIES[activity].label} Ride`;
}

export function formatRideDate(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}
