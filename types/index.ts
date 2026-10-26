export type ActivityType = 'bicycle' | 'motorbike';
export type UnitSystem = 'metric' | 'imperial';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** One raw reading from the GPS, before any filtering. */
export interface GpsFix extends LatLng {
  altitude: number | null;
  accuracy: number | null;
  /** m/s as reported by the device; null or negative when unknown. */
  speed: number | null;
  timestamp: number;
}

/** A GPS point we kept for the ride. */
export interface Waypoint extends LatLng {
  seq: number;
  /** Bumped on every resume, so no distance is counted across a pause. Local only. */
  segment: number;
  altitude: number | null;
  /** m/s */
  speed: number | null;
  timestamp: number;
}

export type RideStatus = 'recording' | 'finished';

export interface RideStats {
  distanceKm: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainM: number;
  /** Estimated from speed and turn rate; 0 when never fast enough to tell. */
  maxLeanDeg: number;
}

export interface Ride extends RideStats {
  id: string;
  activityType: ActivityType;
  status: RideStatus;
  /** epoch ms */
  startedAt: number;
  endedAt: number | null;
  /** Google encoded polyline of the full route. */
  routePolyline: string;
  /** Down-sampled polyline for list thumbnails. Local only. */
  preview: string;
  isPublic: boolean;
  /** When the ride last reached Supabase; null = waiting to sync. Local only. */
  syncedAt: number | null;
  createdAt: number;
}

/** Ride rows loaded for lists skip the (large) full polyline. */
export type RideListItem = Omit<Ride, 'routePolyline'>;

export interface Settings {
  units: UnitSystem;
  defaultPublic: boolean;
  lastActivity: ActivityType;
  /** Shown on the rider's number plate; up to two digits. */
  raceNumber: string;
}
