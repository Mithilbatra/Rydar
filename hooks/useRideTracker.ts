import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { useSettings } from '@/hooks/useSettings';
import { addWaypoint, createRide, finishRide, getRide, getWaypoints } from '@/services/rides';
import {
  activeSeconds,
  applyFix,
  pauseTracker,
  replayTracker,
  resumeTracker,
  startTracker,
  stopTracker,
  summarize,
  type TrackerState,
} from '@/services/tracker';
import type { ActivityType } from '@/types';

/** Without a fix for this long we show 0: iOS sends nothing while you stand still at a light. */
const STALE_FIX_MS = 3000;

export type TrackerPhase = 'starting' | 'denied' | 'active';

export function useRideTracker() {
  const { settings } = useSettings();
  const [state, setState] = useState<TrackerState | null>(null);
  const [phase, setPhase] = useState<TrackerPhase>('starting');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);

  const stateRef = useRef<TrackerState | null>(null);
  const rideIdRef = useRef<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  // Point writes run one after another; stop() waits for the queue before closing the ride.
  const writesRef = useRef<Promise<void>>(Promise.resolve());

  const commit = (next: TrackerState) => {
    stateRef.current = next;
    setState(next);
  };

  // Set when the ride stops or the screen closes, so a GPS watch that starts late is dropped at once.
  const closedRef = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(tick);
      closedRef.current = true;
      watchRef.current?.remove();
    };
  }, []);

  async function allowed(): Promise<boolean> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) setPhase('denied');
    return permission.granted;
  }

  function onFix({ coords, timestamp }: Location.LocationObject) {
    const current = stateRef.current;
    const rideId = rideIdRef.current;
    if (!current || !rideId) return;
    const { state: next, kept } = applyFix(current, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      accuracy: coords.accuracy,
      speed: coords.speed,
      timestamp,
    });
    if (next !== current) commit(next);
    if (kept) {
      writesRef.current = writesRef.current
        .then(() => addWaypoint(rideId, kept))
        .catch((e) => console.warn('Could not save GPS point', e));
    }
    setGpsError(null);
  }

  /** The clock already runs while this waits: a cold GPS can take a while to answer. */
  async function watch() {
    try {
      if (!(await Location.hasServicesEnabledAsync())) {
        setGpsError('Location is turned off on this phone. Turn it on in Settings.');
      }
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
          // Android: GPS alone is enough for riding. With the dialog on, saying "No thanks" to Google
          // Location Accuracy makes the whole watch fail.
          mayShowUserSettingsDialog: false,
        },
        onFix,
        setGpsError,
      );
      if (closedRef.current) sub.remove();
      else watchRef.current = sub;
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : String(e));
    }
  }

  async function begin(activity: ActivityType) {
    if (!(await allowed())) return; // ask first, so a refused permission never leaves an empty ride behind
    const id = Crypto.randomUUID();
    const at = Date.now();
    await createRide({ id, activityType: activity, startedAt: at, isPublic: settings.defaultPublic });
    rideIdRef.current = id;
    commit(startTracker(activity, at));
    setPhase('active');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await watch();
  }

  /** Continues a ride the app was closed in the middle of. The time it was closed counts as a pause. */
  async function recover(rideId: string) {
    if (!(await allowed())) return;
    const ride = await getRide(rideId);
    if (!ride) return;
    const points = await getWaypoints(rideId);
    const replayed = replayTracker(ride.activityType, ride.startedAt, points);
    rideIdRef.current = rideId;
    commit(resumeTracker(pauseTracker(replayed, points.at(-1)?.timestamp ?? ride.startedAt), Date.now()));
    setPhase('active');
    await watch();
  }

  function pause() {
    if (!stateRef.current) return;
    commit(pauseTracker(stateRef.current, Date.now()));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  function resume() {
    if (!stateRef.current) return;
    commit(resumeTracker(stateRef.current, Date.now()));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /** Ends the ride, saves its stats and route, and returns its id. */
  async function stop(): Promise<string | null> {
    const current = stateRef.current;
    const rideId = rideIdRef.current;
    if (!current || !rideId) return null;
    closedRef.current = true;
    watchRef.current?.remove();
    watchRef.current = null;
    const at = Date.now();
    const stopped = stopTracker(current, at);
    commit(stopped);
    await writesRef.current;
    await finishRide(rideId, summarize(stopped, at), at);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return rideId;
  }

  const fresh =
    state?.status === 'recording' && state.lastFixAt != null && now - state.lastFixAt < STALE_FIX_MS;

  return {
    state,
    phase,
    gpsError,
    elapsedSeconds: state ? activeSeconds(state, now) : 0,
    currentSpeedMs: fresh && state ? state.currentSpeedMs : 0,
    begin,
    recover,
    pause,
    resume,
    stop,
  };
}
