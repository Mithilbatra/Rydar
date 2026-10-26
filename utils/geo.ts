import type { LatLng } from '@/types';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const GRAVITY = 9.81;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Compass bearing from a to b, 0–360°, clockwise from north. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest signed turn from one bearing to another, in (-180, 180]; positive is a right turn. */
export const turnDeg = (from: number, to: number) => ((((to - from + 540) % 360) + 360) % 360) - 180;

/**
 * Lean angle of a two-wheeler in a steady turn: tan(lean) = v·ω / g.
 * A phone's tilt sensor cannot measure this (in a balanced turn it reads "upright"),
 * but speed and turn rate from GPS can. Positive is leaning right.
 */
export function leanAngleDeg(speedMs: number, turnRateDegPerS: number): number {
  return toDeg(Math.atan((speedMs * toRad(turnRateDegPerS)) / GRAVITY));
}

/**
 * Elevation gain with hysteresis: GPS altitude wobbles by a few metres, so a climb only
 * counts once we are `threshold` metres above the last reference point.
 */
export function stepElevation(
  ref: number | null,
  gain: number,
  altitude: number | null,
  threshold = 3,
): { ref: number | null; gain: number } {
  if (altitude == null) return { ref, gain };
  if (ref == null) return { ref: altitude, gain };
  if (altitude - ref >= threshold) return { ref: altitude, gain: gain + (altitude - ref) };
  if (ref - altitude >= threshold) return { ref: altitude, gain };
  return { ref, gain };
}
