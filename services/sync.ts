import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { getWaypoints, notify, PREVIEW_POINTS, type RideRow } from '@/services/rides';
import type { ActivityType } from '@/types';
import { decodePolyline, encodePolyline, samplePoints } from '@/utils/polyline';

const UPLOAD_CHUNK = 500;

interface RemoteRide {
  id: string;
  activity_type: ActivityType;
  started_at: string;
  ended_at: string;
  distance_km: number;
  duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  elevation_gain_m: number;
  max_lean_deg: number;
  route_polyline: string;
  is_public: boolean;
  created_at: string;
}

let inflight: Promise<number> | null = null;

/**
 * Uploads finished rides that have not reached Supabase yet. Ids are made on the phone and
 * every write is an upsert, so a retry after a failure never creates duplicates.
 * Resolves to the number of rides uploaded; rejects when offline (the rides stay queued).
 */
export function syncPendingRides(): Promise<number> {
  inflight ??= uploadPending().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function uploadPending(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return 0;

  // Deletes go first, so a ride deleted on this phone can never come back from the cloud.
  const deleted = (await db.getAllAsync<{ id: string }>('SELECT id FROM deleted_rides')).map((d) => d.id);
  if (deleted.length > 0) {
    const { error } = await supabase.from('rides').delete().in('id', deleted); // waypoints follow by cascade
    if (error) throw error;
    await db.runAsync(`DELETE FROM deleted_rides WHERE id IN (${deleted.map(() => '?').join(', ')})`, deleted);
  }

  const pending = await db.getAllAsync<RideRow>(
    `SELECT * FROM rides WHERE status = 'finished' AND synced_at IS NULL ORDER BY started_at`,
  );
  for (const row of pending) {
    const { error } = await supabase.from('rides').upsert({
      id: row.id,
      user_id: userId,
      activity_type: row.activity_type,
      started_at: new Date(row.started_at).toISOString(),
      ended_at: new Date(row.ended_at ?? row.started_at).toISOString(),
      distance_km: row.distance_km,
      duration_seconds: row.duration_seconds,
      avg_speed_kmh: row.avg_speed_kmh,
      max_speed_kmh: row.max_speed_kmh,
      elevation_gain_m: row.elevation_gain_m,
      max_lean_deg: row.max_lean_deg,
      route_polyline: row.route_polyline ?? '',
      is_public: row.is_public === 1,
    });
    if (error) throw error;

    // A visibility flip brings an uploaded ride back here; its points are already in the cloud.
    if (!row.points_synced) {
      const points = await getWaypoints(row.id);
      for (let i = 0; i < points.length; i += UPLOAD_CHUNK) {
        const { error: pointsError } = await supabase.from('waypoints').upsert(
          points.slice(i, i + UPLOAD_CHUNK).map((p) => ({
            ride_id: row.id,
            seq: p.seq,
            latitude: p.latitude,
            longitude: p.longitude,
            altitude: p.altitude,
            speed: p.speed,
            timestamp: new Date(p.timestamp).toISOString(),
          })),
          { onConflict: 'ride_id,seq', ignoreDuplicates: true },
        );
        if (pointsError) throw pointsError;
      }
      await db.runAsync('UPDATE rides SET points_synced = 1 WHERE id = ?', [row.id]);
    }
    // Only mark synced if visibility did not change while we were uploading.
    await db.runAsync('UPDATE rides SET synced_at = ? WHERE id = ? AND is_public = ?', [
      Date.now(),
      row.id,
      row.is_public,
    ]);
  }
  if (pending.length > 0) notify();
  return pending.length;
}

/** Brings the account's rides onto this phone (e.g. after a reinstall). Local rows win. */
export async function pullRemoteRides() {
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return;

  // shortcut: a single request returns at most 1000 rides; page with .range() beyond that.
  const { data, error } = await supabase
    .from('rides')
    .select(
      'id, activity_type, started_at, ended_at, distance_km, duration_seconds, avg_speed_kmh, max_speed_kmh, elevation_gain_m, max_lean_deg, route_polyline, is_public, created_at',
    )
    .eq('user_id', userId);
  if (error) throw error;

  const now = Date.now();
  const deleted = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM deleted_rides')).map((d) => d.id));
  await db.withTransactionAsync(async () => {
    for (const r of data as RemoteRide[]) {
      if (deleted.has(r.id)) continue; // deleted here; its cloud copy goes on the next sync
      await db.runAsync(
        `INSERT OR IGNORE INTO rides (id, activity_type, status, started_at, ended_at, distance_km, duration_seconds,
           avg_speed_kmh, max_speed_kmh, elevation_gain_m, max_lean_deg, route_polyline, preview, is_public, synced_at, created_at)
         VALUES (?, ?, 'finished', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id,
          r.activity_type,
          Date.parse(r.started_at),
          Date.parse(r.ended_at),
          r.distance_km,
          r.duration_seconds,
          r.avg_speed_kmh,
          r.max_speed_kmh,
          r.elevation_gain_m,
          r.max_lean_deg,
          r.route_polyline,
          encodePolyline(samplePoints(decodePolyline(r.route_polyline), PREVIEW_POINTS)),
          r.is_public ? 1 : 0,
          now,
          Date.parse(r.created_at),
        ],
      );
    }
  });
  if (data.length > 0) notify();
}
