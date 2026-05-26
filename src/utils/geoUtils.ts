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

/**
 * Result of parsing a coordinate input string.
 */
export interface ParsedCoordinate {
  lat: number;
  lng: number;
  format: "dd" | "ddm" | "dms" | "utm" | "mgrs";
  label: string; // Human-readable label for the detected format
}

/**
 * Attempts to parse a user-entered text string as geographic coordinates.
 * Supports the following formats:
 * - DD (Decimal Degrees): "43.1906, -4.8322" or "43.1906 -4.8322"
 * - DDM (Degrees Decimal Minutes): "43° 11.436' N, 4° 49.932' W"
 * - DMS (Degrees Minutes Seconds): "43° 11' 26\" N, 4° 49' 56\" W"
 * - UTM: "30T 432240 4782350" or "30T 432240E 4782350N"
 * - MGRS: "30TXN28579240" or "30TXN 28579 79240"
 *
 * Returns null if the input does not match any known coordinate format.
 */
export function parseCoordinateInput(input: string): ParsedCoordinate | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // 1. Try DD (Decimal Degrees): "43.1906, -4.8322" or "43.1906 -4.8322"
  const ddRegex = /^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/;
  const ddMatch = trimmed.match(ddRegex);
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, format: "dd", label: `DD: ${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    }
  }

  // 2. Try DMS (Degrees Minutes Seconds): "43° 11' 26" N, 4° 49' 56" W" (flexible separators)
  const dmsRegex = /(\d{1,3})\s*[°º]\s*(\d{1,2})\s*['′]\s*([\d.]+)\s*["″]?\s*([NSns])\s*[,;\s]+\s*(\d{1,3})\s*[°º]\s*(\d{1,2})\s*['′]\s*([\d.]+)\s*["″]?\s*([EWOewo])/;
  const dmsMatch = trimmed.match(dmsRegex);
  if (dmsMatch) {
    const latDeg = parseInt(dmsMatch[1]);
    const latMin = parseInt(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latDir = dmsMatch[4].toUpperCase();
    const lngDeg = parseInt(dmsMatch[5]);
    const lngMin = parseInt(dmsMatch[6]);
    const lngSec = parseFloat(dmsMatch[7]);
    const lngDir = dmsMatch[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    let lng = lngDeg + lngMin / 60 + lngSec / 3600;
    if (latDir === "S") lat = -lat;
    if (lngDir === "W" || lngDir === "O") lng = -lng;

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, format: "dms", label: `DMS: ${latDeg}°${latMin}'${latSec}"${latDir}, ${lngDeg}°${lngMin}'${lngSec}"${lngDir}` };
    }
  }

  // 3. Try DDM (Degrees Decimal Minutes): "43° 11.436' N, 4° 49.932' W"
  const ddmRegex = /(\d{1,3})\s*[°º]\s*([\d.]+)\s*['′]?\s*([NSns])\s*[,;\s]+\s*(\d{1,3})\s*[°º]\s*([\d.]+)\s*['′]?\s*([EWOewo])/;
  const ddmMatch = trimmed.match(ddmRegex);
  if (ddmMatch) {
    const latDeg = parseInt(ddmMatch[1]);
    const latMin = parseFloat(ddmMatch[2]);
    const latDir = ddmMatch[3].toUpperCase();
    const lngDeg = parseInt(ddmMatch[4]);
    const lngMin = parseFloat(ddmMatch[5]);
    const lngDir = ddmMatch[6].toUpperCase();

    let lat = latDeg + latMin / 60;
    let lng = lngDeg + lngMin / 60;
    if (latDir === "S") lat = -lat;
    if (lngDir === "W" || lngDir === "O") lng = -lng;

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, format: "ddm", label: `DDM: ${latDeg}° ${latMin.toFixed(3)}' ${latDir}, ${lngDeg}° ${lngMin.toFixed(3)}' ${lngDir}` };
    }
  }

  // 4. Try UTM: "30T 432240 4782350" or "30T 432240E 4782350N" or "30 T 432240 4782350"
  const utmRegex = /^(\d{1,2})\s*([C-X])\s+(\d{5,7})\s*E?\s+(\d{5,8})\s*N?\s*$/i;
  const utmMatch = trimmed.match(utmRegex);
  if (utmMatch) {
    const zone = parseInt(utmMatch[1]);
    const bandLetter = utmMatch[2].toUpperCase();
    const easting = parseFloat(utmMatch[3]);
    const northing = parseFloat(utmMatch[4]);

    if (zone >= 1 && zone <= 60 && easting >= 100000 && easting <= 999999) {
      const southernHemisphere = bandLetter < "N";
      try {
        const [lat, lng] = convertUtmToLatLng(easting, northing, zone, southernHemisphere);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, format: "utm", label: `UTM: ${zone}${bandLetter} ${Math.round(easting)}E ${Math.round(northing)}N` };
        }
      } catch {
        // Invalid UTM, continue
      }
    }
  }

  // 5. Try MGRS: "30TXN28579240" or "30TXN 28579 79240" or "30T XN 28579 79240"
  const mgrsRegex = /^(\d{1,2})\s*([C-X])\s*([A-HJ-NP-Z])([A-HJ-NP-V])\s*(\d{2,10})$/i;
  const mgrsClean = trimmed.replace(/\s+/g, "");
  const mgrsMatch = mgrsClean.match(mgrsRegex);
  if (mgrsMatch) {
    const zone = parseInt(mgrsMatch[1]);
    const bandLetter = mgrsMatch[2].toUpperCase();
    const colLetter = mgrsMatch[3].toUpperCase();
    const rowLetter = mgrsMatch[4].toUpperCase();
    const numericPart = mgrsMatch[5];

    // The numeric part should have even number of digits, split in half for easting/northing
    if (numericPart.length >= 2 && numericPart.length <= 10 && numericPart.length % 2 === 0) {
      const halfLen = numericPart.length / 2;
      const eastingStr = numericPart.substring(0, halfLen);
      const northingStr = numericPart.substring(halfLen);

      // Pad to 5 digits (100m precision if shorter)
      const precision = Math.pow(10, 5 - halfLen);
      const e100k = parseInt(eastingStr) * precision;
      const n100k = parseInt(northingStr) * precision;

      // Resolve 100km column letter to easting offset
      const colLetterSets = [
        "STUVWXYZ", // set 1 (zones 1,4,7,...)
        "ABCDEFGH", // set 2 (zones 2,5,8,...)
        "JKLMNPQR", // set 3 (zones 3,6,9,...)
      ];
      const zone3Group = zone % 3;
      const colLetterGroup = colLetterSets[zone3Group === 0 ? 2 : zone3Group - 1];
      const colIdx = colLetterGroup.indexOf(colLetter);
      if (colIdx === -1) return null;
      const easting100k = (colIdx + 1) * 100000;

      // Resolve row letter to northing offset
      const rowLetters = "ABCDEFGHJKLMNPQRSTUV";
      const rowGroup = zone % 2;
      let rowIdx = rowLetters.indexOf(rowLetter);
      if (rowIdx === -1) return null;

      // Adjust for row base (even zones offset by 5)
      const rowBase = rowGroup === 1 ? 0 : 5;
      rowIdx = (rowIdx - rowBase + 20) % 20;
      let northing100k = rowIdx * 100000;

      // Handle northing wrapping for the band letter
      const southernHemisphere = bandLetter < "N";
      
      // Approximate the northing based on the band letter
      const bandLetters = "CDEFGHJKLMNPQRSTUVWX";
      const bandIdx = bandLetters.indexOf(bandLetter);
      if (bandIdx === -1) return null;
      const approxLat = -80 + bandIdx * 8;
      
      // Estimate the full northing
      const approxNorthing = southernHemisphere
        ? (approxLat + 80) * 111320
        : approxLat * 111320;
      
      // Find the correct 100km northing cycle
      const northingCycle = Math.round(approxNorthing / 2000000) * 2000000;
      northing100k += northingCycle;

      const fullEasting = easting100k + e100k;
      let fullNorthing = northing100k + n100k;

      if (southernHemisphere) {
        fullNorthing += 10000000;
      }

      try {
        const [lat, lng] = convertUtmToLatLng(fullEasting, fullNorthing, zone, southernHemisphere);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, format: "mgrs", label: `MGRS: ${zone}${bandLetter}${colLetter}${rowLetter} ${eastingStr} ${northingStr}` };
        }
      } catch {
        // Invalid MGRS conversion
      }
    }
  }

  return null;
}

/**
 * Calculates the geodesic area (in square meters) of a polygon
 * using the spherical excess formula.
 * Points are {lat, lng} objects. Polygon does NOT need to be closed.
 */
export function calculateGeodesicArea(points: { lat: number; lng: number }[]): number {
  if (points.length < 3) return 0;
  const R = 6378137; // Earth's radius in meters (WGS84)
  const toRad = (d: number) => (d * Math.PI) / 180;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(points[i].lat);
    const lat2 = toRad(points[j].lat);
    const dLng = toRad(points[j].lng - points[i].lng);
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 2);
  return area;
}

/**
 * Calculates the perimeter (in meters) of a polygon
 * using the Haversine formula between consecutive vertices.
 */
export function calculatePolygonPerimeter(points: { lat: number; lng: number }[]): number {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    perimeter += calculateHaversineDistance(
      [points[i].lat, points[i].lng],
      [points[j].lat, points[j].lng]
    ) * 1000; // Convert km to meters
  }
  return perimeter;
}

/**
 * Formats an area value into a human-readable string.
 */
export function formatArea(m2: number, useImperial: boolean = false): string {
  if (useImperial) {
    const sqft = m2 * 10.7639;
    if (sqft < 43560) return `${Math.round(sqft).toLocaleString()} sq ft`;
    const acres = m2 / 4046.86;
    if (acres < 640) return `${acres.toFixed(2)} acres`;
    return `${(acres / 640).toFixed(2)} sq mi`;
  }
  if (m2 < 10000) return `${Math.round(m2).toLocaleString()} m²`;
  const ha = m2 / 10000;
  if (ha < 100) return `${ha.toFixed(2)} ha`;
  return `${(m2 / 1000000).toFixed(3)} km²`;
}

export interface SplitSegment {
  number: number;
  distance: number;       // in miles or km
  ascent: number;         // in meters
  descent: number;        // in meters
  avgElevation: number;   // in meters
  timeSeconds: number;    // estimated time in seconds
}

/**
 * Calculates splits (per km or per mile) for a route.
 */
export function calculateSplits(
  points: { lat: number; lng: number; elevation: number; distance: number }[],
  useImperial: boolean
): SplitSegment[] {
  if (points.length < 2) return [];

  const unitFactor = useImperial ? 0.621371 : 1.0;
  const interval = 1.0; // 1 unit (1 km or 1 mile)

  const splits: SplitSegment[] = [];
  let currentSplitPoints: typeof points = [points[0]];
  let splitNumber = 1;
  let accumulatedDistInKm = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const distChange = curr.distance - prev.distance;
    
    currentSplitPoints.push(curr);
    accumulatedDistInKm += distChange;

    const accumulatedInUnits = accumulatedDistInKm * unitFactor;

    if (accumulatedInUnits >= interval || i === points.length - 1) {
      const segmentDistance = accumulatedDistInKm;
      
      let ascent = 0;
      let descent = 0;
      let elevSum = 0;
      for (let j = 1; j < currentSplitPoints.length; j++) {
        const diff = currentSplitPoints[j].elevation - currentSplitPoints[j - 1].elevation;
        if (diff > 0) ascent += diff;
        else descent += Math.abs(diff);
        elevSum += currentSplitPoints[j].elevation;
      }
      elevSum += currentSplitPoints[0].elevation;
      const avgElevation = elevSum / currentSplitPoints.length;

      // Estimate time using Naismith's rule (4 km/h flat + 1h per 600m ascent)
      const baseTimeSec = (segmentDistance / 4.0) * 3600;
      const climbTimeSec = ascent * 6.0;
      const timeSeconds = Math.round(baseTimeSec + climbTimeSec);

      splits.push({
        number: splitNumber,
        distance: segmentDistance * unitFactor,
        ascent,
        descent,
        avgElevation,
        timeSeconds
      });

      splitNumber++;
      currentSplitPoints = [curr];
      accumulatedDistInKm = 0;
    }
  }

  return splits;
}

/**
 * Calculates the slope/gradient percentage between two points.
 */
export function calculateSlope(
  p1: { lat: number; lng: number; elevation: number },
  p2: { lat: number; lng: number; elevation: number }
): number {
  const distKm = calculateHaversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]);
  if (distKm === 0) return 0;
  const elevDiffM = p2.elevation - p1.elevation;
  return (elevDiffM / (distKm * 1000)) * 100;
}

/**
 * Maps a slope percentage to a color.
 */
export function getColorForSlope(slope: number): string {
  const absSlope = Math.abs(slope);
  if (absSlope <= 1) return "#10b981"; // Plano: Esmeralda
  if (slope > 0) {
    // Subida
    if (slope <= 4) return "#84cc16"; // Verde claro
    if (slope <= 8) return "#eab308"; // Amarillo
    if (slope <= 12) return "#f97316"; // Naranja
    if (slope <= 18) return "#ef4444"; // Rojo
    return "#d946ef"; // Fucsia (muy empinado)
  } else {
    // Bajada (pendiente negativa)
    const negSlope = Math.abs(slope);
    if (negSlope <= 4) return "#06b6d4"; // Cyan
    if (negSlope <= 8) return "#3b82f6"; // Azul claro
    if (negSlope <= 12) return "#6366f1"; // Indigo
    return "#4f46e5"; // Indigo oscuro
  }
}

/**
 * Maps an elevation value (relative to min and max of track) to an HSL color string.
 */
export function getColorForElevation(elev: number, minElev: number, maxElev: number): string {
  if (maxElev === minElev) return "#10b981";
  const ratio = Math.max(0, Math.min(1, (elev - minElev) / (maxElev - minElev)));
  // Interpolate from blue (220deg) for low elevations to red (0deg) for high elevations.
  const hue = 220 - ratio * 220;
  return `hsl(${hue}, 85%, 45%)`;
}

export interface SurfaceStat {
  surface: string;
  distance: number;
  percentage: number;
  color: string;
}

/**
 * Calculates surface type distance statistics along a track.
 */
export function calculateSurfaceStats(
  points: { lat: number; lng: number; distance: number; surface?: string }[]
): SurfaceStat[] {
  if (points.length < 2) return [];

  const surfaceDistances: Record<string, number> = {
    asfalto: 0,
    grava: 0,
    tierra: 0,
    desconocido: 0
  };

  let totalDist = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dist = curr.distance - prev.distance;
    
    // Fallback to prev point surface if current doesn't have it, default to desconocido
    const surf = curr.surface || prev.surface || "desconocido";
    
    // Normalize key
    let key = "desconocido";
    if (["asfalto", "grava", "tierra"].includes(surf)) {
      key = surf;
    } else if (["asphalt", "paved", "concrete", "tarmac"].includes(surf)) {
      key = "asfalto";
    } else if (["gravel", "fine_gravel", "pebbles", "compacted"].includes(surf)) {
      key = "grava";
    } else if (["dirt", "ground", "earth", "mud", "grass", "unpaved", "sand"].includes(surf)) {
      key = "tierra";
    }

    surfaceDistances[key] = (surfaceDistances[key] || 0) + dist;
    totalDist += dist;
  }

  const colors: Record<string, string> = {
    asfalto: "#3b82f6", // Blue
    grava: "#f59e0b",   // Amber/Orange
    tierra: "#10b981",  // Emerald
    desconocido: "#64748b" // Slate
  };

  const labels: Record<string, string> = {
    asfalto: "Asfalto",
    grava: "Grava / Pistas",
    tierra: "Tierra / Senderos",
    desconocido: "Mixto / Otro"
  };

  if (totalDist === 0) return [];

  return Object.keys(surfaceDistances)
    .map(surf => {
      const dist = surfaceDistances[surf];
      return {
        surface: labels[surf],
        distance: dist,
        percentage: (dist / totalDist) * 100,
        color: colors[surf]
      };
    })
    .filter(stat => stat.distance > 0);
}
