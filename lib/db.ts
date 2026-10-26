import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('rydar.db');

// Schema version 2. Each change adds an idempotent upgrade step below and bumps user_version.
db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS rides (
    id TEXT PRIMARY KEY NOT NULL,
    activity_type TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    distance_km REAL NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    avg_speed_kmh REAL NOT NULL DEFAULT 0,
    max_speed_kmh REAL NOT NULL DEFAULT 0,
    elevation_gain_m REAL NOT NULL DEFAULT 0,
    max_lean_deg REAL NOT NULL DEFAULT 0,
    route_polyline TEXT NOT NULL DEFAULT '',
    preview TEXT NOT NULL DEFAULT '',
    is_public INTEGER NOT NULL DEFAULT 0,
    synced_at INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS rides_started_at ON rides (started_at DESC);
  CREATE TABLE IF NOT EXISTS waypoints (
    ride_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    segment INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude REAL,
    speed REAL,
    timestamp INTEGER NOT NULL,
    PRIMARY KEY (ride_id, seq)
  ) WITHOUT ROWID;
`);

// v1 -> v2: lean angle. New installs already have the column from CREATE TABLE.
if (!db.getAllSync<{ name: string }>('PRAGMA table_info(rides)').some((c) => c.name === 'max_lean_deg')) {
  db.execSync('ALTER TABLE rides ADD COLUMN max_lean_deg REAL NOT NULL DEFAULT 0');
}
db.execSync('PRAGMA user_version = 2');
