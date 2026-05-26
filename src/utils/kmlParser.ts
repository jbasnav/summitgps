import type { RoutePoint, Waypoint, Track } from "../hooks/useRoutePlanner";
import { calculateHaversineDistance } from "./geoUtils";

/**
 * Parses a KML string into points and waypoints compatible with SummitGPS
 */
export function parseKML(text: string): { trackName: string; points: RoutePoint[]; waypoints: Waypoint[] } {
  let trackName = "Ruta KML Importada";
  const points: RoutePoint[] = [];
  const waypoints: Waypoint[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    // Attempt to extract document/folder name
    const docNameNode = xmlDoc.querySelector("Document > name") || xmlDoc.querySelector("Folder > name");
    if (docNameNode && docNameNode.textContent) {
      trackName = docNameNode.textContent.trim();
    }

    const placemarks = xmlDoc.getElementsByTagName("Placemark");
    
    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const nameNode = pm.querySelector("name");
      const descNode = pm.querySelector("description");
      
      const pmName = nameNode?.textContent?.trim() || `Punto ${i + 1}`;
      const pmDesc = descNode?.textContent?.trim() || "";

      // 1. Check for LineString (Tracks)
      const lineStringNode = pm.querySelector("LineString");
      if (lineStringNode) {
        if (nameNode?.textContent) {
          trackName = nameNode.textContent.trim();
        }
        
        const coordsText = pm.querySelector("coordinates")?.textContent?.trim() || "";
        if (coordsText) {
          // KML coordinates are longitude,latitude,altitude separated by whitespace
          const coordStrings = coordsText.split(/\s+/);
          let cumulativeDist = 0;
          const parsedCoords: [number, number, number][] = [];

          coordStrings.forEach((str) => {
            const parts = str.split(",");
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              const elevation = parts[2] ? parseFloat(parts[2]) : 0;
              if (!isNaN(lat) && !isNaN(lng)) {
                parsedCoords.push([lat, lng, elevation]);
              }
            }
          });

          parsedCoords.forEach((coord, idx) => {
            if (idx > 0) {
              const prev = parsedCoords[idx - 1];
              cumulativeDist += calculateHaversineDistance([prev[0], prev[1]], [coord[0], coord[1]]);
            }
            points.push({
              lat: coord[0],
              lng: coord[1],
              elevation: coord[2],
              distance: cumulativeDist,
            });
          });
        }
      }

      // 2. Check for Point (Waypoints)
      const pointNode = pm.querySelector("Point");
      if (pointNode) {
        const coordsText = pm.querySelector("coordinates")?.textContent?.trim() || "";
        if (coordsText) {
          const parts = coordsText.split(",");
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              waypoints.push({
                id: `wpt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: pmName,
                lat,
                lng,
                icon: "mountain",
                note: pmDesc,
                color: "#10b981",
                groupId: "default",
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to parse KML file:", error);
  }

  return { trackName, points, waypoints };
}

/**
 * Exports a Track and its waypoints to standard XML KML format for Google Earth
 */
export function exportToKML(track: Track): string {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${track.name}</name>
    <description>Ruta exportada desde SummitGPS</description>
    <Style id="summit_track_style">
      <LineStyle>
        <color>${colorToKmlHex(track.color)}</color>
        <width>4</width>
      </LineStyle>
    </Style>
`;

  // 1. Add Route LineString Placemark
  if (track.points.length > 0) {
    const coordsStr = track.points.map(pt => `${pt.lng},${pt.lat},${pt.elevation}`).join(" ");
    kml += `    <Placemark>
      <name>${track.name}</name>
      <styleUrl>#summit_track_style</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${coordsStr}
        </coordinates>
      </LineString>
    </Placemark>
`;
  }

  // 2. Add Waypoint Placemarks
  if (track.waypoints && track.waypoints.length > 0) {
    track.waypoints.forEach(wpt => {
      kml += `    <Placemark>
      <name>${wpt.name}</name>
      <description>${wpt.note}</description>
      <Point>
        <coordinates>${wpt.lng},${wpt.lat},0</coordinates>
      </Point>
    </Placemark>
`;
    });
  }

  kml += `  </Document>
</kml>`;

  return kml;
}

/**
 * Translates css hex color (e.g. #10b981) to KML color format (AABBGGRR in hex)
 */
function colorToKmlHex(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith("#")) return "ff81b910"; // Default esmeralda
  const hex = hexColor.substring(1);
  if (hex.length === 6) {
    const r = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const b = hex.substring(4, 6);
    return `ff${b}${g}${r}`; // KML is AABBGGRR order (opacity ff)
  }
  return "ff81b910";
}
