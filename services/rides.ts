import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { replayTracker, stopTracker, summarize } from '@/services/tracker';
import type { ActivityType, Ride, RideListItem, RideStats, Waypoint } from '@/types';
import { encodePolyline, samplePoints } from '@/utils/polyline';

export const PREVIEW_POINTS = 80;

export interface RideRow {
  id: string;
  activity_type: ActivityType;
  status: Ride['status'];
  started_at: number;
  ended_at: number | null;
  distance_km: number;
  duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  elevation_gain_m: number;
  max_lean_deg: number;
  route_polyline?: string;
  preview: string;
  is_public: number;
  synced_at: number | null;
  created_at: number;
}

const LIST_COLUMNS = `id, activity_type, status, started_at, ended_at, distance_km, duration_seconds,
  avg_speed_kmh, max_speed_kmh, elevation_gain_m, max_lean_deg, preview, is_public, synced_at, created_at`;

function fromRow(r: RideRow): Ride {
  return {
    id: r.id,
    activityType: r.activity_type,
    status: r.status,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    distanceKm: r.distance_km,
    durationSeconds: r.duration_seconds,
    avgSpeedKmh: r.avg_speed_kmh,
    maxSpeedKmh: r.max_speed_kmh,
    elevationGainM: r.elevation_gain_m,
    maxLeanDeg: r.max_lean_deg,
    routePolyline: r.route_polyline ?? '',
    preview: r.preview,
    isPublic: r.is_public === 1,
    syncedAt: r.synced_at,
    createdAt: r.created_at,
  };
}

const listeners = new Set<() => void>();

/** Screens subscribe so they refresh after a save, delete or sync. */
export function onRidesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const notify = () => listeners.forEach((l) => l());

export async function listRides(): Promise<RideListItem[]> {
  const rows = await db.getAllAsync<RideRow>(
    `SELECT ${LIST_COLUMNS} FROM rides WHERE status = 'finished' ORDER BY started_at DESC`,
  );
  return rows.map(fromRow);
}

export async function getRide(id: string): Promise<Ride | null> {
  const row = await db.getFirstAsync<RideRow>('SELECT * FROM rides WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

/** A ride still marked "recording" means the app was closed mid-ride. */
export async function getInterruptedRide(): Promise<RideListItem | null> {
  const row = await db.getFirstAsync<RideRow>(
    `SELECT ${LIST_COLUMNS} FROM rides WHERE status = 'recording' ORDER BY started_at DESC LIMIT 1`,
  );
  return row ? fromRow(row) : null;
}

export function getWaypoints(rideId: string): Promise<Waypoint[]> {
  return db.getAllAsync<Waypoint>(
    'SELECT seq, segment, latitude, longitude, altitude, speed, timestamp FROM waypoints WHERE ride_id = ? ORDER BY seq',
    [rideId],
  );
}

export async function createRide(ride: { id: string; activityType: ActivityType; startedAt: number; isPublic: boolean }) {
  await db.runAsync(
    `INSERT INTO rides (id, activity_type, status, started_at, is_public, created_at) VALUES (?, ?, 'recording', ?, ?, ?)`,
    [ride.id, ride.activityType, ride.startedAt, ride.isPublic ? 1 : 0, Date.now()],
  );
}

export async function addWaypoint(rideId: string, w: Waypoint) {
  await db.runAsync(
    `INSERT OR IGNORE INTO waypoints (ride_id, seq, segment, latitude, longitude, altitude, speed, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rideId, w.seq, w.segment, w.latitude, w.longitude, w.altitude, w.speed, w.timestamp],
  );
}

export async function finishRide(id: string, stats: RideStats, endedAt: number) {
  const points = await getWaypoints(id);
  await db.runAsync(
    `UPDATE rides SET status = 'finished', ended_at = ?, distance_km = ?, duration_seconds = ?, avg_speed_kmh = ?,
       max_speed_kmh = ?, elevation_gain_m = ?, max_lean_deg = ?, route_polyline = ?, preview = ? WHERE id = ?`,
    [
      endedAt,
      stats.distanceKm,
      stats.durationSeconds,
      stats.avgSpeedKmh,
      stats.maxSpeedKmh,
      stats.elevationGainM,
      stats.maxLeanDeg,
      encodePolyline(points),
      encodePolyline(samplePoints(points, PREVIEW_POINTS)),
      id,
    ],
  );
  notify();
}

/** Closes a ride the app was killed in the middle of, rebuilt from its saved points. */
export async function finishInterruptedRide(id: string) {
  const ride = await getRide(id);
  if (!ride) return;
  const points = await getWaypoints(id);
  const endedAt = points.at(-1)?.timestamp ?? ride.startedAt;
  const state = stopTracker(replayTracker(ride.activityType, ride.startedAt, points), endedAt);
  await finishRide(id, summarize(state, endedAt), endedAt);
}

export async function setRidePublic(id: string, isPublic: boolean) {
  await db.runAsync('UPDATE rides SET is_public = ?, synced_at = NULL WHERE id = ?', [isPublic ? 1 : 0, id]);
  notify();
}

export async function deleteRide(id: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM waypoints WHERE ride_id = ?', [id]);
    await db.runAsync('DELETE FROM rides WHERE id = ?', [id]);
  });
  notify();
  // A sync may already have uploaded it; waypoints follow by cascade.
  if (supabase) supabase.from('rides').delete().eq('id', id).then(() => {});
}

export async function countUnsynced(): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM rides WHERE status = 'finished' AND synced_at IS NULL`,
  );
  return row?.n ?? 0;
}
