// GPX Import and Export Utilities for SUMMIT GPS

interface RoutePoint {
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
  xmlns:gpxtrkx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">
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
      if (pt.time) {
        gpx += `<time>${pt.time}</time>`;
      }
      
      const hasExtensions = pt.heartRate !== undefined || pt.cadence !== undefined || pt.temperature !== undefined || pt.power !== undefined;
      if (hasExtensions) {
        gpx += `<extensions>`;
        if (pt.heartRate !== undefined || pt.cadence !== undefined || pt.temperature !== undefined) {
          gpx += `<gpxtrkx:TrackPointExtension>`;
          if (pt.heartRate !== undefined) {
            gpx += `<gpxtrkx:hr>${pt.heartRate}</gpxtrkx:hr>`;
          }
          if (pt.cadence !== undefined) {
            gpx += `<gpxtrkx:cad>${pt.cadence}</gpxtrkx:cad>`;
          }
          if (pt.temperature !== undefined) {
            gpx += `<gpxtrkx:atemp>${pt.temperature}</gpxtrkx:atemp>`;
          }
          gpx += `</gpxtrkx:TrackPointExtension>`;
        }
        if (pt.power !== undefined) {
          gpx += `<power>${pt.power}</power>`;
        }
        gpx += `</extensions>`;
      }
      gpx += `</trkpt>\n`;
    });

    gpx += `    </trkseg>
  </trk>\n`;
  }

  gpx += `</gpx>`;
  return gpx;
}

const getChildByLocalName = (parent: Element, localName: string): Element | undefined => {
  return Array.from(parent.children).find((c) => c.localName.toLowerCase() === localName.toLowerCase());
};

const getDescendantByLocalName = (el: Element, localName: string): Element | undefined => {
  const all = el.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName.toLowerCase() === localName.toLowerCase()) {
      return all[i] as Element;
    }
  }
  return undefined;
};

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
  const allNodes = Array.from(xmlDoc.getElementsByTagName("*"));
  const wptNodes = allNodes.filter((n) => n.localName.toLowerCase() === "wpt");

  for (let i = 0; i < wptNodes.length; i++) {
    const node = wptNodes[i] as Element;
    const latAttr = node.getAttribute("lat");
    const lonAttr = node.getAttribute("lon");

    if (latAttr && lonAttr) {
      const lat = parseFloat(latAttr);
      const lng = parseFloat(lonAttr);
      
      const nameNode = getChildByLocalName(node, "name");
      const descNode = getChildByLocalName(node, "desc") || getChildByLocalName(node, "cmt");
      const symNode = getChildByLocalName(node, "sym");

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
  const trkptNodes = allNodes.filter((n) => n.localName.toLowerCase() === "trkpt");
  for (let i = 0; i < trkptNodes.length; i++) {
    const node = trkptNodes[i] as Element;
    const latAttr = node.getAttribute("lat");
    const lonAttr = node.getAttribute("lon");

    if (latAttr && lonAttr) {
      const lat = parseFloat(latAttr);
      const lng = parseFloat(lonAttr);
      
      const eleNode = getChildByLocalName(node, "ele");
      const elevation = eleNode && eleNode.textContent ? parseFloat(eleNode.textContent) : undefined;

      const timeNode = getChildByLocalName(node, "time");
      const time = timeNode && timeNode.textContent ? timeNode.textContent.trim() : undefined;

      // Extract sensor extensions recursively (namespace-agnostic)
      const hrNode = getDescendantByLocalName(node, "hr");
      const heartRate = hrNode && hrNode.textContent ? Math.round(parseFloat(hrNode.textContent)) : undefined;

      const cadNode = getDescendantByLocalName(node, "cad");
      const cadence = cadNode && cadNode.textContent ? Math.round(parseFloat(cadNode.textContent)) : undefined;

      const pwrNode = getDescendantByLocalName(node, "power");
      const power = pwrNode && pwrNode.textContent ? Math.round(parseFloat(pwrNode.textContent)) : undefined;

      const tempNode = getDescendantByLocalName(node, "atemp") || getDescendantByLocalName(node, "temp");
      const temperature = tempNode && tempNode.textContent ? Math.round(parseFloat(tempNode.textContent)) : undefined;

      const speedNode = getDescendantByLocalName(node, "speed");
      const speed = speedNode && speedNode.textContent ? parseFloat(speedNode.textContent) : undefined;

      routePoints.push({
        lat,
        lng,
        elevation,
        time,
        heartRate,
        cadence,
        power,
        temperature,
        speed,
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
