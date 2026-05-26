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
 * Parsers a Garmin binary FIT file ArrayBuffer and decodes it into RoutePoints
 */
export function parseFIT(buffer: ArrayBuffer): { trackName: string; points: RoutePoint[]; waypoints: Waypoint[] } {
  const trackName = "Actividad Garmin FIT Importada";
  const points: RoutePoint[] = [];
  const waypoints: Waypoint[] = [];
  const rawPoints: { lat: number; lng: number; elevation: number }[] = [];

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

            if (def.globalMessageNumber === 20) { // Record Message
              // Field 0: position_lat (sint32 semicircles)
              // Field 1: position_long (sint32 semicircles)
              // Field 2: altitude (uint16/uint32)
              if (field.fieldDefNum === 0 && field.size === 4) {
                recordData.lat = view.getInt32(fieldOffset, !isBig);
              } else if (field.fieldDefNum === 1 && field.size === 4) {
                recordData.lng = view.getInt32(fieldOffset, !isBig);
              } else if (field.fieldDefNum === 2) {
                if (field.size === 2) {
                  recordData.elevation = view.getUint16(fieldOffset, !isBig);
                } else if (field.size === 4) {
                  recordData.elevation = view.getUint32(fieldOffset, !isBig);
                }
              }
            }
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

            // Standard boundaries check
            if (latDeg >= -90 && latDeg <= 90 && lngDeg >= -180 && lngDeg <= 180) {
              rawPoints.push({ lat: latDeg, lng: lngDeg, elevation: elev });
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

            if (def.globalMessageNumber === 20) {
              if (field.fieldDefNum === 0 && field.size === 4) {
                recordData.lat = view.getInt32(fieldOffset, !isBig);
              } else if (field.fieldDefNum === 1 && field.size === 4) {
                recordData.lng = view.getInt32(fieldOffset, !isBig);
              } else if (field.fieldDefNum === 2) {
                if (field.size === 2) {
                  recordData.elevation = view.getUint16(fieldOffset, !isBig);
                } else if (field.size === 4) {
                  recordData.elevation = view.getUint32(fieldOffset, !isBig);
                }
              }
            }
          }

          if (def.globalMessageNumber === 20 && recordData.lat !== undefined && recordData.lng !== undefined) {
            const latDeg = recordData.lat * (180 / 2147483648);
            const lngDeg = recordData.lng * (180 / 2147483648);
            let elev = 0;
            if (recordData.elevation !== undefined) {
              elev = (recordData.elevation / 5) - 500;
              if (elev < -500 || elev > 9000) elev = 0;
            }
            if (latDeg >= -90 && latDeg <= 90 && lngDeg >= -180 && lngDeg <= 180) {
              rawPoints.push({ lat: latDeg, lng: lngDeg, elevation: elev });
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
      });
    });

  } catch (error) {
    console.error("Failed to parse Garmin FIT file:", error);
  }

  return { trackName, points, waypoints };
}
