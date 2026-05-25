// Hook for managing Track Library, Multi-Route Drawing, Waypoints, LocalStorage, and Merge/Split Operations
import { useState, useCallback, useMemo, useEffect } from "react";
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

export interface Track {
  id: string;
  name: string;
  points: RoutePoint[];
  waypoints: Waypoint[];
  visible: boolean;
  color: string;
}

const DEFAULT_TRACK_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"];

export function useRoutePlanner() {
  // 1. Initial State from LocalStorage
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem("summit_tracks");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load tracks from localStorage:", e);
      return [];
    }
  });

  const [activeTrackId, setActiveTrackId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("summit_active_track_id");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [snapToTrail, setSnapToTrail] = useState(true);
  const [loading, setLoading] = useState(false);

  // 2. Persist to LocalStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("summit_tracks", JSON.stringify(tracks));
    } catch (e) {
      console.error("Failed to save tracks to localStorage:", e);
    }
  }, [tracks]);

  useEffect(() => {
    try {
      localStorage.setItem("summit_active_track_id", JSON.stringify(activeTrackId));
    } catch (e) {
      console.error("Failed to save activeTrackId to localStorage:", e);
    }
  }, [activeTrackId]);

  // 3. Derived active track values
  const activeTrack = useMemo(() => {
    return tracks.find((t) => t.id === activeTrackId) || null;
  }, [tracks, activeTrackId]);

  const activePoints = useMemo(() => {
    return activeTrack ? activeTrack.points : [];
  }, [activeTrack]);

  const activeWaypoints = useMemo(() => {
    return activeTrack ? activeTrack.waypoints : [];
  }, [activeTrack]);

  const activeRouteName = useMemo(() => {
    return activeTrack ? activeTrack.name : "";
  }, [activeTrack]);

  const distance = useMemo(() => {
    if (activePoints.length === 0) return 0;
    return activePoints[activePoints.length - 1].distance;
  }, [activePoints]);

  const { ascent, descent } = useMemo(() => {
    const elevations = activePoints.map((p) => p.elevation);
    return calculateElevationGainLoss(elevations);
  }, [activePoints]);

  // 4. API Calls
  const fetchElevations = useCallback(async (coords: [number, number][]): Promise<number[]> => {
    if (coords.length === 0) return [];
    try {
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
      return coords.map(() => 0);
    }
  }, []);

  const fetchOSRMRoute = useCallback(
    async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=geojson&overview=full`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("OSRM router error");
        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const routeDist = data.routes[0].distance / 1000; // route distance in km
          const straightDist = calculateHaversineDistance(start, end);

          // If the router forces a massive detour (more than 2.5x the straight line),
          // it means minor trails are unroutable in their system. Fall back to straight line!
          if (routeDist > straightDist * 2.5) {
            console.warn("OSRM route is a massive detour. Falling back to straight line for minor trails.");
            return [start, end];
          }

          const coords = data.routes[0].geometry.coordinates;
          return coords.map((c: number[]) => [c[1], c[0]]);
        }
        return [start, end];
      } catch (error) {
        console.error("OSRM routing failed, falling back to straight line:", error);
        return [start, end];
      }
    },
    []
  );

  // 5. Track Management Core operations
  const createNewTrack = useCallback((name: string = "Nueva Ruta de Aventura") => {
    const color = DEFAULT_TRACK_COLORS[tracks.length % DEFAULT_TRACK_COLORS.length];
    const newTrack: Track = {
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      points: [],
      waypoints: [],
      visible: true,
      color,
    };
    setTracks((prev) => [...prev, newTrack]);
    setActiveTrackId(newTrack.id);
    return newTrack.id;
  }, [tracks.length]);

  const setRouteName = useCallback((name: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === activeTrackId ? { ...t, name } : t))
    );
  }, [activeTrackId]);

  const deleteTrack = useCallback((id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setActiveTrackId((prevActive) => (prevActive === id ? null : prevActive));
  }, []);

  const toggleTrackVisibility = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t))
    );
  }, []);

  const setTrackColor = useCallback((id: string, color: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, color } : t))
    );
  }, []);

  // 6. Draw/Points operations (Targeting active track)
  const addPoint = useCallback(
    async (lat: number, lng: number) => {
      if (!isDrawing) return;

      let currentActiveId = activeTrackId;
      // Proactively create a track if drawing with no active track
      if (!currentActiveId) {
        currentActiveId = createNewTrack();
      }

      setLoading(true);
      try {


        // Async side effects:
        const currentTrack = tracks.find((t) => t.id === currentActiveId);
        const pts = currentTrack ? currentTrack.points : [];
        const lastPoint = pts.length > 0 ? pts[pts.length - 1] : null;

        if (!lastPoint) {
          const [elev] = await fetchElevations([[lat, lng]]);
          const newPoint: RoutePoint = {
            lat,
            lng,
            elevation: elev ?? 0,
            distance: 0,
          };
          setTracks((prev) =>
            prev.map((t) => (t.id === currentActiveId ? { ...t, points: [newPoint] } : t))
          );
        } else {
          let segmentCoords: [number, number][] = [];

          if (snapToTrail) {
            segmentCoords = await fetchOSRMRoute([lastPoint.lat, lastPoint.lng], [lat, lng]);
            if (segmentCoords.length > 0) {
              segmentCoords[0] = [lastPoint.lat, lastPoint.lng];
              segmentCoords[segmentCoords.length - 1] = [lat, lng];
            } else {
              segmentCoords = [[lastPoint.lat, lastPoint.lng], [lat, lng]];
            }
          } else {
            segmentCoords = [[lastPoint.lat, lastPoint.lng], [lat, lng]];
          }

          const newCoordsToQuery = segmentCoords.slice(1);
          const elevations = await fetchElevations(newCoordsToQuery);

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

          setTracks((prev) =>
            prev.map((t) =>
              t.id === currentActiveId ? { ...t, points: [...t.points, ...newRoutePoints] } : t
            )
          );
        }
      } catch (err) {
        console.error("Failed to add route point:", err);
      } finally {
        setLoading(false);
      }
    },
    [isDrawing, activeTrackId, createNewTrack, tracks, snapToTrail, fetchElevations, fetchOSRMRoute]
  );

  const removeLastPoint = useCallback(() => {
    if (!activeTrackId) return;
    setTracks((prev) =>
      prev.map((t) =>
        t.id === activeTrackId ? { ...t, points: t.points.slice(0, -1) } : t
      )
    );
  }, [activeTrackId]);

  const clearRoute = useCallback(() => {
    if (!activeTrackId) return;
    setTracks((prev) =>
      prev.map((t) => (t.id === activeTrackId ? { ...t, points: [] } : t))
    );
  }, [activeTrackId]);

  // 7. Waypoints (linked to active track)
  const addWaypoint = useCallback((wpt: Omit<Waypoint, "id">) => {
    let currentActiveId = activeTrackId;
    if (!currentActiveId) {
      currentActiveId = createNewTrack("Puntos Importados");
    }

    const newWpt: Waypoint = {
      ...wpt,
      id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setTracks((prev) =>
      prev.map((t) =>
        t.id === currentActiveId ? { ...t, waypoints: [...t.waypoints, newWpt] } : t
      )
    );
  }, [activeTrackId, createNewTrack]);

  const updateWaypoint = useCallback((id: string, fields: Partial<Waypoint>) => {
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.map((w) => (w.id === id ? { ...w, ...fields } : w)),
      }))
    );
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.filter((w) => w.id !== id),
      }))
    );
  }, []);

  // 8. Import
  const importRouteData = useCallback(
    async (name: string, importedPoints: { lat: number; lng: number; elevation?: number }[], importedWpts: Waypoint[]) => {
      setLoading(true);
      try {
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

        // Create new track in library
        const color = DEFAULT_TRACK_COLORS[tracks.length % DEFAULT_TRACK_COLORS.length];
        const newTrack: Track = {
          id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name || `Ruta ${tracks.length + 1}`,
          points: finalPoints,
          waypoints: importedWpts,
          visible: true,
          color,
        };

        setTracks((prev) => [...prev, newTrack]);
        setActiveTrackId(newTrack.id);
      } catch (err) {
        console.error("Error importing GPX data:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchElevations, tracks.length]
  );

  // 9. ADVANCED: Merge Selected Tracks
  const mergeTracks = useCallback((trackIds: string[], mergedName: string = "Ruta Fusionada") => {
    const selectedTracks = tracks.filter((t) => trackIds.includes(t.id));
    if (selectedTracks.length < 2) return;

    // Concatenate points and waypoints
    let finalPoints: RoutePoint[] = [];
    let finalWaypoints: Waypoint[] = [];
    let cumulativeDist = 0;

    selectedTracks.forEach((t) => {
      // Waypoints concatenation
      finalWaypoints = [...finalWaypoints, ...t.waypoints.map(w => ({
        ...w,
        id: `merged-wpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))];

      // Points integration with gap calculation
      t.points.forEach((pt, ptIdx) => {
        if (finalPoints.length > 0 && ptIdx === 0) {
          // Calculate distance gap between last track point and first point of next track
          const prevPt = finalPoints[finalPoints.length - 1];
          const gap = calculateHaversineDistance([prevPt.lat, prevPt.lng], [pt.lat, pt.lng]);
          cumulativeDist += gap;
        } else if (ptIdx > 0) {
          const prevPt = t.points[ptIdx - 1];
          const step = calculateHaversineDistance([prevPt.lat, prevPt.lng], [pt.lat, pt.lng]);
          cumulativeDist += step;
        }

        finalPoints.push({
          lat: pt.lat,
          lng: pt.lng,
          elevation: pt.elevation,
          distance: cumulativeDist,
        });
      });
    });

    const color = DEFAULT_TRACK_COLORS[tracks.length % DEFAULT_TRACK_COLORS.length];
    const newTrack: Track = {
      id: `track-merged-${Date.now()}`,
      name: mergedName,
      points: finalPoints,
      waypoints: finalWaypoints,
      visible: true,
      color,
    };

    setTracks((prev) => [...prev, newTrack]);
    setActiveTrackId(newTrack.id);
  }, [tracks]);

  // 10. ADVANCED: Split Active Track at Point Index
  const splitTrack = useCallback((trackId: string, pointIndex: number) => {
    const targetTrack = tracks.find((t) => t.id === trackId);
    if (!targetTrack || targetTrack.points.length < 3) return;
    if (pointIndex <= 0 || pointIndex >= targetTrack.points.length - 1) return;

    // Split points
    const pointsPart1 = targetTrack.points.slice(0, pointIndex + 1);
    const rawPointsPart2 = targetTrack.points.slice(pointIndex);

    // Recalculate distance for Part 2 (making it start at 0)
    const pointsPart2: RoutePoint[] = [];
    let cumulativeDist = 0;
    rawPointsPart2.forEach((pt, idx) => {
      if (idx > 0) {
        const prev = rawPointsPart2[idx - 1];
        cumulativeDist += calculateHaversineDistance([prev.lat, prev.lng], [pt.lat, pt.lng]);
      }
      pointsPart2.push({
        lat: pt.lat,
        lng: pt.lng,
        elevation: pt.elevation,
        distance: cumulativeDist,
      });
    });

    // Smart Waypoint Distribution based on proximity to track segments
    const wptsPart1: Waypoint[] = [];
    const wptsPart2: Waypoint[] = [];

    targetTrack.waypoints.forEach((w) => {
      // Find closest point in Part 1 vs Part 2
      let minDistance1 = Infinity;
      pointsPart1.forEach((pt) => {
        const d = calculateHaversineDistance([pt.lat, pt.lng], [w.lat, w.lng]);
        if (d < minDistance1) minDistance1 = d;
      });

      let minDistance2 = Infinity;
      pointsPart2.forEach((pt) => {
        const d = calculateHaversineDistance([pt.lat, pt.lng], [w.lat, w.lng]);
        if (d < minDistance2) minDistance2 = d;
      });

      if (minDistance1 <= minDistance2) {
        wptsPart1.push(w);
      } else {
        wptsPart2.push(w);
      }
    });

    // Create both parts
    const id1 = `track-split-p1-${Date.now()}`;
    const id2 = `track-split-p2-${Date.now()}`;

    const track1: Track = {
      id: id1,
      name: `${targetTrack.name} (Parte 1)`,
      points: pointsPart1,
      waypoints: wptsPart1,
      visible: true,
      color: targetTrack.color,
    };

    const track2: Track = {
      id: id2,
      name: `${targetTrack.name} (Parte 2)`,
      points: pointsPart2,
      waypoints: wptsPart2,
      visible: true,
      color: DEFAULT_TRACK_COLORS[(DEFAULT_TRACK_COLORS.indexOf(targetTrack.color) + 2) % DEFAULT_TRACK_COLORS.length],
    };

    // Remove original track, insert two split tracks
    setTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== trackId);
      return [...filtered, track1, track2];
    });

    // Set first part as active
    setActiveTrackId(id1);
  }, [tracks]);

  return {
    routeName: activeRouteName,
    setRouteName,
    points: activePoints,
    waypoints: activeWaypoints,
    tracks,
    setTracks,
    activeTrackId,
    setActiveTrackId,
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
    
    // Multi-track additions
    createNewTrack,
    deleteTrack,
    toggleTrackVisibility,
    setTrackColor,
    mergeTracks,
    splitTrack,
  };
}
