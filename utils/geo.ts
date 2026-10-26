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
