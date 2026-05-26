import type { RoutePoint, Waypoint, Track } from "../hooks/useRoutePlanner";
import { calculateHaversineDistance } from "./geoUtils";

/**
 * Parses a GeoJSON string into points and waypoints compatible with SummitGPS
 */
export function parseGeoJSON(text: string): { trackName: string; points: RoutePoint[]; waypoints: Waypoint[] } {
  const data = JSON.parse(text);
  let trackName = "Ruta GeoJSON Importada";
  const points: RoutePoint[] = [];
  const waypoints: Waypoint[] = [];

  const processCoordinates = (coordinates: any[]) => {
    let cumulativeDist = 0;
    coordinates.forEach((coord: any, idx: number) => {
      const lng = coord[0];
      const lat = coord[1];
      const elevation = coord[2] ?? 0;

      if (idx > 0) {
        const prev = coordinates[idx - 1];
        cumulativeDist += calculateHaversineDistance([prev[1], prev[0]], [lat, lng]);
      }

      points.push({
        lat,
        lng,
        elevation,
        distance: cumulativeDist,
      });
    });
  };

  const processFeature = (feature: any) => {
    if (!feature || !feature.geometry) return;
    
    const geomType = feature.geometry.type;
    const props = feature.properties || {};

    if (props.name) {
      trackName = props.name;
    }

    if (geomType === "LineString") {
      processCoordinates(feature.geometry.coordinates);
    } else if (geomType === "MultiLineString") {
      // Flatten all line segments
      feature.geometry.coordinates.forEach((line: any[]) => {
        processCoordinates(line);
      });
    } else if (geomType === "Point") {
      const coord = feature.geometry.coordinates;
      waypoints.push({
        id: `wpt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: props.name || "Punto de Interés",
        lat: coord[1],
        lng: coord[0],
        icon: props.icon || "mountain",
        note: props.note || props.description || "",
        color: props.color || "#10b981",
        groupId: "default",
      });
    }
  };

  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    data.features.forEach(processFeature);
  } else if (data.type === "Feature") {
    processFeature(data);
  } else if (data.type === "LineString") {
    processCoordinates(data.coordinates);
  }

  return { trackName, points, waypoints };
}

/**
 * Exports a Track and its waypoints into standard GeoJSON string
 */
export function exportToGeoJSON(track: Track): string {
  const features: any[] = [];

  // 1. Add Track LineString Feature
  if (track.points.length > 0) {
    const coords = track.points.map(pt => [pt.lng, pt.lat, pt.elevation]);
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
      properties: {
        name: track.name,
        color: track.color,
        type: "route",
      },
    });
  }

  // 2. Add Waypoint Point Features
  if (track.waypoints && track.waypoints.length > 0) {
    track.waypoints.forEach(wpt => {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [wpt.lng, wpt.lat],
        },
        properties: {
          name: wpt.name,
          note: wpt.note,
          icon: wpt.icon,
          color: wpt.color,
          type: "waypoint",
        },
      });
    });
  }

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  return JSON.stringify(geojson, null, 2);
}
