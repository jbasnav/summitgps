// Hook for managing Route Planning, Waypoints, and Elevation Profiling
import { useState, useCallback, useMemo } from "react";
import { calculateHaversineDistance, calculateElevationGainLoss } from "../utils/geoUtils";

export interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number; // Cumulative distance in km
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  note: string;
  color: string;
}

export function useRoutePlanner() {
  const [routeName, setRouteName] = useState("Mi Ruta de Aventura");
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [snapToTrail, setSnapToTrail] = useState(true);
  const [loading, setLoading] = useState(false);

  // Stats calculation
  const distance = useMemo(() => {
    if (points.length === 0) return 0;
    return points[points.length - 1].distance;
  }, [points]);

  const { ascent, descent } = useMemo(() => {
    const elevations = points.map((p) => p.elevation);
    return calculateElevationGainLoss(elevations);
  }, [points]);

  // Batch fetch elevations from Open-Meteo
  const fetchElevations = useCallback(async (coords: [number, number][]): Promise<number[]> => {
    if (coords.length === 0) return [];
    try {
      // Open-Meteo limit is high, but let's keep it safe. Batch requests if needed.
      const lats = coords.map((c) => c[0]).join(",");
      const lngs = coords.map((c) => c[1]).join(",");
      const response = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`
      );
      if (!response.ok) throw new Error("Elevation API error");
      const data = await response.json();
      return data.elevation || coords.map(() => 0);
    } catch (error) {
      console.error("Failed to fetch elevations:", error);
      // Fallback to 0 if API fails
      return coords.map(() => 0);
    }
  }, []);

  // Fetch routing path from OSRM
  const fetchOSRMRoute = useCallback(
    async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=geojson&overview=full`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("OSRM router error");
        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates; // Array of [lng, lat]
          // Map to [lat, lng]
          return coords.map((c: number[]) => [c[1], c[0]]);
        }
        // Fallback to straight line
        return [start, end];
      } catch (error) {
        console.error("OSRM routing failed, falling back to straight line:", error);
        return [start, end];
      }
    },
    []
  );

  // Add a coordinate point to the route
  const addPoint = useCallback(
    async (lat: number, lng: number) => {
      if (!isDrawing) return;

      setLoading(true);
      try {
        const lastPoint = points.length > 0 ? points[points.length - 1] : null;

        if (!lastPoint) {
          // First point: just get elevation
          const [elev] = await fetchElevations([[lat, lng]]);
          const newPoint: RoutePoint = {
            lat,
            lng,
            elevation: elev ?? 0,
            distance: 0,
          };
          setPoints([newPoint]);
        } else {
          let segmentCoords: [number, number][] = [];

          if (snapToTrail) {
            // Fetch trail path from OSRM
            segmentCoords = await fetchOSRMRoute([lastPoint.lat, lastPoint.lng], [lat, lng]);
            // Ensure first and last coords match lastPoint and new point exactly to avoid gaps
            if (segmentCoords.length > 0) {
              segmentCoords[0] = [lastPoint.lat, lastPoint.lng];
              segmentCoords[segmentCoords.length - 1] = [lat, lng];
            } else {
              segmentCoords = [[lastPoint.lat, lastPoint.lng], [lat, lng]];
            }
          } else {
            // Straight line
            segmentCoords = [[lastPoint.lat, lastPoint.lng], [lat, lng]];
          }

          // Fetch elevations in batch for all new points (excluding the first one which we already have)
          const newCoordsToQuery = segmentCoords.slice(1);
          const elevations = await fetchElevations(newCoordsToQuery);

          // Build route points
          let cumulativeDist = lastPoint.distance;
          const newRoutePoints: RoutePoint[] = [];

          for (let i = 0; i < newCoordsToQuery.length; i++) {
            const prevCoord = i === 0 ? lastPoint : newRoutePoints[i - 1];
            const currCoord = newCoordsToQuery[i];
            const distDiff = calculateHaversineDistance(
              [prevCoord.lat, prevCoord.lng],
              [currCoord[0], currCoord[1]]
            );
            cumulativeDist += distDiff;

            newRoutePoints.push({
              lat: currCoord[0],
              lng: currCoord[1],
              elevation: elevations[i] ?? 0,
              distance: cumulativeDist,
            });
          }

          setPoints((prev) => [...prev, ...newRoutePoints]);
        }
      } catch (err) {
        console.error("Failed to add route point:", err);
      } finally {
        setLoading(false);
      }
    },
    [isDrawing, points, snapToTrail, fetchElevations, fetchOSRMRoute]
  );

  // Undo last point/segment
  const removeLastPoint = useCallback(() => {
    setPoints((prev) => {
      if (prev.length <= 1) return [];
      
      // If we snapped to trail, we might have multiple points added for a single click.
      // However, we want to undo the last click. Let's find the second to last main control point
      // Or simply remove the last point to be safe. To make undo feel natural, let's remove the last element.
      // A more advanced undo could track "click segments". Let's do simple element removal first:
      return prev.slice(0, -1);
    });
  }, []);

  // Clear route
  const clearRoute = useCallback(() => {
    setPoints([]);
  }, []);

  // Set imported route points
  const importRouteData = useCallback(
    async (name: string, importedPoints: { lat: number; lng: number; elevation?: number }[], importedWpts: Waypoint[]) => {
      setRouteName(name);
      setWaypoints(importedWpts);

      if (importedPoints.length === 0) {
        setPoints([]);
        return;
      }

      setLoading(true);
      try {
        // Find which points lack elevation
        const coordsWithoutElevation: { index: number; coord: [number, number] }[] = [];
        importedPoints.forEach((pt, idx) => {
          if (pt.elevation === undefined) {
            coordsWithoutElevation.push({ index: idx, coord: [pt.lat, pt.lng] });
          }
        });

        let fetchedElevations: number[] = [];
        if (coordsWithoutElevation.length > 0) {
          fetchedElevations = await fetchElevations(coordsWithoutElevation.map((c) => c.coord));
        }

        // Reconstruct points with full distances and elevations
        let cumulativeDist = 0;
        const finalPoints: RoutePoint[] = [];

        let elevationIdx = 0;
        for (let i = 0; i < importedPoints.length; i++) {
          const pt = importedPoints[i];
          let elev = pt.elevation;

          if (elev === undefined) {
            elev = fetchedElevations[elevationIdx++] ?? 0;
          }

          if (i > 0) {
            const prev = finalPoints[i - 1];
            cumulativeDist += calculateHaversineDistance([prev.lat, prev.lng], [pt.lat, pt.lng]);
          }

          finalPoints.push({
            lat: pt.lat,
            lng: pt.lng,
            elevation: elev,
            distance: cumulativeDist,
          });
        }

        setPoints(finalPoints);
      } catch (err) {
        console.error("Error importing GPX data:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchElevations]
  );

  // Add Waypoint
  const addWaypoint = useCallback((wpt: Omit<Waypoint, "id">) => {
    const newWpt: Waypoint = {
      ...wpt,
      id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setWaypoints((prev) => [...prev, newWpt]);
  }, []);

  // Update Waypoint
  const updateWaypoint = useCallback((id: string, fields: Partial<Waypoint>) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...fields } : w)));
  }, []);

  // Remove Waypoint
  const removeWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return {
    routeName,
    setRouteName,
    points,
    setPoints,
    waypoints,
    setWaypoints,
    isDrawing,
    setIsDrawing,
    snapToTrail,
    setSnapToTrail,
    distance,
    ascent,
    descent,
    loading,
    addPoint,
    removeLastPoint,
    clearRoute,
    importRouteData,
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
  };
}
