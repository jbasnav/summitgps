// GPX Import and Export Utilities for SUMMIT GPS

interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  distance?: number;
}

interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  note: string;
  color?: string;
}

/**
 * Exports route trackpoints and waypoints to a standard GPX XML string.
 */
export function exportToGPX(
  routeName: string,
  routePoints: RoutePoint[],
  waypoints: Waypoint[]
): string {
  const name = routeName || "Summit GPS Route";
  const creator = "Summit GPS Planner";
  const time = new Date().toISOString();

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${creator}" 
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name}</name>
    <time>${time}</time>
  </metadata>
`;

  // Add Waypoints
  waypoints.forEach((wpt) => {
    gpx += `  <wpt lat="${wpt.lat.toFixed(6)}" lon="${wpt.lng.toFixed(6)}">
    <name>${escapeXml(wpt.name)}</name>
    <desc>${escapeXml(wpt.note)}</desc>
    <sym>${escapeXml(wpt.icon)}</sym>
  </wpt>\n`;
  });

  // Add Route Track
  if (routePoints.length > 0) {
    gpx += `  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>\n`;

    routePoints.forEach((pt) => {
      gpx += `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lng.toFixed(6)}">`;
      if (pt.elevation !== undefined) {
        gpx += `<ele>${pt.elevation.toFixed(2)}</ele>`;
      }
      gpx += `</trkpt>\n`;
    });

    gpx += `    </trkseg>
  </trk>\n`;
  }

  gpx += `</gpx>`;
  return gpx;
}

/**
 * Parses a GPX XML string into structured RoutePoints and Waypoints.
 */
export function parseGPX(gpxString: string): {
  routeName: string;
  routePoints: RoutePoint[];
  waypoints: Waypoint[];
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxString, "text/xml");

  // Check parsing errors
  const parserError = xmlDoc.getElementsByTagName("parsererror");
  if (parserError.length > 0) {
    throw new Error("Invalid GPX file format or XML parsing error");
  }

  // Get Route Name
  let routeName = "Imported Route";
  const metadataNameNode = xmlDoc.querySelector("metadata > name");
  const trkNameNode = xmlDoc.querySelector("trk > name");
  if (trkNameNode && trkNameNode.textContent) {
    routeName = trkNameNode.textContent.trim();
  } else if (metadataNameNode && metadataNameNode.textContent) {
    routeName = metadataNameNode.textContent.trim();
  }

  // Parse Waypoints
  const waypoints: Waypoint[] = [];
  const wptNodes = xmlDoc.getElementsByTagName("wpt");
  for (let i = 0; i < wptNodes.length; i++) {
    const node = wptNodes[i];
    const latAttr = node.getAttribute("lat");
    const lonAttr = node.getAttribute("lon");

    if (latAttr && lonAttr) {
      const lat = parseFloat(latAttr);
      const lng = parseFloat(lonAttr);
      
      const nameNode = node.getElementsByTagName("name")[0];
      const descNode = node.getElementsByTagName("desc")[0] || node.getElementsByTagName("cmt")[0];
      const symNode = node.getElementsByTagName("sym")[0];

      const name = nameNode && nameNode.textContent ? nameNode.textContent.trim() : `Waypoint ${i + 1}`;
      const note = descNode && descNode.textContent ? descNode.textContent.trim() : "";
      const icon = symNode && symNode.textContent ? symNode.textContent.trim().toLowerCase() : "flag";

      waypoints.push({
        id: `imported-wpt-${i}-${Date.now()}`,
        name,
        lat,
        lng,
        icon,
        note,
        color: "#10b981", // Emerald default
      });
    }
  }

  // Parse Trackpoints
  const routePoints: RoutePoint[] = [];
  const trkptNodes = xmlDoc.getElementsByTagName("trkpt");
  for (let i = 0; i < trkptNodes.length; i++) {
    const node = trkptNodes[i];
    const latAttr = node.getAttribute("lat");
    const lonAttr = node.getAttribute("lon");

    if (latAttr && lonAttr) {
      const lat = parseFloat(latAttr);
      const lng = parseFloat(lonAttr);
      
      const eleNode = node.getElementsByTagName("ele")[0];
      const elevation = eleNode && eleNode.textContent ? parseFloat(eleNode.textContent) : undefined;

      routePoints.push({
        lat,
        lng,
        elevation,
      });
    }
  }

  // Calculate cumulative distances for trackpoints
  let cumulativeDistance = 0;
  for (let i = 0; i < routePoints.length; i++) {
    if (i === 0) {
      routePoints[i].distance = 0;
    } else {
      const prev = routePoints[i - 1];
      const curr = routePoints[i];
      const d = calculateHaversineDistance([prev.lat, prev.lng], [curr.lat, curr.lng]);
      cumulativeDistance += d;
      routePoints[i].distance = cumulativeDistance;
    }
  }

  return {
    routeName,
    routePoints,
    waypoints,
  };
}

// Simple XML string escaper
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

// Helper calculation inside gpx helper to avoid circular dependency
function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371; // km
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
