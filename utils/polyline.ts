import type { LatLng } from '@/types';

// Google encoded polyline format: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
const PRECISION = 1e5;

function encodeValue(value: number): string {
  let n = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (n >= 0x20) {
    out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  return out + String.fromCharCode(n + 63);
}

export function encodePolyline(points: readonly LatLng[]): string {
  let lastLat = 0;
  let lastLng = 0;
  let out = '';
  for (const p of points) {
    const lat = Math.round(p.latitude * PRECISION);
    const lng = Math.round(p.longitude * PRECISION);
    out += encodeValue(lat - lastLat) + encodeValue(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return out;
}

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push({ latitude: lat / PRECISION, longitude: lng / PRECISION });
  }
  return points;
}

/** Keeps at most `max` points, evenly spaced, always including the first and last. */
export function samplePoints<T>(points: readonly T[], max: number): T[] {
  if (points.length <= max) return [...points];
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/**
 * SVG path of a route scaled into a `size`×`size` box, keeping its real shape.
 * Pass sampled points: Math.min(...xs) on a huge array would overflow the stack.
 */
export function routeToSvgPath(points: readonly LatLng[], size: number, padding = 4): string {
  if (points.length < 2) return '';
  const midLat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((p) => p.longitude * kx);
  const ys = points.map((p) => -p.latitude);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const scale = (size - padding * 2) / (Math.max(w, h) || 1);
  const offX = (size - w * scale) / 2;
  const offY = (size - h * scale) / 2;
  return xs
    .map((x, i) => {
      const px = ((x - minX) * scale + offX).toFixed(1);
      const py = ((ys[i] - minY) * scale + offY).toFixed(1);
      return `${i === 0 ? 'M' : 'L'}${px} ${py}`;
    })
    .join(' ');
}
