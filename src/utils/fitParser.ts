import type { RoutePoint, Waypoint } from "../hooks/useRoutePlanner";
import { calculateHaversineDistance } from "./geoUtils";

interface LocalDefinition {
  globalMessageNumber: number;
  isBigEndian: boolean;
  fields: {
    fieldDefNum: number;
    size: number;
    baseType: number;
  }[];
}

/**
 * Helper to parse record fields from record message (global message number 20)
 */
function parseRecordField(
  globalMessageNumber: number,
  fieldDefNum: number,
  size: number,
  fieldOffset: number,
  view: DataView,
  isBig: boolean,
  recordData: any
) {
  if (globalMessageNumber === 20) { // Record Message
    if (fieldDefNum === 0 && size === 4) {
      recordData.lat = view.getInt32(fieldOffset, !isBig);
    } else if (fieldDefNum === 1 && size === 4) {
      recordData.lng = view.getInt32(fieldOffset, !isBig);
    } else if (fieldDefNum === 2) {
      if (size === 2) {
        recordData.elevation = view.getUint16(fieldOffset, !isBig);
      } else if (size === 4) {
        recordData.elevation = view.getUint32(fieldOffset, !isBig);
      }
    } else if (fieldDefNum === 3 && size === 1) {
      recordData.heartRate = view.getUint8(fieldOffset);
    } else if (fieldDefNum === 4 && size === 1) {
      recordData.cadence = view.getUint8(fieldOffset);
    } else if (fieldDefNum === 7 && size === 2) {
      recordData.power = view.getUint16(fieldOffset, !isBig);
    } else if (fieldDefNum === 13 && size === 1) {
      recordData.temperature = view.getInt8(fieldOffset);
    } else if (fieldDefNum === 253 && size === 4) {
      recordData.timestamp = view.getUint32(fieldOffset, !isBig);
    } else if (fieldDefNum === 6 && size === 2) {
      recordData.speed = view.getUint16(fieldOffset, !isBig) / 1000; // speed in m/s
    }
  }
}

/**
 * Parsers a Garmin binary FIT file ArrayBuffer and decodes it into RoutePoints
 */
export function parseFIT(buffer: ArrayBuffer): { trackName: string; points: RoutePoint[]; waypoints: Waypoint[] } {
  const trackName = "Actividad Garmin FIT Importada";
  const points: RoutePoint[] = [];
  const waypoints: Waypoint[] = [];
  const rawPoints: {
    lat: number;
    lng: number;
    elevation: number;
    time?: string;
    heartRate?: number;
    cadence?: number;
    power?: number;
    temperature?: number;
    speed?: number;
  }[] = [];

  try {
    const view = new DataView(buffer);
    
    // 1. Validate Header
    if (buffer.byteLength < 14) {
      throw new Error("FIT file too small for valid header");
    }
    
    const headerLength = view.getUint8(0);
    if (headerLength !== 12 && headerLength !== 14) {
      throw new Error("Invalid FIT header size");
    }

    let magic = "";
    for (let i = 0; i < 4; i++) {
      magic += String.fromCharCode(view.getUint8(8 + i));
    }
    if (magic !== ".FIT") {
      throw new Error("Not a valid Garmin FIT file (missing .FIT signature)");
    }

    const dataSize = view.getUint32(4, true); // Data size in bytes (little-endian)
    const endOffset = headerLength + dataSize;
    let offset = headerLength;

    const definitions = new Map<number, LocalDefinition>();

    // 2. Decode records
    while (offset < endOffset && offset < buffer.byteLength) {
      const recordHeader = view.getUint8(offset);
      offset += 1;

      // Check if it's a Normal Header (bit 7 is 0) or Compressed Timestamp Header (bit 7 is 1)
      if ((recordHeader & 0x80) === 0) {
        const isDefinition = (recordHeader & 0x40) !== 0;
        const hasDeveloperData = (recordHeader & 0x20) !== 0;
        const localMessageType = recordHeader & 0x0F;

        if (isDefinition) {
          // --- DEFINITION MESSAGE ---
          offset += 1; // skip reserved byte
          const architecture = view.getUint8(offset);
          offset += 1;
          const isBigEndian = architecture === 1;

          const globalMessageNumber = isBigEndian 
            ? view.getUint16(offset, false) 
            : view.getUint16(offset, true);
          offset += 2;

          const numFields = view.getUint8(offset);
          offset += 1;

          const fields: { fieldDefNum: number; size: number; baseType: number }[] = [];
          for (let f = 0; f < numFields; f++) {
            const fieldDefNum = view.getUint8(offset);
            const size = view.getUint8(offset + 1);
            const baseType = view.getUint8(offset + 2);
            offset += 3;

            fields.push({ fieldDefNum, size, baseType });
          }

          if (hasDeveloperData) {
            const numDevFields = view.getUint8(offset);
            offset += 1;
            offset += numDevFields * 3; // skip developer field definitions
          }

          definitions.set(localMessageType, {
            globalMessageNumber,
            isBigEndian,
            fields,
          });
        } else {
          // --- DATA MESSAGE ---
          const def = definitions.get(localMessageType);
          if (!def) {
            // No definition for local type, skip record
            break;
          }

          const isBig = def.isBigEndian;
          const recordData: any = {};

          for (const field of def.fields) {
            const fieldOffset = offset;
            offset += field.size;
            parseRecordField(def.globalMessageNumber, field.fieldDefNum, field.size, fieldOffset, view, isBig, recordData);
          }

          if (def.globalMessageNumber === 20 && recordData.lat !== undefined && recordData.lng !== undefined) {
            // Clean valid coordinates (semicircles to degrees)
            const latDeg = recordData.lat * (180 / 2147483648);
            const lngDeg = recordData.lng * (180 / 2147483648);

            // Decode Garmin altitude: scale is (raw_val / 5) - 500 meters
            let elev = 0;
            if (recordData.elevation !== undefined) {
              elev = (recordData.elevation / 5) - 500;
              if (elev < -500 || elev > 9000) elev = 0; // protection
            }

            let timeIso: string | undefined = undefined;
            if (recordData.timestamp !== undefined) {
              timeIso = new Date((recordData.timestamp + 631065600) * 1000).toISOString();
            }

            // Standard boundaries check
            if (latDeg >= -90 && latDeg <= 90 && lngDeg >= -180 && lngDeg <= 180) {
              rawPoints.push({
                lat: latDeg,
                lng: lngDeg,
                elevation: elev,
                time: timeIso,
                heartRate: recordData.heartRate,
                cadence: recordData.cadence,
                power: recordData.power,
                temperature: recordData.temperature,
                speed: recordData.speed,
              });
            }
          }
        }
      } else {
        // --- COMPRESSED TIMESTAMP HEADER ---
        const localMessageType = (recordHeader >> 5) & 0x03;
        const def = definitions.get(localMessageType);
        if (def) {
          const isBig = def.isBigEndian;
          const recordData: any = {};

          for (const field of def.fields) {
            const fieldOffset = offset;
            offset += field.size;
            parseRecordField(def.globalMessageNumber, field.fieldDefNum, field.size, fieldOffset, view, isBig, recordData);
          }

          if (def.globalMessageNumber === 20 && recordData.lat !== undefined && recordData.lng !== undefined) {
            const latDeg = recordData.lat * (180 / 2147483648);
            const lngDeg = recordData.lng * (180 / 2147483648);
            let elev = 0;
            if (recordData.elevation !== undefined) {
              elev = (recordData.elevation / 5) - 500;
              if (elev < -500 || elev > 9000) elev = 0;
            }

            let timeIso: string | undefined = undefined;
            if (recordData.timestamp !== undefined) {
              timeIso = new Date((recordData.timestamp + 631065600) * 1000).toISOString();
            }

            if (latDeg >= -90 && latDeg <= 90 && lngDeg >= -180 && lngDeg <= 180) {
              rawPoints.push({
                lat: latDeg,
                lng: lngDeg,
                elevation: elev,
                time: timeIso,
                heartRate: recordData.heartRate,
                cadence: recordData.cadence,
                power: recordData.power,
                temperature: recordData.temperature,
                speed: recordData.speed,
              });
            }
          }
        } else {
          // If no definition matches, we must break to avoid infinite loop
          break;
        }
      }
    }

    // 3. Post-process: Calculate cumulative geodetic distances
    let cumulativeDist = 0;
    rawPoints.forEach((pt, idx) => {
      if (idx > 0) {
        const prev = rawPoints[idx - 1];
        cumulativeDist += calculateHaversineDistance([prev.lat, prev.lng], [pt.lat, pt.lng]);
      }
      points.push({
        lat: pt.lat,
        lng: pt.lng,
        elevation: pt.elevation,
        distance: cumulativeDist,
        time: pt.time,
        heartRate: pt.heartRate,
        cadence: pt.cadence,
        power: pt.power,
        temperature: pt.temperature,
        speed: pt.speed,
      });
    });

  } catch (error) {
    console.error("Failed to parse Garmin FIT file:", error);
  }

  return { trackName, points, waypoints };
}
