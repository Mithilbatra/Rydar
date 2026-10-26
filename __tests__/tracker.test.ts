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
import type { ActivityType, GpsFix, Waypoint } from '@/types';

const T0 = 1_760_000_000_000;
// ~11.1 m per 0.0001 degree of latitude
const fix = (i: number, extra: Partial<GpsFix> = {}): GpsFix => ({
  latitude: 12.9 + i * 0.0001,
  longitude: 77.6,
  altitude: 900,
  accuracy: 5,
  speed: 11,
  timestamp: T0 + i * 1000,
  ...extra,
});

function ride(activity: ActivityType, fixes: GpsFix[]) {
  let s = startTracker(activity, T0);
  const kept: Waypoint[] = [];
  for (const f of fixes) {
    const r = applyFix(s, f);
    s = r.state;
    if (r.kept) kept.push(r.kept);
  }
  return { s, kept };
}

describe('tracker', () => {
  it('adds up distance along a straight line', () => {
    const { s, kept } = ride('bicycle', Array.from({ length: 11 }, (_, i) => fix(i)));
    expect(kept).toHaveLength(11);
    expect(s.distanceM).toBeCloseTo(111.2, 0);
    expect(kept.map((k) => k.seq)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('drops inaccurate fixes and GPS jumps', () => {
    const { s, kept } = ride('bicycle', [
      fix(0),
      fix(1, { accuracy: 80 }),
      fix(2, { latitude: 13.0 }), // ~11 km in a second
      fix(3),
    ]);
    expect(kept.map((k) => k.timestamp)).toEqual([T0, T0 + 3000]);
    expect(s.distanceM).toBeCloseTo(33.4, 0);
  });

  it('a speed that is fine on a motorbike is a spike on a bicycle', () => {
    const fast = [fix(0, { speed: 45 }), fix(1, { latitude: 12.9 + 0.0004, speed: 45 })]; // ~44 m/s = 160 km/h
    expect(ride('bicycle', fast).kept).toHaveLength(1);
    const moto = ride('motorbike', fast);
    expect(moto.kept).toHaveLength(2);
    expect(summarize(moto.s, T0 + 1000).maxSpeedKmh).toBeCloseTo(162, 0);
  });

  it('ignores drift while standing still but keeps current speed live', () => {
    const { s, kept } = ride('bicycle', [fix(0), fix(1, { latitude: 12.9 + 0.00001, speed: 0.3 })]);
    expect(kept).toHaveLength(1);
    expect(s.distanceM).toBe(0);
    expect(s.currentSpeedMs).toBe(0.3);
  });

  it('a GPS speed spike falls back to the speed implied by distance', () => {
    const { s } = ride('bicycle', [fix(0), fix(1, { speed: 90 })]);
    expect(s.maxSpeedMs).toBeCloseTo(11.1, 0);
  });

  it('leaves paused time out of duration and average speed, and no distance across the pause', () => {
    let s: TrackerState = startTracker('bicycle', T0);
    s = applyFix(s, fix(0)).state;
    s = applyFix(s, fix(10)).state; // 111 m in 10 s
    s = pauseTracker(s, T0 + 10_000);
    s = applyFix(s, fix(20)).state; // ignored while paused
    s = resumeTracker(s, T0 + 70_000);
    s = applyFix(s, fix(100, { timestamp: T0 + 70_000 })).state; // far away after the pause: no distance
    s = applyFix(s, fix(110, { timestamp: T0 + 80_000 })).state;
    s = stopTracker(s, T0 + 80_000);
    expect(activeSeconds(s, T0 + 999_999)).toBe(20);
    const sum = summarize(s, T0 + 999_999);
    expect(sum.distanceKm).toBeCloseTo(0.2224, 3);
    expect(sum.avgSpeedKmh).toBeCloseTo(40, 0);
    expect(s.route).toHaveLength(2);
  });

  it('stopping while paused counts the pause', () => {
    let s = startTracker('bicycle', T0);
    s = pauseTracker(s, T0 + 5000);
    s = stopTracker(s, T0 + 65_000);
    expect(activeSeconds(s, T0 + 65_000)).toBe(5);
  });

  describe('lean angle', () => {
    const LAT0 = 12.97;
    const LON0 = 77.59;
    const M_PER_DEG = 111_195;
    // One fix per second on a circle; clockwise (right turn) when dir = 1.
    const circle = (speedMs: number, radius: number, dir: 1 | -1, seconds: number) =>
      Array.from({ length: seconds }, (_, i) => {
        const theta = dir * (speedMs / radius) * i;
        return fix(0, {
          latitude: LAT0 + (radius * Math.cos(theta)) / M_PER_DEG,
          longitude: LON0 + (radius * Math.sin(theta)) / (M_PER_DEG * Math.cos((LAT0 * Math.PI) / 180)),
          speed: speedMs,
          timestamp: T0 + i * 1000,
        });
      });

    it('a steady right turn reads about 39° right, a left turn the same to the left', () => {
      const right = ride('motorbike', circle(20, 50, 1, 15)).s;
      expect(right.leanDeg).toBeGreaterThan(36);
      expect(right.leanDeg).toBeLessThan(41);
      expect(right.maxLeanDeg).toBeLessThan(41);
      expect(summarize(right, T0 + 15_000).maxLeanDeg).toBe(right.maxLeanDeg);
      const left = ride('motorbike', circle(20, 50, -1, 15)).s;
      expect(left.leanDeg).toBeLessThan(-36);
    });

    it('riding straight reads no lean', () => {
      const { s } = ride('motorbike', Array.from({ length: 10 }, (_, i) => fix(i * 2, { speed: 20 })));
      expect(Math.abs(s.leanDeg)).toBeLessThan(0.5);
      expect(s.maxLeanDeg).toBeLessThan(0.5);
    });

    it('below walking-pace speeds the estimate stays at zero', () => {
      const { s } = ride('bicycle', circle(3, 8, 1, 15));
      expect(s.maxLeanDeg).toBe(0);
    });

    it('pausing clears the live lean but keeps the max', () => {
      let { s } = ride('motorbike', circle(20, 50, 1, 10));
      const max = s.maxLeanDeg;
      s = pauseTracker(s, T0 + 10_000);
      expect(s.leanDeg).toBe(0);
      expect(s.maxLeanDeg).toBe(max);
    });
  });

  it('replaying saved points rebuilds the same stats', () => {
    let s: TrackerState = startTracker('motorbike', T0);
    const kept: Waypoint[] = [];
    const push = (f: GpsFix) => {
      const r = applyFix(s, f);
      s = r.state;
      if (r.kept) kept.push(r.kept);
    };
    for (let i = 0; i < 5; i++) push(fix(i, { altitude: 900 + i * 2 }));
    s = pauseTracker(s, T0 + 4000);
    s = resumeTracker(s, T0 + 30_000);
    for (let i = 30; i < 35; i++) push(fix(i, { altitude: 920 }));

    const replayed = replayTracker('motorbike', T0, kept);
    expect(replayed.distanceM).toBeCloseTo(s.distanceM, 6);
    expect(replayed.elevationGainM).toBe(s.elevationGainM);
    expect(replayed.maxLeanDeg).toBeCloseTo(s.maxLeanDeg, 6);
    expect(replayed.seq).toBe(s.seq);
    expect(replayed.segment).toBe(1);
    expect(replayed.pausedMs).toBe(26_000);
  });
});
