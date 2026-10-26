import { ACTIVITIES } from '@/lib/activities';
import type { ActivityType, GpsFix, LatLng, RideStats, Waypoint } from '@/types';
import { avgSpeedKmh, mpsToKmh } from '@/utils/format';
import { haversineMeters, stepElevation } from '@/utils/geo';

/** Fixes less accurate than this are ignored. */
export const MAX_ACCURACY_M = 30;
/** Moves shorter than this are GPS drift while standing still. */
export const MIN_MOVE_M = 3;
const ROUTE_CHUNK = 500;

export type TrackerStatus = 'recording' | 'paused' | 'stopped';

/** Pure ride state. Every change goes through the functions below, so it is easy to test and to replay. */
export interface TrackerState {
  status: TrackerStatus;
  activity: ActivityType;
  startedAt: number;
  endedAt: number | null;
  pausedMs: number;
  pausedAt: number | null;
  segment: number;
  seq: number;
  last: Waypoint | null;
  distanceM: number;
  maxSpeedMs: number;
  elevationGainM: number;
  elevationRef: number | null;
  currentSpeedMs: number;
  lastFixAt: number | null;
  lastAccuracy: number | null;
  /**
   * The route in chunks. Only the last chunk changes, so the live map redraws one short line
   * per fix instead of the whole ride. Each resume starts a new chunk, which leaves a gap for the pause.
   */
  route: LatLng[][];
}

export function startTracker(activity: ActivityType, at: number): TrackerState {
  return {
    status: 'recording',
    activity,
    startedAt: at,
    endedAt: null,
    pausedMs: 0,
    pausedAt: null,
    segment: 0,
    seq: 0,
    last: null,
    distanceM: 0,
    maxSpeedMs: 0,
    elevationGainM: 0,
    elevationRef: null,
    currentSpeedMs: 0,
    lastFixAt: null,
    lastAccuracy: null,
    route: [[]],
  };
}

export function applyFix(s: TrackerState, fix: GpsFix): { state: TrackerState; kept: Waypoint | null } {
  if (s.status !== 'recording') return { state: s, kept: null };
  const seen: TrackerState = { ...s, lastFixAt: fix.timestamp, lastAccuracy: fix.accuracy };
  if (fix.accuracy != null && fix.accuracy > MAX_ACCURACY_M) return { state: seen, kept: null };

  const maxMs = ACTIVITIES[s.activity].maxPlausibleKmh / 3.6;
  const plausible = (v: number | null) => (v != null && v >= 0 && v <= maxMs ? v : null);
  const prev = s.last?.segment === s.segment ? s.last : null;

  let moved = 0;
  let impliedMs: number | null = null;
  if (prev) {
    const dt = (fix.timestamp - prev.timestamp) / 1000;
    if (dt <= 0) return { state: s, kept: null };
    moved = haversineMeters(prev, fix);
    impliedMs = moved / dt;
    if (impliedMs > maxMs) return { state: seen, kept: null };
    if (moved < MIN_MOVE_M) {
      return { state: { ...seen, currentSpeedMs: plausible(fix.speed) ?? 0 }, kept: null };
    }
  }

  const speed = plausible(fix.speed) ?? impliedMs ?? 0;
  const kept: Waypoint = {
    seq: s.seq,
    segment: s.segment,
    latitude: fix.latitude,
    longitude: fix.longitude,
    altitude: fix.altitude,
    speed,
    timestamp: fix.timestamp,
  };
  const elevation = stepElevation(s.elevationRef, s.elevationGainM, fix.altitude);
  const point = { latitude: fix.latitude, longitude: fix.longitude };
  const route = s.route.slice();
  const tail = route[route.length - 1];
  if (tail.length >= ROUTE_CHUNK) route.push([tail[tail.length - 1], point]);
  else route[route.length - 1] = [...tail, point];

  return {
    state: {
      ...seen,
      seq: s.seq + 1,
      last: kept,
      distanceM: s.distanceM + moved,
      maxSpeedMs: Math.max(s.maxSpeedMs, speed),
      elevationGainM: elevation.gain,
      elevationRef: elevation.ref,
      currentSpeedMs: speed,
      route,
    },
    kept,
  };
}

export function pauseTracker(s: TrackerState, at: number): TrackerState {
  if (s.status !== 'recording') return s;
  return { ...s, status: 'paused', pausedAt: at, currentSpeedMs: 0 };
}

export function resumeTracker(s: TrackerState, at: number): TrackerState {
  if (s.status !== 'paused' || s.pausedAt == null) return s;
  return {
    ...s,
    status: 'recording',
    pausedMs: s.pausedMs + Math.max(0, at - s.pausedAt),
    pausedAt: null,
    segment: s.segment + 1,
    route: [...s.route, []],
  };
}

export function stopTracker(s: TrackerState, at: number): TrackerState {
  if (s.status === 'stopped') return s;
  const pausedMs = s.pausedAt != null ? s.pausedMs + Math.max(0, at - s.pausedAt) : s.pausedMs;
  return { ...s, status: 'stopped', endedAt: at, pausedMs, pausedAt: null, currentSpeedMs: 0 };
}

/** Riding time: wall clock minus pauses. */
export function activeSeconds(s: TrackerState, now: number): number {
  const end = s.endedAt ?? now;
  const paused = s.pausedMs + (s.pausedAt != null ? end - s.pausedAt : 0);
  return Math.max(0, (end - s.startedAt - paused) / 1000);
}

export function summarize(s: TrackerState, now: number): RideStats {
  const distanceKm = s.distanceM / 1000;
  const durationSeconds = Math.round(activeSeconds(s, now));
  return {
    distanceKm,
    durationSeconds,
    avgSpeedKmh: avgSpeedKmh(distanceKm, durationSeconds),
    maxSpeedKmh: mpsToKmh(s.maxSpeedMs),
    elevationGainM: s.elevationGainM,
  };
}

/**
 * Rebuilds a ride from its saved points after the app was killed mid-ride.
 * A pause is assumed between segments; its length is the gap between their points.
 */
export function replayTracker(activity: ActivityType, startedAt: number, points: readonly Waypoint[]): TrackerState {
  let s = startTracker(activity, startedAt);
  for (const p of points) {
    if (p.segment !== s.segment) {
      if (s.last) s = resumeTracker(pauseTracker(s, s.last.timestamp), p.timestamp);
      s = { ...s, segment: p.segment };
    }
    s = applyFix(s, { ...p, accuracy: null }).state;
  }
  return s;
}
