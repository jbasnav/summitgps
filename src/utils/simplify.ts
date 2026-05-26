/**
 * Douglas-Peucker algorithm for reducing the number of points in a curve
 * while retaining its shape.
 */

import { calculateHaversineDistance } from './geoUtils';

interface Point {
  lat: number;
  lng: number;
  [key: string]: any;
}

// Perpendicular distance from point p to line segment (p1, p2)
// Since we are dealing with lat/lng, a simple geometric distance approximation is often used,
// but for higher accuracy over long distances, we might need cross-track distance.
// Given this is for track simplification (usually short distances between points),
// planar Euclidean distance is a fast approximation, but let's use the haversine-based 
// approximation to get meters for tolerance.

function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
  // If p1 and p2 are the same point, return distance from p to p1
  if (p1.lat === p2.lat && p1.lng === p2.lng) {
    return calculateHaversineDistance([p.lat, p.lng], [p1.lat, p1.lng]) * 1000;
  }

  // To calculate perpendicular distance in meters accurately on earth,
  // we can use a small-angle approximation. 
  // Map lat/lng to local flat Cartesian coordinate system (in meters).
  // Origin at p1.
  const latMid = (p1.lat + p2.lat) / 2;
  const radLat = (latMid * Math.PI) / 180;
  
  // Degrees to meters
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos(radLat);

  const x = (p.lng - p1.lng) * mPerLng;
  const y = (p.lat - p1.lat) * mPerLat;
  const x2 = (p2.lng - p1.lng) * mPerLng;
  const y2 = (p2.lat - p1.lat) * mPerLat;

  // Dot product
  const dot = x * x2 + y * y2;
  const lenSq = x2 * x2 + y2 * y2;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = 0;
    yy = 0;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = param * x2;
    yy = param * y2;
  }

  const dx = x - xx;
  const dy = y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

function simplifyDPStep<T extends Point>(points: T[], first: number, last: number, sqTolerance: number, simplified: T[]) {
  let maxSqDist = sqTolerance;
  let index = -1;

  for (let i = first + 1; i < last; i++) {
    const dist = perpendicularDistance(points[i], points[first], points[last]);
    const sqDist = dist * dist;
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (index > 0) {
    if (index - first > 1) {
      simplifyDPStep(points, first, index, sqTolerance, simplified);
    }
    simplified.push(points[index]);
    if (last - index > 1) {
      simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
  }
}

/**
 * Simplifies a track using the Ramer-Douglas-Peucker algorithm.
 * @param points Array of objects containing at least lat and lng properties.
 * @param tolerance Tolerance in meters.
 * @returns A new array of simplified points.
 */
export function simplifyTrack<T extends Point>(points: T[], tolerance: number = 5): T[] {
  if (points.length <= 2) return points;

  const sqTolerance = tolerance * tolerance;
  const simplified: T[] = [points[0]];
  
  simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
  
  simplified.push(points[points.length - 1]);

  return simplified;
}
