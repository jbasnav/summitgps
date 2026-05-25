// Geospatial utilities for SUMMIT GPS

/**
 * Calculates the Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const lat1 = (coord1[0] * Math.PI) / 180;
  const lat2 = (coord2[0] * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance value based on unit preference (metric vs imperial).
 */
export function formatDistance(km: number, useImperial: boolean): string {
  if (useImperial) {
    const miles = km * 0.621371;
    if (miles < 0.1) {
      const feet = miles * 5280;
      return `${Math.round(feet)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  } else {
    if (km < 1) {
      const meters = km * 1000;
      return `${Math.round(meters)} m`;
    }
    return `${km.toFixed(2)} km`;
  }
}

/**
 * Formats an elevation value (meters vs feet).
 */
export function formatElevation(meters: number, useImperial: boolean): string {
  if (useImperial) {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Calculates total ascent (elevation gain) and descent (elevation loss) along a profile in meters.
 */
export function calculateElevationGainLoss(elevations: number[]): {
  ascent: number;
  descent: number;
} {
  let ascent = 0;
  let descent = 0;

  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      ascent += diff;
    } else {
      descent += Math.abs(diff);
    }
  }

  return { ascent, descent };
}

/**
 * Estimates hiking time using Naismith's Rule:
 * 4 km/h walking speed, plus 1 hour per 600m of ascent (or 10 minutes per 100m of ascent).
 */
export function estimateHikingTime(km: number, ascentMeters: number): string {
  if (km === 0) return "0 min";

  const baseSpeedKmh = 4.0; // Standard average hiking speed on flat ground
  const flatTimeHours = km / baseSpeedKmh;
  const climbTimeHours = ascentMeters / 600.0;
  const totalHours = flatTimeHours + climbTimeHours;

  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);

  if (hours === 0) {
    return `${minutes} min`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Calculates an approximate difficulty rating based on distance and elevation.
 */
export function calculateDifficulty(km: number, ascentMeters: number): {
  label: "Easy" | "Moderate" | "Strenuous" | "Expert";
  color: string;
} {
  // Simple heuristic score
  const score = km + (ascentMeters / 100) * 2;

  if (score < 8) {
    return { label: "Easy", color: "#10b981" }; // Emerald
  } else if (score < 20) {
    return { label: "Moderate", color: "#f59e0b" }; // Amber
  } else if (score < 40) {
    return { label: "Strenuous", color: "#ef4444" }; // Red
  } else {
    return { label: "Expert", color: "#8b5cf6" }; // Purple
  }
}
