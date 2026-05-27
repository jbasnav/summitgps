import { calculateHaversineDistance } from "./geoUtils";

export interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  distance?: number;
  time?: string;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  speed?: number;
}

/**
 * Detects and removes GPS spikes (outliers).
 * Uses speed threshold if timestamps are present,
 * otherwise uses a distance-rebound ratio geometric algorithm.
 */
export function removeTrackOutliers(points: RoutePoint[], speedThresholdKmh: number = 60): RoutePoint[] {
  if (points.length <= 2) return points;

  const hasTimestamps = points.some(p => p.time && !isNaN(Date.parse(p.time)));
  const filtered: RoutePoint[] = [points[0]];

  if (hasTimestamps) {
    // Speed-based filtering
    for (let i = 1; i < points.length; i++) {
      const prev = filtered[filtered.length - 1];
      const curr = points[i];

      const dist = calculateHaversineDistance([prev.lat, prev.lng], [curr.lat, curr.lng]); // km
      const t1 = Date.parse(prev.time || "");
      const t2 = Date.parse(curr.time || "");
      const timeDiffHours = Math.abs(t2 - t1) / 3600000;

      if (timeDiffHours > 0) {
        const speed = dist / timeDiffHours;
        // If speed exceeds the threshold, skip this point as an outlier
        if (speed > speedThresholdKmh) {
          continue;
        }
      }
      filtered.push(curr);
    }
  } else {
    // Geometric spike detection
    // Calculate adjacent distances
    const distances: number[] = [];
    for (let i = 1; i < points.length; i++) {
      distances.push(calculateHaversineDistance([points[i - 1].lat, points[i - 1].lng], [points[i].lat, points[i].lng]));
    }

    // Get median distance to understand the average step size
    const sortedDists = [...distances].sort((a, b) => a - b);
    const medianDist = sortedDists[Math.floor(sortedDists.length / 2)] || 0.05;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = filtered[filtered.length - 1];
      const curr = points[i];
      const next = points[i + 1];

      const d1 = calculateHaversineDistance([prev.lat, prev.lng], [curr.lat, curr.lng]);
      const d2 = calculateHaversineDistance([curr.lat, curr.lng], [next.lat, next.lng]);
      const dRebound = calculateHaversineDistance([prev.lat, prev.lng], [next.lat, next.lng]);

      // If the point jumps out by a large distance (relative to median step)
      // and the next point rebounds back near the previous point (spike), filter it.
      const isSpike = d1 > 0.3 && d1 > medianDist * 6 && dRebound < d1 * 0.35 && d2 > d1 * 0.8;

      if (isSpike) {
        // Skip current point
        continue;
      }
      filtered.push(curr);
    }
    // Always keep last point
    if (filtered[filtered.length - 1] !== points[points.length - 1]) {
      filtered.push(points[points.length - 1]);
    }
  }

  return filtered;
}

/**
 * Smooths coordinates and altitudes using a weighted moving average.
 * strength 1 = 3-point moving average, strength 2 = 5-point moving average
 */
export function smoothTrackPoints(points: RoutePoint[], strength: number = 1): RoutePoint[] {
  if (points.length <= 2) return points;

  let working = [...points];

  for (let s = 0; s < strength; s++) {
    const nextList: RoutePoint[] = [working[0]];

    for (let i = 1; i < working.length - 1; i++) {
      const prev = working[i - 1];
      const curr = working[i];
      const next = working[i + 1];

      // Smooth coordinates
      const lat = (prev.lat + 2 * curr.lat + next.lat) / 4;
      const lng = (prev.lng + 2 * curr.lng + next.lng) / 4;

      // Smooth elevation if available
      let elevation = curr.elevation;
      if (prev.elevation !== undefined && curr.elevation !== undefined && next.elevation !== undefined) {
        elevation = (prev.elevation + 2 * curr.elevation + next.elevation) / 4;
      }

      nextList.push({
        ...curr,
        lat,
        lng,
        elevation,
      });
    }

    nextList.push(working[working.length - 1]);
    working = nextList;
  }

  return working;
}

/**
 * Queries Open-Elevation API in batches of 100 points
 */
export async function fetchOnlineElevations(
  points: RoutePoint[],
  onProgress: (pct: number) => void
): Promise<number[]> {
  const batchSize = 100;
  const elevations: number[] = new Array(points.length).fill(0);

  for (let i = 0; i < points.length; i += batchSize) {
    const chunk = points.slice(i, i + batchSize);
    const locations = chunk.map(p => ({
      latitude: p.lat,
      longitude: p.lng,
    }));

    try {
      const response = await fetch("https://api.open-elevation.com/api/v1/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locations }),
      });

      if (!response.ok) {
        throw new Error(`Open-Elevation API responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.results || data.results.length !== chunk.length) {
        throw new Error("Invalid results structure returned from Elevation API");
      }

      data.results.forEach((res: any, index: number) => {
        elevations[i + index] = res.elevation || 0;
      });

      const pct = Math.min(100, Math.round(((i + chunk.length) / points.length) * 100));
      onProgress(pct);
    } catch (err: any) {
      console.error("Elevation API fetch chunk error:", err);
      throw new Error(`Error en el servidor de elevación: ${err.message || err}`);
    }
  }

  return elevations;
}
