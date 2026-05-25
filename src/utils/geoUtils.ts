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

/**
 * Formats coordinates to standard Decimal Degrees (DD)
 */
export function formatToDD(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Formats coordinates to Degrees Decimal Minutes (DDM)
 */
export function formatToDDM(lat: number, lng: number): string {
  const formatLat = (val: number) => {
    const dir = val >= 0 ? "N" : "S";
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = ((abs - deg) * 60).toFixed(3);
    return `${deg}° ${min}' ${dir}`;
  };
  const formatLng = (val: number) => {
    const dir = val >= 0 ? "E" : "W";
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = ((abs - deg) * 60).toFixed(3);
    return `${deg}° ${min}' ${dir}`;
  };
  return `${formatLat(lat)}, ${formatLng(lng)}`;
}

/**
 * Formats coordinates to Degrees Minutes Seconds (DMS)
 */
export function formatToDMS(lat: number, lng: number): string {
  const formatLat = (val: number) => {
    const dir = val >= 0 ? "N" : "S";
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = (((abs - deg) * 60 - min) * 60).toFixed(2);
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };
  const formatLng = (val: number) => {
    const dir = val >= 0 ? "E" : "W";
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = (((abs - deg) * 60 - min) * 60).toFixed(2);
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };
  return `${formatLat(lat)}, ${formatLng(lng)}`;
}

/**
 * Converts Decimal Degrees (WGS84) to flat UTM Zone coordinates
 */
export function convertLatLngToUtm(lat: number, lng: number): string {
  const a = 6378137.0; // semi-major axis
  const f = 1 / 298.257223563; // flattening
  const b = a * (1 - f); // semi-minor axis
  const e2 = (a*a - b*b) / (a*a); // eccentricity squared
  const ePrime2 = (a*a - b*b) / (b*b); // second eccentricity squared
  
  const zone = Math.floor((lng + 180) / 6) + 1;
  let latZone = "N"; // band default
  if (lat >= 40 && lat < 48) latZone = "T"; // Spain is mostly in T
  else if (lat >= 32 && lat < 40) latZone = "S";
  else if (lat >= 48 && lat < 56) latZone = "U";
  else if (lat >= 56 && lat < 64) latZone = "V";
  else if (lat >= 64 && lat < 72) latZone = "W";
  else if (lat >= 72 && lat <= 84) latZone = "X";
  else if (lat >= 24 && lat < 32) latZone = "R";
  else if (lat >= 16 && lat < 24) latZone = "Q";
  else if (lat >= 8 && lat < 16) latZone = "P";
  else if (lat >= 0 && lat < 8) latZone = "N";
  else if (lat >= -8 && lat < 0) latZone = "M";
  else if (lat >= -16 && lat < -8) latZone = "L";
  else if (lat >= -24 && lat < -16) latZone = "K";
  else if (lat >= -32 && lat < -24) latZone = "J";
  else if (lat >= -40 && lat < -32) latZone = "H";
  else if (lat >= -48 && lat < -40) latZone = "G";
  else if (lat >= -56 && lat < -48) latZone = "F";
  else if (lat >= -64 && lat < -56) latZone = "E";
  else if (lat >= -72 && lat < -64) latZone = "D";
  else if (lat >= -80 && lat < -72) latZone = "C";

  const lonOrigin = (zone - 1) * 6 - 180 + 3; // zone center meridian
  const lonOriginRad = lonOrigin * Math.PI / 180;
  
  const latRad = lat * Math.PI / 180;
  const lonRad = lng * Math.PI / 180;
  
  const k0 = 0.9996; // scale factor
  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrime2 * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);
  
  const M = a * (
    (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * latRad
    - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*latRad)
    + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*latRad)
    - (35*e2*e2*e2/3072) * Math.sin(6*latRad)
  );
  
  const easting = k0 * N * (
    A + (1 - T + C) * A*A*A / 6
    + (5 - 18*T + T*T + 72*C - 58*ePrime2) * A*A*A*A*A / 120
  ) + 500000.0;
  
  let northing = k0 * (
    M + N * Math.tan(latRad) * (
      A*A / 2 + (5 - T + 9*C + 4*C*C) * A*A*A*A / 24
      + (61 - 58*T + T*T + 600*C - 330*ePrime2) * A*A*A*A*A*A / 720
    )
  );
  
  if (lat < 0) {
    northing += 10000000.0;
  }
  
  return `${zone}${latZone} ${Math.round(easting)}E ${Math.round(northing)}N`;
}

/**
 * Converts Decimal Degrees to Military Grid Reference System (MGRS)
 */
export function formatToMGRS(lat: number, lng: number): string {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = (a*a - b*b) / (a*a);
  const ePrime2 = (a*a - b*b) / (b*b);
  
  const zone = Math.floor((lng + 180) / 6) + 1;
  
  const latBands = "CDEFGHJKLMNPQRSTUVWX";
  let band = "N";
  const latBandIdx = Math.floor((lat + 80) / 8);
  if (latBandIdx >= 0 && latBandIdx < 20) {
    band = latBands[latBandIdx];
  }
  if (lat > 84) band = "X";
  if (lat < -80) band = "C";

  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const lonOriginRad = lonOrigin * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const lonRad = lng * Math.PI / 180;
  
  const k0 = 0.9996;
  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrime2 * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);
  
  const M = a * (
    (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * latRad
    - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*latRad)
    + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*latRad)
    - (35*e2*e2*e2/3072) * Math.sin(6*latRad)
  );
  
  const easting = k0 * N * (
    A + (1 - T + C) * A*A*A / 6
    + (5 - 18*T + T*T + 72*C - 58*ePrime2) * A*A*A*A*A / 120
  ) + 500000.0;
  
  let northing = k0 * (
    M + N * Math.tan(latRad) * (
      A*A / 2 + (5 - T + 9*C + 4*C*C) * A*A*A*A / 24
      + (61 - 58*T + T*T + 600*C - 330*ePrime2) * A*A*A*A*A*A / 720
    )
  );
  if (lat < 0) northing += 10000000.0;

  const colLetters = [
    "STUVWXYZ", // set 1
    "ABCDEFGH", // set 2
    "JKLMNPQR"  // set 3
  ];
  
  const zone3Group = zone % 3;
  const colLetterGroup = colLetters[(zone3Group === 0 ? 2 : zone3Group - 1)];
  const colIdx = Math.floor(easting / 100000) - 1;
  const colLetter = colIdx >= 0 && colIdx < 8 ? colLetterGroup[colIdx] : "X";

  const rowLetters = "ABCDEFGHJKLMNPQRSTUV";
  const rowGroup = zone % 2;
  const rowBase = rowGroup === 1 ? 0 : 5;
  const rowIdx = (Math.floor(northing / 100000) + rowBase) % 20;
  const rowLetter = rowLetters[rowIdx];

  const eastingPart = Math.floor(easting % 100000).toString().padStart(5, "0");
  const northingPart = Math.floor(northing % 100000).toString().padStart(5, "0");

  return `${zone}${band}${colLetter}${rowLetter} ${eastingPart} ${northingPart}`;
}

/**
 * Formats coordinate based on active settings format choice
 */
export function formatCoordinatesByFormat(lat: number, lng: number, format: "dd" | "ddm" | "dms" | "utm" | "mgrs"): string {
  switch (format) {
    case "ddm":
      return formatToDDM(lat, lng);
    case "dms":
      return formatToDMS(lat, lng);
    case "utm":
      return convertLatLngToUtm(lat, lng);
    case "mgrs":
      return formatToMGRS(lat, lng);
    case "dd":
    default:
      return formatToDD(lat, lng);
  }
}

/**
 * Converts UTM coordinates back to WGS84 Decimal Degrees (lat/lng)
 */
export function convertUtmToLatLng(
  easting: number,
  northing: number,
  zone: number,
  southernHemisphere: boolean = false
): [number, number] {
  const k0 = 0.9996;
  const a = 6378137.0; // semi-major axis
  const f = 1 / 298.257223563; // flattening
  const b = a * (1 - f); // semi-minor axis
  const e2 = (a*a - b*b) / (a*a); // eccentricity squared
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const x = easting - 500000.0;
  let y = northing;
  if (southernHemisphere) {
    y -= 10000000.0;
  }

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 / 256));

  const phi1Rad = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
                + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
                + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu)
                + (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);

  const n1 = a / Math.sqrt(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const r1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const d = x / (n1 * k0);

  const latRad = phi1Rad - (n1 * Math.tan(phi1Rad) / r1) * (
    d * d / 2 - (5 + 3 * Math.tan(phi1Rad) * Math.tan(phi1Rad) + 10 * n1 / r1 - 4 * (n1 / r1) * (n1 / r1) - 9 * (e2 / (1 - e2))) * Math.pow(d, 4) / 24
    + (61 + 90 * Math.tan(phi1Rad) * Math.tan(phi1Rad) + 298 * (e2 / (1 - e2)) + 45 * Math.pow(Math.tan(phi1Rad), 4) - 252 * (e2 / (1 - e2)) * (e2 / (1 - e2)) - 3 * (e2 / (1 - e2)) * (e2 / (1 - e2))) * Math.pow(d, 6) / 720
  );

  const centralMeridian = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const lngRad = centralMeridian + (
    d - (1 + 2 * Math.tan(phi1Rad) * Math.tan(phi1Rad) + (e2 / (1 - e2))) * d * d * d / 6
    + (5 - 2 * (e2 / (1 - e2)) + 28 * Math.tan(phi1Rad) * Math.tan(phi1Rad) - 3 * (e2 / (1 - e2)) * (e2 / (1 - e2)) + 8 * Math.pow(Math.tan(phi1Rad), 4) + 24 * (e2 / (1 - e2)) * (e2 / (1 - e2))) * Math.pow(d, 5) / 120
  ) / Math.cos(phi1Rad);

  return [latRad * 180 / Math.PI, lngRad * 180 / Math.PI];
}
