// Hook for managing Track Library, Multi-Route Drawing, Waypoints, LocalStorage, and Merge/Split Operations
import { useState, useCallback, useMemo, useEffect } from "react";
import { calculateHaversineDistance, calculateElevationGainLoss } from "../utils/geoUtils";
import { supabase, isSupabaseConfigured } from "../utils/supabaseClient";

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
  groupId: string;      // Associated challenge folder
  completed?: boolean;  // Challenge milestone completed status
  image?: string;       // Picture URL (optional)
  link?: string;        // Information URL (optional)
}

export interface WaypointGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  visible: boolean;
  image?: string; // Cover photo URL
}

export const LANDSCAPE_IMAGES = [
  { id: "peaks", name: "Alta Montaña", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80" },
  { id: "mountain", name: "Montaña", url: "https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80" },
  { id: "forest", name: "Bosques y Senderos", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80" },
  { id: "camp", name: "Refugio y Campamento", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80" },
  { id: "lake", name: "Lagos y Ríos", url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80" },
  { id: "sunset", name: "Vistas y Atardecer", url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=400&q=80" },
  { id: "snow", name: "Glaciar e Invierno", url: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=400&q=80" },
  { id: "canyon", name: "Ruta Rústica", url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80" }
];

export interface Track {
  id: string;
  name: string;
  points: RoutePoint[];
  waypoints: Waypoint[];
  visible: boolean;
  color: string;
}

const DEFAULT_TRACK_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"];

export function useRoutePlanner(user: any | null = null) {
  // Waypoint Groups / Challenges State
  const [waypointGroups, setWaypointGroups] = useState<WaypointGroup[]>(() => {
    try {
      const saved = localStorage.getItem("summit_waypoint_groups");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load waypoint groups:", e);
    }
    return [
      {
        id: "default",
        name: "Mis Marcadores",
        description: "Marcadores generales y marcas personales del mapa.",
        color: "#10b981",
        visible: true,
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
      },
    ];
  });

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

  const [clickSegments, setClickSegments] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem("summit_click_segments");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [snapToTrail, setSnapToTrail] = useState(true);
  const [loading, setLoading] = useState(false);

  // 2. Persist to LocalStorage on change ONLY if in Guest Mode
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem("summit_waypoint_groups", JSON.stringify(waypointGroups));
    } catch (e) {
      console.error("Failed to save waypoint groups to localStorage:", e);
    }
  }, [waypointGroups, user]);

  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem("summit_click_segments", JSON.stringify(clickSegments));
    } catch (e) {
      console.error("Failed to save click segments to localStorage:", e);
    }
  }, [clickSegments, user]);

  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem("summit_tracks", JSON.stringify(tracks));
    } catch (e) {
      console.error("Failed to save tracks to localStorage:", e);
    }
  }, [tracks, user]);

  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem("summit_active_track_id", JSON.stringify(activeTrackId));
    } catch (e) {
      console.error("Failed to save activeTrackId to localStorage:", e);
    }
  }, [activeTrackId, user]);

  // Load data reactively when user changes (Cloud or Guest Mode)
  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!user) {
        // Reset states to LocalStorage
        try {
          const savedGroups = localStorage.getItem("summit_waypoint_groups");
          if (savedGroups) {
            setWaypointGroups(JSON.parse(savedGroups));
          } else {
            setWaypointGroups([
              {
                id: "default",
                name: "Mis Marcadores",
                description: "Marcadores generales y marcas personales del mapa.",
                color: "#10b981",
                visible: true,
                image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
              },
            ]);
          }

          const savedTracks = localStorage.getItem("summit_tracks");
          setTracks(savedTracks ? JSON.parse(savedTracks) : []);

          const savedActiveId = localStorage.getItem("summit_active_track_id");
          setActiveTrackId(savedActiveId ? JSON.parse(savedActiveId) : null);

          const savedClickSegments = localStorage.getItem("summit_click_segments");
          setClickSegments(savedClickSegments ? JSON.parse(savedClickSegments) : {});
        } catch (e) {
          console.error("Failed to load local data:", e);
        }
        return;
      }

      if (!isSupabaseConfigured) return;

      setLoading(true);
      try {
        // 1. Fetch waypoint groups
        const { data: dbGroups, error: groupsError } = await supabase
          .from("waypoint_groups")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (groupsError) throw groupsError;

        let groups = dbGroups || [];

        // Seed default folder in DB if user has none
        if (groups.length === 0) {
          const defaultGroup = {
            id: "default",
            user_id: user.id,
            name: "Mis Marcadores",
            description: "Marcadores generales y marcas personales del mapa.",
            color: "#10b981",
            visible: true,
            image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
          };
          const { error: insertErr } = await supabase
            .from("waypoint_groups")
            .insert(defaultGroup);

          if (!insertErr) {
            groups = [defaultGroup];
          } else {
            console.error("Failed to seed default group in Supabase:", insertErr);
          }
        }

        // 2. Fetch tracks
        const { data: dbTracks, error: tracksError } = await supabase
          .from("tracks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (tracksError) throw tracksError;

        // 3. Fetch waypoints
        const { data: dbWaypoints, error: waypointsError } = await supabase
          .from("waypoints")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (waypointsError) throw waypointsError;

        if (!active) return;

        // Map waypoints into tracks
        const mappedGroups: WaypointGroup[] = groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description || "",
          color: g.color,
          visible: g.visible !== false,
          image: g.image || undefined,
        }));

        const mappedTracks: Track[] = (dbTracks || []).map((t: any) => {
          const trackWpts = (dbWaypoints || [])
            .filter((w: any) => w.track_id === t.id)
            .map((w: any) => ({
              id: w.id,
              name: w.name,
              lat: w.lat,
              lng: w.lng,
              icon: w.icon,
              note: w.note || "",
              color: w.color,
              groupId: w.group_id || "default",
              completed: w.completed || false,
              image: w.image || undefined,
              link: w.link || undefined,
            }));

          return {
            id: t.id,
            name: t.name,
            points: Array.isArray(t.points) ? t.points : [],
            waypoints: trackWpts,
            visible: t.visible !== false,
            color: t.color,
          };
        });

        setWaypointGroups(mappedGroups);
        setTracks(mappedTracks);

        // Select active track
        const savedActiveId = localStorage.getItem("summit_active_track_id");
        let parsedActiveId = null;
        try {
          if (savedActiveId) parsedActiveId = JSON.parse(savedActiveId);
        } catch {}

        if (parsedActiveId && mappedTracks.some((t) => t.id === parsedActiveId)) {
          setActiveTrackId(parsedActiveId);
        } else if (mappedTracks.length > 0) {
          setActiveTrackId(mappedTracks[0].id);
        } else {
          setActiveTrackId(null);
        }

        // Clear click segments for DB tracks
        setClickSegments({});
      } catch (err) {
        console.error("Failed to load user data from Supabase:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [user]);

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
          const routeDist = data.routes[0].distance / 1000;
          const straightDist = calculateHaversineDistance(start, end);

          if (routeDist > straightDist * 2.5) {
            return [start, end];
          }

          const coords = data.routes[0].geometry.coordinates;
          return coords.map((c: number[]) => [c[1], c[0]]);
        }
        return [start, end];
      } catch (error) {
        return [start, end];
      }
    },
    []
  );

  const fetchHikingRoute = useCallback(
    async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
      try {
        const url = `https://brouter.de/brouter?lonlats=${start[1]},${start[0]}|${end[1]},${end[0]}&profile=hiking&alternativeidx=0&format=geojson`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Brouter network error");
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const coords = data.features[0].geometry.coordinates;
          const routeCoords: [number, number][] = coords.map((c: number[]) => [c[1], c[0]]);
          
          let routeDist = 0;
          for (let i = 1; i < routeCoords.length; i++) {
            routeDist += calculateHaversineDistance(routeCoords[i - 1], routeCoords[i]);
          }
          const straightDist = calculateHaversineDistance(start, end);
          
          if (routeDist > straightDist * 2.5) {
            console.warn("Brouter route is a massive detour, trying OSRM.");
            return fetchOSRMRoute(start, end);
          }
          
          return routeCoords;
        }
        return fetchOSRMRoute(start, end);
      } catch (error) {
        console.warn("Brouter routing failed, trying OSRM fallback:", error);
        return fetchOSRMRoute(start, end);
      }
    },
    [fetchOSRMRoute]
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

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").insert({
        id: newTrack.id,
        user_id: user.id,
        name: newTrack.name,
        points: newTrack.points,
        visible: newTrack.visible,
        color: newTrack.color,
      }).then(({ error }) => {
        if (error) console.error("Failed to insert track into Supabase:", error);
      });
    }

    return newTrack.id;
  }, [tracks.length, user]);

  const setRouteName = useCallback((name: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === activeTrackId ? { ...t, name } : t))
    );

    if (user && activeTrackId && isSupabaseConfigured) {
      supabase.from("tracks").update({ name }).eq("id", activeTrackId).then(({ error }) => {
        if (error) console.error("Failed to update track name in Supabase:", error);
      });
    }
  }, [activeTrackId, user]);

  const deleteTrack = useCallback((id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setActiveTrackId((prevActive) => (prevActive === id ? null : prevActive));

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete track from Supabase:", error);
      });
    }
  }, [user]);

  const toggleTrackVisibility = useCallback((id: string) => {
    let updatedVisible = false;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          updatedVisible = !t.visible;
          return { ...t, visible: updatedVisible };
        }
        return t;
      })
    );

    if (user && isSupabaseConfigured) {
      const target = tracks.find((t) => t.id === id);
      if (target) {
        supabase.from("tracks").update({ visible: !target.visible }).eq("id", id).then(({ error }) => {
          if (error) console.error("Failed to toggle track visibility in Supabase:", error);
        });
      }
    }
  }, [tracks, user]);

  const setTrackColor = useCallback((id: string, color: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, color } : t))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").update({ color }).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to set track color in Supabase:", error);
      });
    }
  }, [user]);

  // 6. Draw/Points operations (Targeting active track)
  const addPoint = useCallback(
    async (lat: number, lng: number) => {
      if (!isDrawing) return;

      let currentActiveId = activeTrackId;
      if (!currentActiveId) {
        currentActiveId = createNewTrack();
      }

      setLoading(true);
      try {
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
          setClickSegments((prev) => ({
            ...prev,
            [currentActiveId!]: [...(prev[currentActiveId!] || []), 1],
          }));

          if (user && isSupabaseConfigured) {
            supabase.from("tracks").update({ points: [newPoint] }).eq("id", currentActiveId).then(({ error }) => {
              if (error) console.error("Failed to sync first point to Supabase:", error);
            });
          }
        } else {
          let segmentCoords: [number, number][] = [];

          if (snapToTrail) {
            segmentCoords = await fetchHikingRoute([lastPoint.lat, lastPoint.lng], [lat, lng]);
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

          const finalPoints = [...pts, ...newRoutePoints];
          setTracks((prev) =>
            prev.map((t) =>
              t.id === currentActiveId ? { ...t, points: finalPoints } : t
            )
          );
          setClickSegments((prev) => ({
            ...prev,
            [currentActiveId!]: [...(prev[currentActiveId!] || []), newRoutePoints.length],
          }));

          if (user && isSupabaseConfigured) {
            supabase.from("tracks").update({ points: finalPoints }).eq("id", currentActiveId).then(({ error }) => {
              if (error) console.error("Failed to sync points to Supabase:", error);
            });
          }
        }
      } catch (err) {
        console.error("Failed to add route point:", err);
      } finally {
        setLoading(false);
      }
    },
    [isDrawing, activeTrackId, createNewTrack, tracks, snapToTrail, fetchElevations, fetchHikingRoute, user]
  );

  const removeLastPoint = useCallback(() => {
    if (!activeTrackId) return;
    const segments = clickSegments[activeTrackId] || [];
    let size = 1;
    if (segments.length > 0) {
      size = segments[segments.length - 1];
    }

    setTracks((prev) =>
      prev.map((t) =>
        t.id === activeTrackId ? { ...t, points: t.points.slice(0, -size) } : t
      )
    );

    if (segments.length > 0) {
      setClickSegments((prev) => ({
        ...prev,
        [activeTrackId]: segments.slice(0, -1),
      }));
    }

    if (user && isSupabaseConfigured) {
      const targetTrack = tracks.find((t) => t.id === activeTrackId);
      if (targetTrack) {
        const remainingPoints = targetTrack.points.slice(0, -size);
        supabase.from("tracks").update({ points: remainingPoints }).eq("id", activeTrackId).then(({ error }) => {
          if (error) console.error("Failed to sync points removal to Supabase:", error);
        });
      }
    }
  }, [activeTrackId, clickSegments, tracks, user]);

  const clearRoute = useCallback(() => {
    if (!activeTrackId) return;
    setTracks((prev) =>
      prev.map((t) => (t.id === activeTrackId ? { ...t, points: [] } : t))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").update({ points: [] }).eq("id", activeTrackId).then(({ error }) => {
        if (error) console.error("Failed to clear points in Supabase:", error);
      });
    }
  }, [activeTrackId, user]);

  // 7. Waypoints (linked to active track)
  const addWaypoint = useCallback((wpt: Omit<Waypoint, "id">) => {
    let currentActiveId = activeTrackId;
    if (!currentActiveId) {
      currentActiveId = createNewTrack("Puntos Importados");
    }

    const newWpt: Waypoint = {
      ...wpt,
      groupId: wpt.groupId || "default",
      completed: wpt.completed || false,
      id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setTracks((prev) =>
      prev.map((t) =>
        t.id === currentActiveId ? { ...t, waypoints: [...t.waypoints, newWpt] } : t
      )
    );

    if (user && isSupabaseConfigured) {
      supabase.from("waypoints").insert({
        id: newWpt.id,
        user_id: user.id,
        track_id: currentActiveId,
        name: newWpt.name,
        lat: newWpt.lat,
        lng: newWpt.lng,
        icon: newWpt.icon,
        note: newWpt.note,
        color: newWpt.color,
        group_id: newWpt.groupId === "default" ? null : newWpt.groupId,
        completed: newWpt.completed,
        image: newWpt.image || null,
        link: newWpt.link || null,
      }).then(({ error }) => {
        if (error) console.error("Failed to insert waypoint into Supabase:", error);
      });
    }
  }, [activeTrackId, createNewTrack, user]);

  const updateWaypoint = useCallback((id: string, fields: Partial<Waypoint>) => {
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.map((w) => (w.id === id ? { ...w, ...fields } : w)),
      }))
    );

    if (user && isSupabaseConfigured) {
      const dbFields: any = {};
      if (fields.name !== undefined) dbFields.name = fields.name;
      if (fields.lat !== undefined) dbFields.lat = fields.lat;
      if (fields.lng !== undefined) dbFields.lng = fields.lng;
      if (fields.icon !== undefined) dbFields.icon = fields.icon;
      if (fields.note !== undefined) dbFields.note = fields.note;
      if (fields.color !== undefined) dbFields.color = fields.color;
      if (fields.groupId !== undefined) dbFields.group_id = fields.groupId === "default" ? null : fields.groupId;
      if (fields.completed !== undefined) dbFields.completed = fields.completed;
      if (fields.image !== undefined) dbFields.image = fields.image || null;
      if (fields.link !== undefined) dbFields.link = fields.link || null;

      supabase.from("waypoints").update(dbFields).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to update waypoint in Supabase:", error);
      });
    }
  }, [user]);

  const removeWaypoint = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.filter((w) => w.id !== id),
      }))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("waypoints").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete waypoint from Supabase:", error);
      });
    }
  }, [user]);

  // 7.2 Waypoint Groups CRUD methods
  const addWaypointGroup = useCallback((group: Omit<WaypointGroup, "id"> & { id?: string }) => {
    const newGroup: WaypointGroup = {
      ...group,
      id: group.id || `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setWaypointGroups((prev) => [...prev, newGroup]);

    if (user && isSupabaseConfigured) {
      supabase.from("waypoint_groups").insert({
        id: newGroup.id,
        user_id: user.id,
        name: newGroup.name,
        description: newGroup.description,
        color: newGroup.color,
        visible: newGroup.visible,
        image: newGroup.image || null,
      }).then(({ error }) => {
        if (error) console.error("Failed to insert waypoint group into Supabase:", error);
      });
    }
  }, [user]);

  const updateWaypointGroup = useCallback((id: string, fields: Partial<WaypointGroup>) => {
    setWaypointGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...fields } : g))
    );

    if (user && isSupabaseConfigured) {
      const dbFields: any = {};
      if (fields.name !== undefined) dbFields.name = fields.name;
      if (fields.description !== undefined) dbFields.description = fields.description;
      if (fields.color !== undefined) dbFields.color = fields.color;
      if (fields.visible !== undefined) dbFields.visible = fields.visible;
      if (fields.image !== undefined) dbFields.image = fields.image || null;

      supabase.from("waypoint_groups").update(dbFields).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to update waypoint group in Supabase:", error);
      });
    }
  }, [user]);

  const deleteWaypointGroup = useCallback((id: string) => {
    if (id === "default") return;
    
    setWaypointGroups((prev) => prev.filter((g) => g.id !== id));
    
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.map((w) => (w.groupId === id ? { ...w, groupId: "default" } : w)),
      }))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("waypoint_groups").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete waypoint group from Supabase:", error);
      });
      supabase.from("waypoints").update({ group_id: null }).eq("group_id", id).then(({ error }) => {
        if (error) console.error("Failed to reassign group waypoints in Supabase:", error);
      });
    }
  }, [user]);

  const toggleWaypointGroupVisibility = useCallback((id: string) => {
    let updatedVisible = false;
    setWaypointGroups((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          updatedVisible = !g.visible;
          return { ...g, visible: updatedVisible };
        }
        return g;
      })
    );

    if (user && isSupabaseConfigured) {
      const target = waypointGroups.find((g) => g.id === id);
      if (target) {
        supabase.from("waypoint_groups").update({ visible: !target.visible }).eq("id", id).then(({ error }) => {
          if (error) console.error("Failed to toggle waypoint group visibility in Supabase:", error);
        });
      }
    }
  }, [waypointGroups, user]);

  const toggleWaypointCompleted = useCallback((id: string) => {
    let updatedCompleted = false;
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.map((w) => {
          if (w.id === id) {
            updatedCompleted = !w.completed;
            return { ...w, completed: updatedCompleted };
          }
          return w;
        }),
      }))
    );

    if (user && isSupabaseConfigured) {
      let currentStatus = false;
      for (const t of tracks) {
        const found = t.waypoints.find((w) => w.id === id);
        if (found) {
          currentStatus = !found.completed;
          break;
        }
      }
      supabase.from("waypoints").update({ completed: currentStatus }).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to toggle waypoint completed in Supabase:", error);
      });
    }
  }, [tracks, user]);

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

        const color = DEFAULT_TRACK_COLORS[tracks.length % DEFAULT_TRACK_COLORS.length];
        const newTrack: Track = {
          id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name || `Ruta ${tracks.length + 1}`,
          points: finalPoints,
          waypoints: importedWpts.map((w) => ({ ...w, groupId: w.groupId || "default" })),
          visible: true,
          color,
        };

        setTracks((prev) => [...prev, newTrack]);
        setActiveTrackId(newTrack.id);

        if (user && isSupabaseConfigured) {
          const { error: trackError } = await supabase.from("tracks").insert({
            id: newTrack.id,
            user_id: user.id,
            name: newTrack.name,
            points: newTrack.points,
            visible: newTrack.visible,
            color: newTrack.color,
          });
          if (trackError) throw trackError;

          if (newTrack.waypoints.length > 0) {
            const dbWaypoints = newTrack.waypoints.map((w) => ({
              id: w.id,
              user_id: user.id,
              track_id: newTrack.id,
              name: w.name,
              lat: w.lat,
              lng: w.lng,
              icon: w.icon,
              note: w.note,
              color: w.color,
              group_id: w.groupId === "default" ? null : w.groupId,
              completed: w.completed || false,
              image: w.image || null,
              link: w.link || null,
            }));
            const { error: wptsError } = await supabase.from("waypoints").insert(dbWaypoints);
            if (wptsError) throw wptsError;
          }
        }
      } catch (err) {
        console.error("Error importing GPX data:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchElevations, tracks.length, user]
  );

  // 9. ADVANCED: Merge Selected Tracks
  const mergeTracks = useCallback(
    async (trackIds: string[], mergedName: string = "Ruta Fusionada") => {
      const selectedTracks = tracks.filter((t) => trackIds.includes(t.id));
      if (selectedTracks.length < 2) return;

      let finalPoints: RoutePoint[] = [];
      let finalWaypoints: Waypoint[] = [];
      let cumulativeDist = 0;

      selectedTracks.forEach((t) => {
        finalWaypoints = [
          ...finalWaypoints,
          ...t.waypoints.map((w) => ({
            ...w,
            id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          })),
        ];

        t.points.forEach((pt, ptIdx) => {
          if (finalPoints.length > 0 && ptIdx === 0) {
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
        id: `track-merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: mergedName,
        points: finalPoints,
        waypoints: finalWaypoints,
        visible: true,
        color,
      };

      setTracks((prev) => [...prev, newTrack]);
      setActiveTrackId(newTrack.id);

      if (user && isSupabaseConfigured) {
        try {
          const { error: trackError } = await supabase.from("tracks").insert({
            id: newTrack.id,
            user_id: user.id,
            name: newTrack.name,
            points: newTrack.points,
            visible: newTrack.visible,
            color: newTrack.color,
          });
          if (trackError) throw trackError;

          if (newTrack.waypoints.length > 0) {
            const dbWaypoints = newTrack.waypoints.map((w) => ({
              id: w.id,
              user_id: user.id,
              track_id: newTrack.id,
              name: w.name,
              lat: w.lat,
              lng: w.lng,
              icon: w.icon,
              note: w.note,
              color: w.color,
              group_id: w.groupId === "default" ? null : w.groupId,
              completed: w.completed || false,
              image: w.image || null,
              link: w.link || null,
            }));
            const { error: wptsError } = await supabase.from("waypoints").insert(dbWaypoints);
            if (wptsError) throw wptsError;
          }
        } catch (err) {
          console.error("Failed to save merged track to Supabase:", err);
        }
      }
    },
    [tracks, user]
  );

  // 10. ADVANCED: Split Active Track at Point Index
  const splitTrack = useCallback(
    async (trackId: string, pointIndex: number) => {
      const targetTrack = tracks.find((t) => t.id === trackId);
      if (!targetTrack || targetTrack.points.length < 3) return;
      if (pointIndex <= 0 || pointIndex >= targetTrack.points.length - 1) return;

      const pointsPart1 = targetTrack.points.slice(0, pointIndex + 1);
      const rawPointsPart2 = targetTrack.points.slice(pointIndex);

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

      const wptsPart1: Waypoint[] = [];
      const wptsPart2: Waypoint[] = [];

      targetTrack.waypoints.forEach((w) => {
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

      setTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== trackId);
        return [...filtered, track1, track2];
      });

      setActiveTrackId(id1);

      if (user && isSupabaseConfigured) {
        try {
          const { error: deleteError } = await supabase.from("tracks").delete().eq("id", trackId);
          if (deleteError) throw deleteError;

          const { error: t1Error } = await supabase.from("tracks").insert({
            id: track1.id,
            user_id: user.id,
            name: track1.name,
            points: track1.points,
            visible: track1.visible,
            color: track1.color,
          });
          if (t1Error) throw t1Error;

          const { error: t2Error } = await supabase.from("tracks").insert({
            id: track2.id,
            user_id: user.id,
            name: track2.name,
            points: track2.points,
            visible: track2.visible,
            color: track2.color,
          });
          if (t2Error) throw t2Error;

          if (track1.waypoints.length > 0) {
            const dbWpts1 = track1.waypoints.map((w) => ({
              id: w.id,
              user_id: user.id,
              track_id: track1.id,
              name: w.name,
              lat: w.lat,
              lng: w.lng,
              icon: w.icon,
              note: w.note,
              color: w.color,
              group_id: w.groupId === "default" ? null : w.groupId,
              completed: w.completed || false,
              image: w.image || null,
              link: w.link || null,
            }));
            const { error: wpts1Error } = await supabase.from("waypoints").insert(dbWpts1);
            if (wpts1Error) throw wpts1Error;
          }

          if (track2.waypoints.length > 0) {
            const dbWpts2 = track2.waypoints.map((w) => ({
              id: w.id,
              user_id: user.id,
              track_id: track2.id,
              name: w.name,
              lat: w.lat,
              lng: w.lng,
              icon: w.icon,
              note: w.note,
              color: w.color,
              group_id: w.groupId === "default" ? null : w.groupId,
              completed: w.completed || false,
              image: w.image || null,
              link: w.link || null,
            }));
            const { error: wpts2Error } = await supabase.from("waypoints").insert(dbWpts2);
            if (wpts2Error) throw wpts2Error;
          }
        } catch (err) {
          console.error("Failed to split track in Supabase:", err);
        }
      }
    },
    [tracks, user]
  );

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

    // Waypoint Group additions
    waypointGroups,
    setWaypointGroups,
    addWaypointGroup,
    deleteWaypointGroup,
    updateWaypointGroup,
    toggleWaypointGroupVisibility,
    toggleWaypointCompleted,
  };
}
