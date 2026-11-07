import { db } from '@/lib/db';
import {
  addWaypoint,
  countUnsynced,
  createRide,
  finishInterruptedRide,
  finishRide,
  getRide,
  listRides,
} from '@/services/rides';
import { pullRemoteRides, syncPendingRides } from '@/services/sync';
import { applyFix, pauseTracker, resumeTracker, startTracker, stopTracker, summarize } from '@/services/tracker';
import type { GpsFix, Waypoint } from '@/types';
import { encodePolyline } from '@/utils/polyline';

// The app's own SQL runs on Node's built-in SQLite, in memory.
jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const all = (sql: string, params: unknown[] = []) => raw.prepare(sql).all(...params);
  return {
    openDatabaseSync: () => ({
      execSync: (sql: string) => raw.exec(sql),
      getAllSync: all,
      getAllAsync: async (sql: string, params?: unknown[]) => all(sql, params),
      getFirstAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).get(...params) ?? null,
      runAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).run(...params),
      withTransactionAsync: async (fn: () => Promise<void>) => {
        raw.exec('BEGIN');
        try {
          await fn();
          raw.exec('COMMIT');
        } catch (e) {
          raw.exec('ROLLBACK');
          throw e;
        }
      },
    }),
  };
});

type Row = Record<string, unknown>;
interface Remote {
  rides: Map<string, Row>;
  waypoints: Map<string, Row>;
  offline: boolean;
  calls: string[];
}

// A Supabase stand-in with just the calls the app makes; `offline` makes every call fail like a dropped connection.
jest.mock('@/lib/supabase', () => {
  const remote = { rides: new Map(), waypoints: new Map(), offline: false, calls: [] as string[] };
  const reply = (call: string, run: () => object) => {
    remote.calls.push(call);
    return Promise.resolve(
      remote.offline ? { data: null, error: { message: 'Network request failed' } } : { error: null, ...run() },
    );
  };
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'rider-1' } } } }) },
    from: (table: 'rides' | 'waypoints') => {
      const rows: Map<string, Row> = remote[table];
      const keyOf = (r: Row) => (table === 'rides' ? String(r.id) : `${r.ride_id}:${r.seq}`);
      const remove = (match: (r: Row) => boolean) =>
        reply(`${table}.delete`, () => {
          for (const [k, r] of rows) if (match(r)) rows.delete(k);
          // on delete cascade
          for (const [k, w] of remote.waypoints) if (!remote.rides.has(String(w.ride_id))) remote.waypoints.delete(k);
          return {};
        });
      return {
        upsert: (input: Row | Row[], options?: { ignoreDuplicates?: boolean }) =>
          reply(`${table}.upsert`, () => {
            for (const r of [input].flat()) {
              const old = rows.get(keyOf(r));
              if (old && options?.ignoreDuplicates) continue;
              rows.set(keyOf(r), { created_at: new Date().toISOString(), ...old, ...r });
            }
            return {};
          }),
        update: (patch: Row) => ({
          eq: (col: string, value: unknown) =>
            reply(`${table}.update`, () => {
              for (const [k, r] of rows) if (r[col] === value) rows.set(k, { ...r, ...patch });
              return {};
            }),
        }),
        select: () => ({
          eq: (col: string, value: unknown) =>
            reply(`${table}.select`, () => ({ data: [...rows.values()].filter((r) => r[col] === value) })),
        }),
        delete: () => ({
          eq: (col: string, value: unknown) => remove((r) => r[col] === value),
          in: (col: string, values: unknown[]) => remove((r) => values.includes(r[col])),
        }),
      };
    },
  };
  return { supabase, remote };
});

const remote: Remote = jest.requireMock('@/lib/supabase').remote;

const T0 = 1_760_000_000_000;
const fix = (i: number): GpsFix => ({
  latitude: 12.9 + i * 0.0001,
  longitude: 77.6 + (i % 3) * 0.00003,
  altitude: 900 + i,
  accuracy: 5,
  speed: 11,
  timestamp: T0 + i * 1000,
});

/** Records a ride the way the live screen does: every kept point is saved as it arrives. */
async function record(id: string, fixes: number[]) {
  await createRide({ id, activityType: 'bicycle', startedAt: T0, isPublic: false });
  let s = startTracker('bicycle', T0);
  const kept: Waypoint[] = [];
  for (const i of fixes) {
    const r = applyFix(s, fix(i));
    s = r.state;
    if (r.kept) {
      kept.push(r.kept);
      await addWaypoint(id, r.kept);
    }
  }
  return { s, kept };
}

async function recordAndFinish(id: string) {
  const { s } = await record(id, [0, 1, 2, 3, 4, 5]);
  const end = T0 + 5000;
  await finishRide(id, summarize(stopTracker(s, end), end), end);
}

beforeEach(() => {
  db.execSync('DELETE FROM rides; DELETE FROM waypoints;');
  remote.rides.clear();
  remote.waypoints.clear();
  remote.offline = false;
  remote.calls.length = 0;
});

describe('sync', () => {
  it('a failed upload keeps the ride queued, and a retry sends it exactly once', async () => {
    await recordAndFinish('ride-a');
    remote.offline = true;
    await expect(syncPendingRides()).rejects.toMatchObject({ message: 'Network request failed' });
    expect(remote.calls).toEqual(['rides.upsert']); // stops at the first failure, sends no points
    expect(await countUnsynced()).toBe(1);

    remote.offline = false;
    expect(await syncPendingRides()).toBe(1);
    expect(await countUnsynced()).toBe(0);
    expect(remote.rides.get('ride-a')).toMatchObject({ user_id: 'rider-1', is_public: false, activity_type: 'bicycle' });
    expect(remote.waypoints.size).toBe(6);

    expect(await syncPendingRides()).toBe(0);
    expect(remote.waypoints.size).toBe(6);
  });

  it('pulling brings back account rides missing on this phone and keeps local ones', async () => {
    await recordAndFinish('local');
    await syncPendingRides();
    const localKm = (await getRide('local'))!.distanceKm;
    // The cloud copy of the local ride differs; the phone's copy wins.
    remote.rides.set('local', { ...remote.rides.get('local'), distance_km: 999 });
    remote.rides.set('cloud', {
      id: 'cloud',
      user_id: 'rider-1',
      activity_type: 'motorbike',
      started_at: new Date(T0 - 86_400_000).toISOString(),
      ended_at: new Date(T0 - 86_000_000).toISOString(),
      distance_km: 12.5,
      duration_seconds: 400,
      avg_speed_kmh: 112.5,
      max_speed_kmh: 160,
      elevation_gain_m: 30,
      max_lean_deg: 41,
      route_polyline: encodePolyline([fix(0), fix(50), fix(100)]),
      is_public: true,
      created_at: new Date(T0).toISOString(),
    });

    await pullRemoteRides();
    const rides = await listRides();
    expect(rides.map((r) => r.id)).toEqual(['local', 'cloud']);
    expect(rides[0].distanceKm).toBe(localKm);
    expect(rides[1]).toMatchObject({ activityType: 'motorbike', distanceKm: 12.5, maxLeanDeg: 41, isPublic: true });
    expect(rides[1].preview).not.toBe('');
    expect(rides[1].syncedAt).not.toBeNull();
    expect(await countUnsynced()).toBe(0); // a pulled ride is already in the cloud
  });
});

describe('rides', () => {
  it('finishing an interrupted ride gives the same stats as finishing it live', async () => {
    // Ride, pause after point 10, resume 20 s later, ride on; then the app is killed.
    let { s } = await record('crashed', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    s = resumeTracker(pauseTracker(s, T0 + 10_000), T0 + 30_000);
    for (const i of [30, 31, 32, 33, 34, 35]) {
      const r = applyFix(s, fix(i));
      s = r.state;
      if (r.kept) await addWaypoint('crashed', r.kept);
    }
    const end = T0 + 35_000;
    const live = summarize(stopTracker(s, end), end);

    await finishInterruptedRide('crashed');
    const saved = await getRide('crashed');
    expect(saved).toMatchObject({ status: 'finished', endedAt: end, durationSeconds: live.durationSeconds });
    expect(saved!.distanceKm).toBeCloseTo(live.distanceKm, 9);
    expect(saved!.maxSpeedKmh).toBeCloseTo(live.maxSpeedKmh, 9);
    expect(saved!.elevationGainM).toBe(live.elevationGainM);
    expect(saved!.maxLeanDeg).toBeCloseTo(live.maxLeanDeg, 9);
  });
});
