import { avgSpeedKmh, fmtDistance, fmtSpeed, formatDuration, formatDurationShort } from '@/utils/format';
import { bearingDeg, haversineMeters, leanAngleDeg, stepElevation, turnDeg } from '@/utils/geo';
import { decodePolyline, encodePolyline, routeToSvgPath, samplePoints } from '@/utils/polyline';
import { bests, dailyDistance, startOfWeek, weekStreak, weeklyDistance } from '@/utils/stats';

describe('polyline', () => {
  // The worked example from Google's polyline algorithm docs.
  const points = [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 },
  ];
  const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

  it('encodes and decodes the reference example', () => {
    expect(encodePolyline(points)).toBe(encoded);
    expect(decodePolyline(encoded)).toEqual(points);
  });

  it('handles empty input', () => {
    expect(encodePolyline([])).toBe('');
    expect(decodePolyline('')).toEqual([]);
  });

  it('samples keep first and last', () => {
    const many = Array.from({ length: 1000 }, (_, i) => i);
    const s = samplePoints(many, 80);
    expect(s).toHaveLength(80);
    expect(s[0]).toBe(0);
    expect(s[79]).toBe(999);
  });

  it('svg path stays inside the box', () => {
    const path = routeToSvgPath(points, 48);
    const nums = path.match(/[\d.]+/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...nums)).toBeLessThanOrEqual(48);
  });
});

describe('geo', () => {
  it('one degree of longitude at the equator is ~111.2 km', () => {
    expect(haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111_195, -1);
  });

  it('bearings and turns', () => {
    expect(bearingDeg({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(0, 6);
    expect(bearingDeg({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(90, 6);
    expect(bearingDeg({ latitude: 0, longitude: 0 }, { latitude: -1, longitude: 0 })).toBeCloseTo(180, 6);
    expect(turnDeg(350, 10)).toBe(20);
    expect(turnDeg(10, 350)).toBe(-20);
    expect(turnDeg(90, 90)).toBe(0);
  });

  it('lean angle follows tan(lean) = v·ω/g', () => {
    // 20 m/s around a 50 m radius: ω = 0.4 rad/s, tan(lean) = 0.8155
    expect(leanAngleDeg(20, (0.4 * 180) / Math.PI)).toBeCloseTo(39.2, 1);
    expect(leanAngleDeg(20, (-0.4 * 180) / Math.PI)).toBeCloseTo(-39.2, 1);
    expect(leanAngleDeg(0, 30)).toBe(0);
  });

  it('elevation noise below the threshold gives no gain, a real climb does', () => {
    let s = { ref: null as number | null, gain: 0 };
    for (const alt of [100, 101.5, 99, 102, 100.5, 101]) s = stepElevation(s.ref, s.gain, alt);
    expect(s.gain).toBe(0);
    for (const alt of [104, 108, 112, null, 115]) s = stepElevation(s.ref, s.gain, alt);
    expect(s.gain).toBe(15);
  });
});

describe('format', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDurationShort(3725)).toBe('1h 02m');
    expect(formatDurationShort(42)).toBe('42s');
  });

  it('converts units', () => {
    expect(fmtDistance(16.09344, 'imperial')).toEqual({ value: '10.00', unit: 'mi' });
    expect(fmtDistance(123.45, 'metric')).toEqual({ value: '123.5', unit: 'km' });
    expect(fmtSpeed(100, 'imperial', 0)).toEqual({ value: '62', unit: 'mph' });
  });

  it('average speed is zero for zero time', () => {
    expect(avgSpeedKmh(10, 0)).toBe(0);
    expect(avgSpeedKmh(30, 3600)).toBe(30);
  });
});

describe('stats', () => {
  const ride = (id: string, startedAt: Date, extra: Partial<Parameters<typeof bests>[0][number]> = {}) => ({
    id,
    activityType: 'bicycle' as const,
    startedAt: startedAt.getTime(),
    distanceKm: 10,
    durationSeconds: 1800,
    elevationGainM: 50,
    maxSpeedKmh: 40,
    maxLeanDeg: 20,
    ...extra,
  });

  it('a Sunday 23:30 ride belongs to the week that started on Monday', () => {
    const sundayNight = new Date(2026, 9, 25, 23, 30); // Sun 25 Oct 2026, local time
    const mondayMorning = new Date(2026, 9, 26, 0, 10);
    expect(startOfWeek(sundayNight.getTime())).toBe(new Date(2026, 9, 19).getTime());
    expect(startOfWeek(mondayMorning.getTime())).toBe(new Date(2026, 9, 26).getTime());
  });

  it('buckets weekly and daily distance', () => {
    const now = new Date(2026, 9, 25, 12).getTime();
    const rides = [
      ride('a', new Date(2026, 9, 19, 8)), // Monday this week
      ride('b', new Date(2026, 9, 25, 23, 30)), // Sunday this week
      ride('c', new Date(2026, 9, 6, 8)), // Tuesday two weeks ago
    ];
    expect(weeklyDistance(rides, 3, now).map((w) => w.km)).toEqual([10, 0, 20]);
    expect(dailyDistance(rides, now)).toEqual([10, 0, 0, 0, 0, 0, 10]);
    expect(weekStreak(rides, now)).toBe(1);
  });

  it('a motorbike ride never becomes a bicycle record', () => {
    const rides = [
      ride('bike', new Date(2026, 9, 20), { maxSpeedKmh: 52 }),
      ride('moto', new Date(2026, 9, 21), { activityType: 'motorbike', maxSpeedKmh: 180, distanceKm: 300 }),
    ];
    expect(bests(rides, 'bicycle').fastest?.id).toBe('bike');
    expect(bests(rides, 'bicycle').longest?.id).toBe('bike');
    expect(bests(rides, 'motorbike').fastest?.id).toBe('moto');
  });
});
