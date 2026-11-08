import { db } from '@/lib/db';

// A phone with the first schema (before lean angle): one ride synced, one still waiting.
jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  raw.exec(`
    CREATE TABLE rides (
      id TEXT PRIMARY KEY NOT NULL, activity_type TEXT NOT NULL, status TEXT NOT NULL,
      started_at INTEGER NOT NULL, ended_at INTEGER, distance_km REAL NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0, avg_speed_kmh REAL NOT NULL DEFAULT 0,
      max_speed_kmh REAL NOT NULL DEFAULT 0, elevation_gain_m REAL NOT NULL DEFAULT 0,
      route_polyline TEXT NOT NULL DEFAULT '', preview TEXT NOT NULL DEFAULT '',
      is_public INTEGER NOT NULL DEFAULT 0, synced_at INTEGER, created_at INTEGER NOT NULL
    );
    INSERT INTO rides (id, activity_type, status, started_at, synced_at, created_at)
    VALUES ('synced', 'bicycle', 'finished', 1, 5, 1), ('waiting', 'motorbike', 'finished', 2, NULL, 2);
  `);
  return {
    openDatabaseSync: () => ({
      execSync: (sql: string) => raw.exec(sql),
      getAllSync: (sql: string, params: unknown[] = []) => raw.prepare(sql).all(...params),
    }),
  };
});

it('an old install upgrades in place and keeps its rides', () => {
  expect(db.getAllSync('SELECT id, max_lean_deg, points_synced FROM rides ORDER BY id')).toEqual([
    { id: 'synced', max_lean_deg: 0, points_synced: 1 }, // its points went up with it
    { id: 'waiting', max_lean_deg: 0, points_synced: 0 },
  ]);
  expect(db.getAllSync("SELECT name FROM sqlite_master WHERE name IN ('waypoints', 'deleted_rides') ORDER BY name")).toEqual([
    { name: 'deleted_rides' },
    { name: 'waypoints' },
  ]);
  expect(db.getAllSync('PRAGMA user_version')).toEqual([{ user_version: 4 }]);
});
