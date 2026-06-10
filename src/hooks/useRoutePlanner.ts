// Hook for managing Track Library, Multi-Route Drawing, Waypoints, LocalStorage, and Merge/Split Operations
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { calculateHaversineDistance, calculateElevationGainLoss } from "../utils/geoUtils";
import { simplifyTrack } from "../utils/simplify";
import { smoothTrackPoints, removeTrackOutliers } from "../utils/trackCleaner";
import { supabase, isSupabaseConfigured } from "../utils/supabaseClient";

export type RoutingProfile = 'hike' | 'cycle' | 'drive' | 'straight';

export interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number; // Cumulative distance in km
  surface?: string; // Optional surface type (asfalto, grava, tierra, desconocido)
  time?: string; // Optional timestamp ISO 8601 string
  heartRate?: number; // Heart rate in bpm (ppm)
  cadence?: number; // Cadence in rpm
  power?: number; // Power in Watts (vatios)
  temperature?: number; // Temperature in Celsius (°C)
  speed?: number; // Instantaneous speed in m/s
}


function extractSurfaceFromTags(tagsStr: string): string {
  if (!tagsStr) return "desconocido";
  
  // Search for surface=value
  const surfaceMatch = tagsStr.match(/surface=(\w+)/);
  if (surfaceMatch) {
    const val = surfaceMatch[1].toLowerCase();
    if (["asphalt", "paved", "concrete", "tarmac"].includes(val)) return "asfalto";
    if (["gravel", "fine_gravel", "pebbles", "compacted"].includes(val)) return "grava";
    if (["dirt", "ground", "earth", "mud", "grass", "unpaved", "sand"].includes(val)) return "tierra";
    return val;
  }

  // Fallbacks based on highway
  if (tagsStr.includes("highway=track") || tagsStr.includes("highway=path") || tagsStr.includes("highway=footway")) {
    return "tierra";
  }
  if (tagsStr.includes("highway=primary") || tagsStr.includes("highway=secondary") || tagsStr.includes("highway=tertiary") || tagsStr.includes("highway=residential")) {
    return "asfalto";
  }

  return "desconocido";
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
  elevation?: number;   // Auto altitude (optional)
}

export interface WaypointGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  visible: boolean;
  image?: string;
  type?: "folder" | "challenge";
  isPublic?: boolean;
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

export interface RouteCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  visible: boolean;
  image?: string;
}

export interface AreaPoint {
  lat: number;
  lng: number;
}

export interface Area {
  id: string;
  name: string;
  points: AreaPoint[];
  color: string;
  visible: boolean;
  areaM2: number;
  perimeterM: number;
  collectionId?: string;
}

export interface Track {
  id: string;
  name: string;
  points: RoutePoint[];
  waypoints: Waypoint[];
  visible: boolean;
  color: string;
  collectionId?: string;
  isPublic?: boolean;
}

export interface HistoryState {
  tracks: Track[];
  areas: Area[];
}

const DEFAULT_TRACK_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"];

export function useRoutePlanner(user: any | null = null) {
  // Route Collections State
  const [routeCollections, setRouteCollections] = useState<RouteCollection[]>(() => {
    try {
      const saved = localStorage.getItem("summit_route_collections");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load route collections:", e);
    }
    return [
      {
        id: "default",
        name: "Mis Rutas",
        description: "Colección principal para tus rutas trazadas y subidas.",
        color: "#10b981",
        visible: true,
        image: "https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80",
      },
    ];
  });

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
        type: "folder" as const,
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
      },
    ];
  });

  // 1. Initial State from LocalStorage
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem("summit_tracks");
      const parsedTracks: Track[] = saved ? JSON.parse(saved) : [];
      if (!parsedTracks.some((t) => t.id === "waypoints-global-track")) {
        parsedTracks.push({
          id: "waypoints-global-track",
          name: "Marcadores Globales",
          points: [],
          waypoints: [],
          visible: true,
          color: "#10b981",
        });
      }
      return parsedTracks;
    } catch (e) {
      console.error("Failed to load tracks from localStorage:", e);
      return [
        {
          id: "waypoints-global-track",
          name: "Marcadores Globales",
          points: [],
          waypoints: [],
          visible: true,
          color: "#10b981",
        }
      ];
    }
  });

  const [activeTrackId, setActiveTrackId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("summit_active_track_id");
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed === "waypoints-global-track") return null;
      return parsed;
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

  const [areas, setAreas] = useState<Area[]>(() => {
    try {
      const saved = localStorage.getItem("summit_areas");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const syncQueueRef = useRef<Promise<any>>(Promise.resolve());

  const pushToHistory = useCallback((currentTracks: Track[], currentAreas: Area[]) => {
    const clonedTracks = JSON.parse(JSON.stringify(currentTracks));
    const clonedAreas = JSON.parse(JSON.stringify(currentAreas));
    setUndoStack((prev) => {
      const next = [...prev, { tracks: clonedTracks, areas: clonedAreas }];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const [isDrawing, setIsDrawing] = useState(false);
  const [routingProfile, setRoutingProfile] = useState<RoutingProfile>(() => {
    return (localStorage.getItem('summit_routing_profile') as RoutingProfile) || 'hike';
  });
  const snapToTrail = routingProfile !== 'straight';
  const setSnapToTrail = useCallback((snap: boolean) => {
    setRoutingProfile(snap ? 'hike' : 'straight');
  }, []);
  const [loading, setLoading] = useState(false);

  // 2. Persist to LocalStorage as write-through cache (both Guest and Logged-in modes)
  // This ensures localStorage always has a backup copy of the latest state,
  // preventing data loss on refresh/logout. Prefixed with user.id when logged in
  // to prevent data leaks into guest sessions.
  useEffect(() => {
    if (loading) return;
    try {
      const key = user ? `summit_route_collections_${user.id}` : "summit_route_collections";
      localStorage.setItem(key, JSON.stringify(routeCollections));
    } catch (e) {
      console.error("Failed to save route collections to localStorage:", e);
    }
  }, [routeCollections, user, loading]);

  useEffect(() => {
    if (loading) return;
    try {
      const key = user ? `summit_waypoint_groups_${user.id}` : "summit_waypoint_groups";
      localStorage.setItem(key, JSON.stringify(waypointGroups));
    } catch (e) {
      console.error("Failed to save waypoint groups to localStorage:", e);
    }
  }, [waypointGroups, user, loading]);

  useEffect(() => {
    if (loading) return;
    try {
      const key = user ? `summit_click_segments_${user.id}` : "summit_click_segments";
      localStorage.setItem(key, JSON.stringify(clickSegments));
    } catch (e) {
      console.error("Failed to save click segments to localStorage:", e);
    }
  }, [clickSegments, user, loading]);

  useEffect(() => {
    if (loading) return;
    try {
      const key = user ? `summit_tracks_${user.id}` : "summit_tracks";
      localStorage.setItem(key, JSON.stringify(tracks));
    } catch (e) {
      console.error("Failed to save tracks to localStorage:", e);
    }
  }, [tracks, user, loading]);

  useEffect(() => {
    if (loading) return;
    try {
      const key = user ? `summit_active_track_id_${user.id}` : "summit_active_track_id";
      localStorage.setItem(key, JSON.stringify(activeTrackId));
    } catch (e) {
      console.error("Failed to save activeTrackId to localStorage:", e);
    }
  }, [activeTrackId, user, loading]);

  useEffect(() => {
    if (loading) return;
    try {
      const key = user ? `summit_areas_${user.id}` : "summit_areas";
      localStorage.setItem(key, JSON.stringify(areas));
    } catch (e) {
      console.error("Failed to save areas to localStorage:", e);
    }
  }, [areas, user, loading]);

  useEffect(() => {
    localStorage.setItem('summit_routing_profile', routingProfile);
  }, [routingProfile]);

  // Flush all data to localStorage synchronously before the page unloads (covers Vite HMR and tab close)
  useEffect(() => {
    const flush = () => {
      try {
        const suffix = user ? `_${user.id}` : "";
        localStorage.setItem(`summit_tracks${suffix}`, JSON.stringify(tracks));
        localStorage.setItem(`summit_areas${suffix}`, JSON.stringify(areas));
        localStorage.setItem(`summit_active_track_id${suffix}`, JSON.stringify(activeTrackId));
        localStorage.setItem(`summit_route_collections${suffix}`, JSON.stringify(routeCollections));
        localStorage.setItem(`summit_waypoint_groups${suffix}`, JSON.stringify(waypointGroups));
      } catch (e) {
        console.error("Failed to flush data on unload:", e);
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [tracks, areas, activeTrackId, routeCollections, waypointGroups, user]);

  // Load data reactively when user changes (Cloud or Guest Mode)
  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!user) {
        // Reset states to LocalStorage
        try {
          const savedCollections = localStorage.getItem("summit_route_collections");
          if (savedCollections) {
            setRouteCollections(JSON.parse(savedCollections));
          } else {
            setRouteCollections([
              {
                id: "default",
                name: "Mis Rutas",
                description: "Colección principal para tus rutas trazadas y subidas.",
                color: "#10b981",
                visible: true,
                image: "https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80",
              },
            ]);
          }

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
                type: "folder",
                image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
              },
            ]);
          }

          const savedTracks = localStorage.getItem("summit_tracks");
          const parsedTracks: Track[] = savedTracks ? JSON.parse(savedTracks) : [];
          if (!parsedTracks.some((t) => t.id === "waypoints-global-track")) {
            parsedTracks.push({
              id: "waypoints-global-track",
              name: "Marcadores Globales",
              points: [],
              waypoints: [],
              visible: true,
              color: "#10b981",
            });
          }
          setTracks(parsedTracks);

          const savedActiveId = localStorage.getItem("summit_active_track_id");
          let parsedActiveId = null;
          try {
            if (savedActiveId) parsedActiveId = JSON.parse(savedActiveId);
          } catch {}
          if (parsedActiveId === "waypoints-global-track") parsedActiveId = null;
          if (parsedActiveId && parsedTracks.some((t) => t.id === parsedActiveId && t.id !== "waypoints-global-track")) {
            setActiveTrackId(parsedActiveId);
          } else {
            const firstRealTrack = parsedTracks.find((t) => t.id !== "waypoints-global-track");
            setActiveTrackId(firstRealTrack ? firstRealTrack.id : null);
          }

          const savedClickSegments = localStorage.getItem("summit_click_segments");
          setClickSegments(savedClickSegments ? JSON.parse(savedClickSegments) : {});

          const savedAreas = localStorage.getItem("summit_areas");
          setAreas(savedAreas ? JSON.parse(savedAreas) : []);
        } catch (e) {
          console.error("Failed to load local data:", e);
        }
        return;
      }

      if (!isSupabaseConfigured) return;

      setLoading(true);
      try {
        // Helper: fetch with fallback on error
        const safeFetch = async (table: string) => {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("user_id", user.id)
            .order("id", { ascending: true });
          if (error) console.error(`Supabase fetch ${table} error:`, error);
          return data || [];
        };

        // Helper: try localStorage fallback before seeding defaults
        const fromLocalStorage = (key: string) => {
          try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : [];
          } catch { return []; }
        };

        // 0. Fetch route collections
        let collections = await safeFetch("route_collections");
        if (collections.length === 0) {
          // Try localStorage before seeding
          const lsCollections = fromLocalStorage("summit_route_collections");
          if (lsCollections.length > 0) {
            // Sync localStorage data to Supabase
            for (const col of lsCollections) {
              await supabase.from("route_collections").upsert({ ...col, user_id: user.id }).then(({ error }) => {
                if (error) console.error("Failed to sync collection:", error);
              });
            }
            collections = lsCollections;
          } else {
            const defaultCollection = {
              id: "default",
              user_id: user.id,
              name: "Mis Rutas",
              description: "Colección principal para tus rutas trazadas y subidas.",
              color: "#10b981",
              visible: true,
              image: "https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80",
            };
            const { error: insertErr } = await supabase.from("route_collections").insert(defaultCollection);
            if (!insertErr) collections = [defaultCollection];
            else console.error("Failed to seed default collection:", insertErr);
          }
        }

        // 1. Fetch waypoint groups
        let groups = await safeFetch("waypoint_groups");
        if (groups.length === 0) {
          const lsGroups = fromLocalStorage("summit_waypoint_groups");
          if (lsGroups.length > 0) {
            for (const g of lsGroups) {
              // Map localStorage field names to Supabase column names
              await supabase.from("waypoint_groups").upsert({
                id: g.id,
                user_id: user.id,
                name: g.name,
                description: g.description || "",
                color: g.color,
                visible: g.visible !== false,
                image: g.image || null,
                type: g.type || "folder",
                is_public: g.isPublic || false,
              }).then(({ error }) => {
                if (error) console.error("Failed to sync group:", error);
              });
            }
            groups = lsGroups;
          } else {
            const defaultGroup = {
              id: "default",
              user_id: user.id,
              name: "Mis Marcadores",
              description: "Marcadores generales y marcas personales del mapa.",
              color: "#10b981",
              visible: true,
              type: "folder",
              image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
            };
            const { error: insertErr } = await supabase.from("waypoint_groups").insert(defaultGroup);
            if (!insertErr) groups = [defaultGroup];
            else console.error("Failed to seed default waypoint group:", insertErr);
          }
        }

        // 2. Fetch tracks
        const dbTracks = await safeFetch("tracks");

        // 3. Fetch waypoints
        const dbWaypoints = await safeFetch("waypoints");

        // 4. Fetch areas (table may not exist yet — safe fallback)
        let dbAreas: any[] = [];
        try {
          dbAreas = await safeFetch("areas");
        } catch (err) {
          console.warn("Could not load areas from Supabase:", err);
        }

        if (!active) return;

        // Map route collections (shared by both paths)
        const mappedCollections: RouteCollection[] = collections.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          color: c.color,
          visible: c.visible !== false,
          image: c.image || undefined,
        }));

        // Map waypoint groups — ensure type defaults to "folder" for any groups without it
        const mappedGroups: WaypointGroup[] = groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description || "",
          color: g.color,
          visible: g.visible !== false,
          image: g.image || undefined,
          type: (g.type as "folder" | "challenge") || "folder",
          isPublic: g.is_public || g.isPublic || false,
        }));

        // Declare final tracks at outer scope so activeTrackId logic can access it
        let finalTracks: Track[] = [];

        // === MIGRATION: Sync localStorage tracks/waypoints/areas to Supabase on first login ===
        const lsTracks: Track[] = fromLocalStorage("summit_tracks");
        const hasLocalData = lsTracks.length > 0 && lsTracks.some(
          (t: any) => t.id !== "waypoints-global-track" || (t.waypoints && t.waypoints.length > 0)
        );

        if (dbTracks.length === 0 && hasLocalData) {
          console.log("[SummitGPS] Migrating localStorage tracks/waypoints to Supabase...");

          for (const t of lsTracks) {
            const { error: trackErr } = await supabase.from("tracks").upsert({
              id: t.id,
              user_id: user.id,
              name: t.name,
              points: t.points || [],
              visible: t.visible !== false,
              color: t.color || "#10b981",
              collection_id: (t as any).collectionId || "default",
              is_public: (t as any).isPublic || false,
            });
            if (trackErr) console.error("Migration: failed to insert track:", trackErr);

            if (t.waypoints && t.waypoints.length > 0) {
              const dbWpts = t.waypoints.map((w: any) => ({
                id: w.id,
                user_id: user.id,
                track_id: t.id,
                name: w.name,
                lat: w.lat,
                lng: w.lng,
                icon: w.icon || "marker",
                note: w.note || "",
                color: w.color || "#10b981",
                group_id: w.groupId === "default" ? null : (w.groupId || null),
                completed: w.completed || false,
                image: w.image || null,
                link: w.link || null,
                elevation: w.elevation || null,
              }));
              const { error: wptsErr } = await supabase.from("waypoints").upsert(dbWpts);
              if (wptsErr) console.error("Migration: failed to insert waypoints:", wptsErr);
            }
          }

          finalTracks = [...lsTracks];
          if (!finalTracks.some(t => t.id === "waypoints-global-track")) {
            finalTracks.push({
              id: "waypoints-global-track",
              name: "Marcadores Globales",
              points: [],
              waypoints: [],
              visible: true,
              color: "#10b981",
            });
          }

          // Migrate areas too
          const lsAreas: Area[] = fromLocalStorage("summit_areas");
          if (lsAreas.length > 0) {
            for (const area of lsAreas) {
              await supabase.from("areas").upsert({
                id: area.id,
                user_id: user.id,
                name: area.name,
                points: area.points,
                color: area.color,
                visible: area.visible,
                area_m2: area.areaM2 || 0,
                perimeter_m: area.perimeterM || 0,
                collection_id: area.collectionId || null,
              }).then(({ error }) => {
                if (error) console.warn("Migration: failed to sync area:", error);
              });
            }
            setAreas(lsAreas);
          }

        } else {
          // Normal flow: use Supabase data
          const mappedDbAreas: Area[] = dbAreas.map((a: any) => ({
            id: a.id,
            name: a.name,
            points: Array.isArray(a.points) ? a.points : [],
            color: a.color,
            visible: a.visible !== false,
            areaM2: a.area_m2 || 0,
            perimeterM: a.perimeter_m || 0,
            collectionId: a.collection_id || undefined,
          }));

          const localUserAreas: Area[] = fromLocalStorage(`summit_areas_${user.id}`);
          let finalAreas = [...mappedDbAreas];
          for (const localA of localUserAreas) {
            const dbA = finalAreas.find(a => a.id === localA.id);
            if (!dbA) {
              finalAreas.push(localA);
              supabase.from("areas").upsert({
                id: localA.id,
                user_id: user.id,
                name: localA.name,
                points: localA.points,
                color: localA.color,
                visible: localA.visible,
                area_m2: localA.areaM2 || 0,
                perimeter_m: localA.perimeterM || 0,
                collection_id: localA.collectionId || null,
              }).then(({ error }) => {
                if (error) console.warn("Offline sync: failed to sync area:", error);
              });
            } else {
              const hasChanges = JSON.stringify(localA) !== JSON.stringify(dbA);
              if (hasChanges) {
                const idx = finalAreas.findIndex(a => a.id === localA.id);
                if (idx !== -1) {
                  finalAreas[idx] = localA;
                }
                supabase.from("areas").upsert({
                  id: localA.id,
                  user_id: user.id,
                  name: localA.name,
                  points: localA.points,
                  color: localA.color,
                  visible: localA.visible,
                  area_m2: localA.areaM2 || 0,
                  perimeter_m: localA.perimeterM || 0,
                  collection_id: localA.collectionId || null,
                }).then(({ error }) => {
                  if (error) console.warn("Offline sync: failed to update area:", error);
                });
              }
            }
          }

          if (finalAreas.length > 0) {
            setAreas(finalAreas);
          } else {
            const savedAreas = localStorage.getItem("summit_areas");
            if (savedAreas) {
              const parsedAreas: Area[] = JSON.parse(savedAreas);
              setAreas(parsedAreas);
              for (const area of parsedAreas) {
                supabase.from("areas").upsert({
                  id: area.id,
                  user_id: user.id,
                  name: area.name,
                  points: area.points,
                  color: area.color,
                  visible: area.visible,
                  area_m2: area.areaM2 || 0,
                  perimeter_m: area.perimeterM || 0,
                  collection_id: area.collectionId || null,
                }).then(({ error }) => {
                  if (error) console.warn("Failed to sync area to Supabase:", error);
                });
              }
            }
          }

          const mappedDbTracks: Track[] = (dbTracks || []).map((t: any) => {
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
                elevation: w.elevation || undefined,
              }));

            return {
              id: t.id,
              name: t.name,
              points: Array.isArray(t.points) ? t.points : [],
              waypoints: trackWpts,
              visible: t.visible !== false,
              color: t.color,
              collectionId: t.collection_id || "default",
              isPublic: t.is_public || false,
            };
          });

          const localUserTracks: Track[] = fromLocalStorage(`summit_tracks_${user.id}`);
          finalTracks = [...mappedDbTracks];

          for (const localT of localUserTracks) {
            const dbT = finalTracks.find(t => t.id === localT.id);
            if (!dbT) {
              finalTracks.push(localT);
              supabase.from("tracks").upsert({
                id: localT.id,
                user_id: user.id,
                name: localT.name,
                points: localT.points || [],
                visible: localT.visible !== false,
                color: localT.color || "#10b981",
                collection_id: localT.collectionId || "default",
                is_public: localT.isPublic || false,
              }).then(({ error }) => {
                if (error) console.error("Offline sync: failed to insert track:", error);
              });
              if (localT.waypoints && localT.waypoints.length > 0) {
                const dbWpts = localT.waypoints.map((w: any) => ({
                  id: w.id,
                  user_id: user.id,
                  track_id: localT.id,
                  name: w.name,
                  lat: w.lat,
                  lng: w.lng,
                  icon: w.icon || "marker",
                  note: w.note || "",
                  color: w.color || "#10b981",
                  group_id: w.groupId === "default" ? null : (w.groupId || null),
                  completed: w.completed || false,
                  image: w.image || null,
                  link: w.link || null,
                  elevation: w.elevation || null,
                }));
                supabase.from("waypoints").upsert(dbWpts).then(({ error }) => {
                  if (error) console.error("Offline sync: failed to insert waypoints:", error);
                });
              }
            } else {
              const hasChanges = JSON.stringify(localT) !== JSON.stringify(dbT);
              if (hasChanges) {
                const idx = finalTracks.findIndex(t => t.id === localT.id);
                if (idx !== -1) {
                  finalTracks[idx] = localT;
                }
                supabase.from("tracks").upsert({
                  id: localT.id,
                  user_id: user.id,
                  name: localT.name,
                  points: localT.points || [],
                  visible: localT.visible !== false,
                  color: localT.color || "#10b981",
                  collection_id: localT.collectionId || "default",
                  is_public: localT.isPublic || false,
                }).then(({ error }) => {
                  if (error) console.error("Offline sync: failed to update track:", error);
                });

                supabase.from("waypoints").delete().eq("track_id", localT.id).then(() => {
                  if (localT.waypoints && localT.waypoints.length > 0) {
                    const dbWpts = localT.waypoints.map((w: any) => ({
                      id: w.id,
                      user_id: user.id,
                      track_id: localT.id,
                      name: w.name,
                      lat: w.lat,
                      lng: w.lng,
                      icon: w.icon || "marker",
                      note: w.note || "",
                      color: w.color || "#10b981",
                      group_id: w.groupId === "default" ? null : (w.groupId || null),
                      completed: w.completed || false,
                      image: w.image || null,
                      link: w.link || null,
                      elevation: w.elevation || null,
                    }));
                    supabase.from("waypoints").upsert(dbWpts).then(({ error }) => {
                      if (error) console.error("Offline sync: failed to sync waypoints:", error);
                    });
                  }
                });
              }
            }
          }

          // Ensure waypoint global track exists
          if (!finalTracks.some((t) => t.id === "waypoints-global-track")) {
            const globalTrack = {
              id: "waypoints-global-track",
              name: "Marcadores Globales",
              points: [],
              waypoints: (dbWaypoints || [])
                .filter((w: any) => w.track_id === "waypoints-global-track")
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
                })),
              visible: true,
              color: "#10b981",
              collectionId: "default",
            };
            finalTracks.push(globalTrack);

            supabase.from("tracks").insert({
              id: globalTrack.id,
              user_id: user.id,
              name: globalTrack.name,
              points: globalTrack.points,
              visible: globalTrack.visible,
              color: globalTrack.color,
              collection_id: "default",
            }).then(({ error }) => {
              if (error) console.error("Failed to seed global track in Supabase:", error);
            });
          }
        }

        // Set state for all paths
        setRouteCollections(mappedCollections);
        setWaypointGroups(mappedGroups);
        setTracks(finalTracks);

        // Also fix any existing groups in Supabase that have NULL type
        for (const g of groups) {
          if (!g.type) {
            supabase.from("waypoint_groups").update({ type: "folder" }).eq("id", g.id).then(({ error }) => {
              if (error) console.warn("Failed to backfill group type:", error);
            });
          }
        }

        // Select active track
        const savedActiveId = localStorage.getItem("summit_active_track_id");
        let parsedActiveId = null;
        try {
          if (savedActiveId) parsedActiveId = JSON.parse(savedActiveId);
        } catch {}

        if (parsedActiveId === "waypoints-global-track") parsedActiveId = null;
        if (parsedActiveId && finalTracks.some((t) => t.id === parsedActiveId && t.id !== "waypoints-global-track")) {
          setActiveTrackId(parsedActiveId);
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
        const osrmProfileMap: Record<string, string> = { hike: 'foot', cycle: 'bicycle', drive: 'car' };
        const osrmProfile = osrmProfileMap[routingProfile] || 'foot';
        const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=geojson&overview=full`;
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
    [routingProfile]
  );

  // --- BRouter routing (fallback #1) ---
  const fetchBRouterRoute = useCallback(
    async (start: [number, number], end: [number, number]): Promise<[number, number, number?, string?][]> => {
      const brouterProfileMap: Record<string, string> = { hike: 'hiking-mountain', cycle: 'trekking', drive: 'car-fast' };
      const brouterProfile = brouterProfileMap[routingProfile] || 'hiking-mountain';
      const url = `https://brouter.de/brouter?lonlats=${start[1]},${start[0]}|${end[1]},${end[0]}&profile=${brouterProfile}&alternativeidx=0&format=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("BRouter network error");
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates;
        const messages = data.features[0].properties?.messages || [];
        
        const routeCoords: [number, number, number?, string?][] = coords.map((c: number[], idx: number) => {
          const msgLine = messages[idx + 1] || "";
          const surface = extractSurfaceFromTags(msgLine);
          return [c[1], c[0], c[2] || 0, surface];
        });
        return routeCoords;
      }
      throw new Error("BRouter returned no features");
    },
    [routingProfile]
  );

  // --- GraphHopper routing (primary engine — used by gpx.studio) ---
  const fetchGraphHopperRoute = useCallback(
    async (start: [number, number], end: [number, number]): Promise<[number, number, number?, string?][]> => {
      // GraphHopper API key: env var or localStorage
      const ghKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GRAPHHOPPER_KEY)
        || localStorage.getItem('graphhopper_api_key')
        || '';

      if (!ghKey) throw new Error("No GraphHopper API key configured");

      const ghProfileMap: Record<string, string> = { hike: 'foot', cycle: 'bike', drive: 'car' };
      const ghProfile = ghProfileMap[routingProfile] || 'foot';

      const url = `https://graphhopper.com/api/1/route`
        + `?point=${start[0]},${start[1]}`
        + `&point=${end[0]},${end[1]}`
        + `&profile=${ghProfile}`
        + `&points_encoded=false`
        + `&elevation=true`
        + `&instructions=false`
        + `&locale=es`
        + `&key=${ghKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`GraphHopper error ${response.status}: ${errBody}`);
      }
      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        const coords = path.points?.coordinates;
        if (!coords || coords.length === 0) throw new Error("GraphHopper returned empty coordinates");

        // Sanity check: reject absurd detours
        const routeDistKm = (path.distance || 0) / 1000;
        const straightDist = calculateHaversineDistance(start, end);
        if (routeDistKm > straightDist * 3) {
          throw new Error("GraphHopper route suspiciously long, trying fallback");
        }

        const routeCoords: [number, number, number?, string?][] = coords.map((c: number[]) => {
          // GraphHopper returns [lon, lat, elevation?]
          return [c[1], c[0], c[2] || 0, undefined];
        });
        return routeCoords;
      }
      throw new Error("GraphHopper returned no paths");
    },
    [routingProfile]
  );

  // --- Main routing chain: GraphHopper → BRouter → OSRM → straight line ---
  const fetchHikingRoute = useCallback(
    async (start: [number, number], end: [number, number]): Promise<[number, number, number?, string?][]> => {
      // 1) Try GraphHopper first (best trail detection, used by gpx.studio)
      try {
        const result = await fetchGraphHopperRoute(start, end);
        if (result.length > 1) return result;
      } catch (err) {
        console.warn("GraphHopper routing failed, trying BRouter fallback:", err);
      }

      // 2) Fallback to BRouter (free, no API key, good hiking profiles)
      try {
        const result = await fetchBRouterRoute(start, end);
        if (result.length > 1) return result;
      } catch (err) {
        console.warn("BRouter routing failed, trying OSRM fallback:", err);
      }

      // 3) Last resort: OSRM (basic foot routing, always available)
      try {
        const result = await fetchOSRMRoute(start, end);
        return result;
      } catch (err) {
        console.warn("OSRM routing also failed, falling back to straight line:", err);
      }

      // 4) Final fallback: straight line
      return [start, end];
    },
    [fetchGraphHopperRoute, fetchBRouterRoute, fetchOSRMRoute]
  );

  // 5. Track Management Core operations
  const createNewTrack = useCallback((name: string = "Nueva Ruta de Aventura", collectionId: string = "default") => {
    pushToHistory(tracks, areas);
    const color = DEFAULT_TRACK_COLORS[tracks.length % DEFAULT_TRACK_COLORS.length];
    const newTrack: Track = {
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      points: [],
      waypoints: [],
      visible: true,
      color,
      collectionId,
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
        collection_id: collectionId,
      }).then(({ error }) => {
        if (error) console.error("Failed to insert track into Supabase:", error);
      });
    }

    return newTrack.id;
  }, [tracks, areas, user, pushToHistory]);

  const setRouteName = useCallback((name: string) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => (t.id === activeTrackId ? { ...t, name } : t))
    );

    if (user && activeTrackId && isSupabaseConfigured) {
      supabase.from("tracks").update({ name }).eq("id", activeTrackId).then(({ error }) => {
        if (error) console.error("Failed to update track name in Supabase:", error);
      });
    }
  }, [activeTrackId, user, tracks, areas, pushToHistory]);

  const deleteTrack = useCallback((id: string) => {
    if (id === "waypoints-global-track") return;
    pushToHistory(tracks, areas);
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setActiveTrackId((prevActive) => (prevActive === id ? null : prevActive));

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete track from Supabase:", error);
      });
    }
  }, [user, tracks, areas, pushToHistory]);

  const deleteMultipleTracks = useCallback((ids: string[]) => {
    const idsToKeep = ids.filter((id) => id !== "waypoints-global-track");
    pushToHistory(tracks, areas);
    setTracks((prev) => prev.filter((t) => !idsToKeep.includes(t.id)));
    setActiveTrackId((prevActive) => (prevActive && idsToKeep.includes(prevActive) ? null : prevActive));

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").delete().in("id", idsToKeep).then(({ error }) => {
        if (error) console.error("Failed to delete tracks from Supabase:", error);
      });
    }
  }, [user, tracks, areas, pushToHistory]);

  const toggleTrackVisibility = useCallback((id: string) => {
    let updatedVisible = false;
    pushToHistory(tracks, areas);
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
  }, [tracks, user, areas, pushToHistory]);

  const toggleTrackPublic = useCallback((id: string) => {
    const target = tracks.find((t) => t.id === id);
    if (!target) return;
    const newVal = !target.isPublic;
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, isPublic: newVal } : t)));
    if (user && isSupabaseConfigured) {
      supabase.from("tracks").update({ is_public: newVal }).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to toggle track public in Supabase:", error);
      });
    }
  }, [tracks, user]);

  const toggleGroupPublic = useCallback((id: string) => {
    const target = waypointGroups.find((g) => g.id === id);
    if (!target) return;
    const newVal = !target.isPublic;
    setWaypointGroups((prev) => prev.map((g) => (g.id === id ? { ...g, isPublic: newVal } : g)));
    if (user && isSupabaseConfigured) {
      supabase.from("waypoint_groups").update({ is_public: newVal }).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to toggle group public in Supabase:", error);
      });
    }
  }, [waypointGroups, user]);

  const setTrackColor = useCallback((id: string, color: string) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, color } : t))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").update({ color }).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to set track color in Supabase:", error);
      });
    }
  }, [user, tracks, areas, pushToHistory]);

  // 6. Draw/Points operations (Targeting active track)
  const addPoint = useCallback(
    async (lat: number, lng: number) => {
      if (!isDrawing) return;

      let currentActiveId = activeTrackId;
      const isNewTrack = !currentActiveId;
      if (!currentActiveId) {
        currentActiveId = createNewTrack();
      }

      pushToHistory(tracks, areas);
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
            // Use upsert to handle the race condition where createNewTrack's INSERT
            // might not have completed yet when we try to update the points.
            const trackColor = DEFAULT_TRACK_COLORS[tracks.length % DEFAULT_TRACK_COLORS.length];
            supabase.from("tracks").upsert({
              id: currentActiveId,
              user_id: user.id,
              name: isNewTrack ? "Nueva Ruta de Aventura" : (currentTrack?.name ?? "Nueva Ruta de Aventura"),
              points: [newPoint],
              visible: true,
              color: currentTrack?.color ?? trackColor,
              collection_id: currentTrack?.collectionId ?? "default",
            }, { onConflict: "id" }).then(({ error }) => {
              if (error) console.error("Failed to upsert first point to Supabase:", error);
            });
          }
        } else {
          let segmentCoords: [number, number, number?, string?][] = [];

          if (routingProfile !== 'straight') {
            segmentCoords = await fetchHikingRoute([lastPoint.lat, lastPoint.lng], [lat, lng]);
            if (segmentCoords.length > 0) {
              segmentCoords[0] = [lastPoint.lat, lastPoint.lng, lastPoint.elevation, lastPoint.surface];
              segmentCoords[segmentCoords.length - 1] = [lat, lng];
            } else {
              segmentCoords = [[lastPoint.lat, lastPoint.lng], [lat, lng]];
            }
          } else {
            segmentCoords = [[lastPoint.lat, lastPoint.lng], [lat, lng]];
          }

          const newCoordsToQuery = segmentCoords.slice(1);
          const elevations = await fetchElevations(newCoordsToQuery.map(c => [c[0], c[1]]));

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

            let surface = currCoord[3];
            if (!surface) {
              if (routingProfile === 'hike') surface = 'tierra';
              else if (routingProfile === 'cycle') surface = 'grava';
              else if (routingProfile === 'drive') surface = 'asfalto';
              else surface = 'desconocido';
            }

            newRoutePoints.push({
              lat: currCoord[0],
              lng: currCoord[1],
              elevation: elevations[i] ?? currCoord[2] ?? 0,
              distance: cumulativeDist,
              surface,
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
    [isDrawing, activeTrackId, createNewTrack, tracks, areas, routingProfile, fetchElevations, fetchHikingRoute, user, pushToHistory]
  );

  const removeLastPoint = useCallback(() => {
    if (!activeTrackId) return;
    const segments = clickSegments[activeTrackId] || [];
    let size = 1;
    if (segments.length > 0) {
      size = segments[segments.length - 1];
    }

    pushToHistory(tracks, areas);
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
  }, [activeTrackId, clickSegments, tracks, areas, user, pushToHistory]);

  const clearRoute = useCallback(() => {
    if (!activeTrackId) return;
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => (t.id === activeTrackId ? { ...t, points: [] } : t))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").update({ points: [] }).eq("id", activeTrackId).then(({ error }) => {
        if (error) console.error("Failed to clear points in Supabase:", error);
      });
    }
  }, [activeTrackId, user, tracks, areas, pushToHistory]);

  // 7. Waypoints (linked to active track)
  const addWaypoint = useCallback((wpt: Omit<Waypoint, "id">) => {
    let currentActiveId = activeTrackId;
    if (!currentActiveId) {
      currentActiveId = "waypoints-global-track";
    }

    const newWpt: Waypoint = {
      ...wpt,
      groupId: wpt.groupId || "default",
      completed: wpt.completed || false,
      id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    pushToHistory(tracks, areas);
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
  }, [activeTrackId, user, tracks, areas, pushToHistory]);

  const addWaypointToMarkers = useCallback((wpt: Omit<Waypoint, "id">) => {
    const newWpt: Waypoint = {
      ...wpt,
      groupId: wpt.groupId || "default",
      completed: wpt.completed || false,
      id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === "waypoints-global-track" ? { ...t, waypoints: [...t.waypoints, newWpt] } : t
      )
    );
    if (user && isSupabaseConfigured) {
      supabase.from("waypoints").insert({
        id: newWpt.id,
        user_id: user.id,
        track_id: "waypoints-global-track",
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
  }, [user, tracks, areas, pushToHistory]);

  const addMultipleWaypoints = useCallback((wpts: Omit<Waypoint, "id">[], _trackName?: string) => {
    const currentActiveId = "waypoints-global-track";

    const newWpts: Waypoint[] = wpts.map((wpt, idx) => ({
      ...wpt,
      groupId: wpt.groupId || "default",
      completed: wpt.completed || false,
      id: `wpt-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === currentActiveId ? { ...t, waypoints: [...t.waypoints, ...newWpts] } : t
      )
    );

    if (user && isSupabaseConfigured) {
      const runDbOps = async () => {
        // Ensure global track exists in DB
        const { data: existingTrack } = await supabase
          .from("tracks")
          .select("id")
          .eq("id", currentActiveId)
          .single();

        if (!existingTrack) {
          await supabase.from("tracks").insert({
            id: currentActiveId,
            user_id: user.id,
            name: "Marcadores Globales",
            points: [],
            visible: true,
            color: "#10b981",
          });
        }

        const sbWpts = newWpts.map((w) => ({
          id: w.id,
          user_id: user.id,
          track_id: currentActiveId,
          name: w.name,
          lat: w.lat,
          lng: w.lng,
          icon: w.icon,
          note: w.note,
          color: w.color,
          group_id: w.groupId === "default" ? null : w.groupId,
          completed: w.completed,
          image: w.image || null,
          link: w.link || null,
        }));

        const { error: wptsError } = await supabase.from("waypoints").insert(sbWpts);
        if (wptsError) {
          console.error("Failed to insert waypoints into Supabase:", wptsError);
        }
      };
      runDbOps();
    }
  }, [user, tracks, areas, pushToHistory]);

  const updateWaypoint = useCallback((id: string, fields: Partial<Waypoint>) => {
    pushToHistory(tracks, areas);
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
  }, [user, tracks, areas, pushToHistory]);

  const addWaypointToTrack = useCallback((trackId: string, wpt: Omit<Waypoint, "id">) => {
    const newWpt: Waypoint = {
      ...wpt,
      id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      groupId: wpt.groupId || "default",
      completed: wpt.completed || false,
    };
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? { ...t, waypoints: [...t.waypoints, newWpt] } : t
      )
    );
    if (user && isSupabaseConfigured) {
      supabase.from("waypoints").insert({
        id: newWpt.id,
        name: newWpt.name,
        lat: newWpt.lat,
        lng: newWpt.lng,
        icon: newWpt.icon,
        note: newWpt.note || "",
        color: newWpt.color,
        group_id: newWpt.groupId === "default" ? null : newWpt.groupId,
        completed: newWpt.completed,
        elevation: (newWpt as any).elevation || null,
        link: newWpt.link || null,
        image: newWpt.image || null,
        track_id: trackId,
        user_id: user.id,
      }).then(({ error }) => {
        if (error) console.error("Failed to insert waypoint into track in Supabase:", error);
      });
    }
  }, [user, tracks, areas, pushToHistory]);

  const removeWaypoint = useCallback((id: string) => {
    pushToHistory(tracks, areas);
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
  }, [user, tracks, areas, pushToHistory]);

  const removeWaypoints = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    pushToHistory(tracks, areas);
    const idSet = new Set(ids);
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.filter((w) => !idSet.has(w.id)),
      }))
    );
    if (user && isSupabaseConfigured) {
      // Supabase .in() silently fails on large arrays — chunk into batches of 100
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { error } = await supabase.from("waypoints").delete().in("id", chunk);
        if (error) console.error(`Failed to bulk-delete waypoints chunk ${i}-${i + CHUNK}:`, error);
      }
    }
  }, [user, tracks, areas, pushToHistory]);

  // 7.2 Waypoint Groups CRUD methods
  const addWaypointGroup = useCallback(async (group: Omit<WaypointGroup, "id"> & { id?: string }) => {
    const newGroup: WaypointGroup = {
      ...group,
      id: group.id || `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setWaypointGroups((prev) => [...prev, newGroup]);

    if (user && isSupabaseConfigured) {
      const { error } = await supabase.from("waypoint_groups").insert({
        id: newGroup.id,
        user_id: user.id,
        name: newGroup.name,
        description: newGroup.description,
        color: newGroup.color,
        visible: newGroup.visible,
        image: newGroup.image || null,
        type: newGroup.type || "folder",
        is_public: newGroup.isPublic || false,
      });
      if (error) {
        console.error("Failed to insert waypoint group into Supabase:", error);
        throw error;
      }
    }
    return newGroup.id;
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
      if (fields.type !== undefined) dbFields.type = fields.type;
      if (fields.isPublic !== undefined) dbFields.is_public = fields.isPublic;

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

  // Community content fetching
  const fetchCommunityContent = useCallback(async () => {
    if (!isSupabaseConfigured) return { tracks: [], groups: [] };
    const [{ data: pubTracks }, { data: pubGroups }] = await Promise.all([
      supabase.from("tracks").select("*, profiles:user_id(display_name, avatar_url)").eq("is_public", true).neq("id", "waypoints-global-track").order("id", { ascending: false }).limit(100),
      supabase.from("waypoint_groups").select("*, profiles:user_id(display_name, avatar_url), waypoints(*)").eq("is_public", true).order("id", { ascending: false }).limit(100),
    ]);
    return { tracks: pubTracks || [], groups: pubGroups || [] };
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

        const color = DEFAULT_TRACK_COLORS[tracks.length % DEFAULT_TRACK_COLORS.length];
        const newTrack: Track = {
          id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name || `Ruta ${tracks.length + 1}`,
          points: finalPoints,
          waypoints: importedWpts.map((w, idx) => ({
            id: w.id || `wpt-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            name: w.name || `Marca ${idx + 1}`,
            lat: w.lat,
            lng: w.lng,
            icon: w.icon || "mountain",
            note: w.note || "",
            color: w.color || color,
            groupId: w.groupId || "default",
            completed: w.completed || false,
            image: w.image || undefined,
            link: w.link || undefined,
          })),
          visible: true,
          color,
          collectionId: "default",
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
            collection_id: "default",
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

      pushToHistory(tracks, areas);

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
    [tracks, areas, user, pushToHistory]
  );

  // 10. ADVANCED: Split Active Track at Point Index
  const splitTrack = useCallback(
    async (trackId: string, pointIndex: number) => {
      const targetTrack = tracks.find((t) => t.id === trackId);
      if (!targetTrack || targetTrack.points.length < 3) return;
      if (pointIndex <= 0 || pointIndex >= targetTrack.points.length - 1) return;

      pushToHistory(tracks, areas);

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
    [tracks, areas, user, pushToHistory]
  );

  // 9. Route Collections CRUD methods
  const addRouteCollection = useCallback(async (collection: Omit<RouteCollection, "id"> & { id?: string }) => {
    const newCollection: RouteCollection = {
      ...collection,
      id: collection.id || `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setRouteCollections((prev) => [...prev, newCollection]);

    // Mirror to waypoint groups
    const newGroup: WaypointGroup = {
      id: newCollection.id,
      name: newCollection.name,
      description: newCollection.description,
      color: newCollection.color,
      visible: newCollection.visible,
      image: newCollection.image,
    };
    setWaypointGroups((prev) => [...prev, newGroup]);

    if (user && isSupabaseConfigured) {
      const { error } = await supabase.from("route_collections").insert({
        id: newCollection.id,
        user_id: user.id,
        name: newCollection.name,
        description: newCollection.description,
        color: newCollection.color,
        visible: newCollection.visible,
        image: newCollection.image || null,
      });
      if (error) {
        console.error("Failed to insert route collection into Supabase:", error);
        throw error;
      }

      // Also mirror insertion in waypoint_groups
      const { error: groupErr } = await supabase.from("waypoint_groups").insert({
        id: newCollection.id,
        user_id: user.id,
        name: newCollection.name,
        description: newCollection.description,
        color: newCollection.color,
        visible: newCollection.visible,
        image: newCollection.image || null,
      });
      if (groupErr) {
        console.error("Failed to insert mirrored waypoint group into Supabase:", groupErr);
      }
    }
    return newCollection.id;
  }, [user]);

  const updateRouteCollection = useCallback((id: string, fields: Partial<RouteCollection>) => {
    setRouteCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...fields } : c))
    );

    // Mirror update to waypointGroups
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

      supabase.from("route_collections").update(dbFields).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to update route collection in Supabase:", error);
      });

      supabase.from("waypoint_groups").update(dbFields).eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to update mirrored waypoint group in Supabase:", error);
      });
    }
  }, [user]);

  const deleteRouteCollection = useCallback((id: string) => {
    if (id === "default") return;

    setRouteCollections((prev) => prev.filter((c) => c.id !== id));
    setWaypointGroups((prev) => prev.filter((g) => g.id !== id));

    // Safety move of routes inside it to "default"
    setTracks((prev) =>
      prev.map((t) => (t.collectionId === id ? { ...t, collectionId: "default" } : t))
    );

    // Safety move of waypoints to "default"
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        waypoints: t.waypoints.map((w) => (w.groupId === id ? { ...w, groupId: "default" } : w)),
      }))
    );

    // Safety move of areas inside it to undefined
    setAreas((prev) =>
      prev.map((a) => (a.collectionId === id ? { ...a, collectionId: undefined } : a))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("route_collections").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete route collection from Supabase:", error);
      });
      supabase.from("waypoint_groups").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete mirrored waypoint group from Supabase:", error);
      });
      supabase.from("tracks").update({ collection_id: "default" }).eq("collection_id", id).then(({ error }) => {
        if (error) console.error("Failed to reassign collection tracks in Supabase:", error);
      });
      supabase.from("waypoints").update({ group_id: null }).eq("group_id", id).then(({ error }) => {
        if (error) console.error("Failed to reassign collection waypoints in Supabase:", error);
      });
      supabase.from("areas").update({ collection_id: null }).eq("collection_id", id).then(({ error }) => {
        if (error) console.error("Failed to reassign collection areas in Supabase:", error);
      });
    }
  }, [user]);

  const toggleRouteCollectionVisibility = useCallback((id: string) => {
    let updatedVisible = false;
    setRouteCollections((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updatedVisible = !c.visible;
          return { ...c, visible: updatedVisible };
        }
        return c;
      })
    );

    setWaypointGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, visible: updatedVisible } : g))
    );

    if (user && isSupabaseConfigured) {
      const target = routeCollections.find((c) => c.id === id);
      if (target) {
        const nextVis = !target.visible;
        supabase.from("route_collections").update({ visible: nextVis }).eq("id", id).then(({ error }) => {
          if (error) console.error("Failed to toggle route collection visibility in Supabase:", error);
        });
        supabase.from("waypoint_groups").update({ visible: nextVis }).eq("id", id).then(({ error }) => {
          if (error) console.error("Failed to toggle mirrored waypoint group visibility in Supabase:", error);
        });
      }
    }
  }, [routeCollections, user]);

  const setTrackCollection = useCallback((trackId: string, collectionId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, collectionId } : t))
    );

    if (user && isSupabaseConfigured) {
      supabase.from("tracks").update({ collection_id: collectionId }).eq("id", trackId).then(({ error }) => {
        if (error) console.error("Failed to update track collection in Supabase:", error);
      });
    }
  }, [user]);

  // 13. ADVANCED: Reverse Active Track (Invertir inicio/fin)
  const reverseTrack = useCallback((trackId: string) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const reversedPoints = [...t.points].reverse();
          let cumulativeDist = 0;
          const updatedPoints = reversedPoints.map((pt, idx) => {
            if (idx > 0) {
              const prevPt = reversedPoints[idx - 1];
              cumulativeDist += calculateHaversineDistance([prevPt.lat, prevPt.lng], [pt.lat, pt.lng]);
            }
            return {
              ...pt,
              distance: cumulativeDist,
            };
          });

          // Also reverse clickSegments for this track
          const segments = clickSegments[trackId];
          if (segments) {
            const reversedSegments = [...segments].reverse();
            setClickSegments((prevSegments) => ({
              ...prevSegments,
              [trackId]: reversedSegments,
            }));
          }

          if (user && isSupabaseConfigured) {
            supabase.from("tracks")
              .update({ points: updatedPoints })
              .eq("id", trackId)
              .then(({ error }) => {
                if (error) console.error("Failed to sync reversed track to Supabase:", error);
              });
          }

          return { ...t, points: updatedPoints };
        }
        return t;
      })
    );
  }, [clickSegments, user, tracks, areas, pushToHistory]);

  // 14. ADVANCED GEOMETRY: Trim, Round-Trip, Drag Anchor and Insert Points
  const trimTrack = useCallback((trackId: string, startIndex: number, endIndex: number) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const slicedPoints = t.points.slice(startIndex, endIndex + 1);
          let cumulativeDist = 0;
          const updatedPoints = slicedPoints.map((pt, idx) => {
            if (idx > 0) {
              const prevPt = slicedPoints[idx - 1];
              cumulativeDist += calculateHaversineDistance([prevPt.lat, prevPt.lng], [pt.lat, pt.lng]);
            }
            return {
              ...pt,
              distance: cumulativeDist,
            };
          });

          // Clear clickSegments to keep consistency after cropping/trimming
          setClickSegments((prevSegments) => {
            const nextSegs = { ...prevSegments };
            delete nextSegs[trackId];
            return nextSegs;
          });

          if (user && isSupabaseConfigured) {
            supabase.from("tracks")
              .update({ points: updatedPoints })
              .eq("id", trackId)
              .then(({ error }) => {
                if (error) console.error("Failed to sync trimmed track to Supabase:", error);
              });
          }

          return { ...t, points: updatedPoints };
        }
        return t;
      })
    );
  }, [user, tracks, areas, pushToHistory]);

  const roundTripTrack = useCallback((trackId: string) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId && t.points.length > 1) {
          const originalPoints = t.points;
          const returnPoints = [...originalPoints].slice(0, -1).reverse();
          
          let cumulativeDist = originalPoints[originalPoints.length - 1].distance;
          const appendedPoints = returnPoints.map((pt, idx) => {
            const prevPt = idx === 0 ? originalPoints[originalPoints.length - 1] : returnPoints[idx - 1];
            cumulativeDist += calculateHaversineDistance([prevPt.lat, prevPt.lng], [pt.lat, pt.lng]);
            return {
              ...pt,
              distance: cumulativeDist,
            };
          });

          const finalPoints = [...originalPoints, ...appendedPoints];

          // Clear clickSegments
          setClickSegments((prevSegments) => {
            const nextSegs = { ...prevSegments };
            delete nextSegs[trackId];
            return nextSegs;
          });

          if (user && isSupabaseConfigured) {
            supabase.from("tracks")
              .update({ points: finalPoints })
              .eq("id", trackId)
              .then(({ error }) => {
                if (error) console.error("Failed to sync round-trip track to Supabase:", error);
              });
          }

          return { ...t, points: finalPoints };
        }
        return t;
      })
    );
  }, [user, tracks, areas, pushToHistory]);

  const updateRoutePoint = useCallback(async (trackId: string, index: number, lat: number, lng: number) => {
    pushToHistory(tracks, areas);
    setLoading(true);
    try {
      const targetTrack = tracks.find(t => t.id === trackId);
      if (!targetTrack || index < 0 || index >= targetTrack.points.length) return;

      const pts = targetTrack.points;
      let finalPoints: RoutePoint[];

      if (routingProfile !== 'straight' && index > 0 && index < pts.length - 1) {
        // Re-route the two segments adjacent to the dragged vertex so the track follows roads/trails
        const prevPt = pts[index - 1];
        const nextPt = pts[index + 1];

        const [seg1, seg2] = await Promise.all([
          fetchHikingRoute([prevPt.lat, prevPt.lng], [lat, lng]),
          fetchHikingRoute([lat, lng], [nextPt.lat, nextPt.lng]),
        ]);

        // seg1 goes from prevPt to newPos (inclusive). seg2 from newPos to nextPt.
        // Combine: skip prevPt (already in pts), include everything up to (not including nextPt).
        const newMiddleCoords = [
          ...seg1.slice(1),        // prevPt → newPos intermediate + newPos
          ...seg2.slice(1, -1),    // newPos → nextPt intermediate (skip newPos and nextPt)
        ];

        const newElevs = newMiddleCoords.length > 0
          ? await fetchElevations(newMiddleCoords.map(c => [c[0], c[1]]))
          : [];

        const newMiddlePoints: RoutePoint[] = newMiddleCoords.map((c, i) => ({
          lat: c[0],
          lng: c[1],
          elevation: newElevs[i] ?? (c[2] as number) ?? 0,
          distance: 0,
          surface: (c[3] as string) || pts[index].surface,
        }));

        const updatedPoints = [
          ...pts.slice(0, index),      // points before dragged vertex (includes prevPt at index-1)
          ...newMiddlePoints,           // newly routed middle section
          ...pts.slice(index + 1),      // points after dragged vertex (includes nextPt at index+1)
        ];

        let cumDist = 0;
        finalPoints = updatedPoints.map((pt, i) => {
          if (i > 0) cumDist += calculateHaversineDistance([updatedPoints[i - 1].lat, updatedPoints[i - 1].lng], [pt.lat, pt.lng]);
          return { ...pt, distance: cumDist };
        });
      } else {
        // First/last point or straight-line mode: just move the vertex
        const [elev] = await fetchElevations([[lat, lng]]);
        const updatedPoints = [...pts];
        updatedPoints[index] = { ...updatedPoints[index], lat, lng, elevation: elev ?? updatedPoints[index].elevation };

        let cumDist = 0;
        finalPoints = updatedPoints.map((pt, i) => {
          if (i > 0) cumDist += calculateHaversineDistance([updatedPoints[i - 1].lat, updatedPoints[i - 1].lng], [pt.lat, pt.lng]);
          return { ...pt, distance: cumDist };
        });
      }

      setTracks(prev => prev.map(t => {
        if (t.id === trackId) {
          if (user && isSupabaseConfigured) {
            supabase.from("tracks").update({ points: finalPoints }).eq("id", trackId)
              .then(({ error }) => { if (error) console.error("Failed to sync updated point to Supabase:", error); });
          }
          return { ...t, points: finalPoints };
        }
        return t;
      }));
    } catch (error) {
      console.error("Failed to update route point coordinate:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchElevations, fetchHikingRoute, routingProfile, user, tracks, areas, pushToHistory]);

  const insertIntermediatePoint = useCallback(async (trackId: string, lat: number, lng: number) => {
    pushToHistory(tracks, areas);
    setLoading(true);
    try {
      const [elev] = await fetchElevations([[lat, lng]]);
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id === trackId && t.points.length >= 2) {
            // Find closest segment index by projecting coordinate onto segment lines
            let minDistance = Infinity;
            let insertIdx = 0;
            
            for (let i = 0; i < t.points.length - 1; i++) {
              const p1 = t.points[i];
              const p2 = t.points[i + 1];
              
              const dx = p2.lat - p1.lat;
              const dy = p2.lng - p1.lng;
              let segmentDist = 0;
              
              if (dx === 0 && dy === 0) {
                segmentDist = Math.sqrt((lat - p1.lat)**2 + (lng - p1.lng)**2);
              } else {
                let projectionFactor = ((lat - p1.lat) * dx + (lng - p1.lng) * dy) / (dx*dx + dy*dy);
                projectionFactor = Math.max(0, Math.min(1, projectionFactor));
                const projLat = p1.lat + projectionFactor * dx;
                const projLng = p1.lng + projectionFactor * dy;
                segmentDist = Math.sqrt((lat - projLat)**2 + (lng - projLng)**2);
              }
              
              if (segmentDist < minDistance) {
                minDistance = segmentDist;
                insertIdx = i;
              }
            }
            
            const updatedPoints = [...t.points];
            const newPoint: RoutePoint = {
              lat,
              lng,
              elevation: elev ?? 0,
              distance: 0,
            };
            
            // Insert at index insertIdx + 1
            updatedPoints.splice(insertIdx + 1, 0, newPoint);
            
            // Recalculate cumulative distances in cascada
            let cumulativeDist = 0;
            const finalPoints = updatedPoints.map((pt, idx) => {
              if (idx > 0) {
                const prevPt = updatedPoints[idx - 1];
                cumulativeDist += calculateHaversineDistance([prevPt.lat, prevPt.lng], [pt.lat, pt.lng]);
              }
              return {
                ...pt,
                distance: cumulativeDist,
              };
            });
            
            if (user && isSupabaseConfigured) {
              supabase.from("tracks")
                .update({ points: finalPoints })
                .eq("id", trackId)
                .then(({ error }) => {
                  if (error) console.error("Failed to sync inserted point to Supabase:", error);
                });
            }
            
            return { ...t, points: finalPoints };
          }
          return t;
        })
      );
    } catch (error) {
      console.error("Failed to insert intermediate point:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchElevations, user, tracks, areas, pushToHistory]);

  const applySimplifyTrack = useCallback((trackId: string, tolerance: number) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          if (t.points.length <= 2) return t;
          const simplifiedPoints = simplifyTrack(t.points, tolerance);
          // Recalculate distances for the new points
          let newDist = 0;
          const updatedPoints = simplifiedPoints.map((p, index) => {
            if (index === 0) return { ...p, distance: 0 };
            newDist += calculateHaversineDistance(
              [simplifiedPoints[index - 1].lat, simplifiedPoints[index - 1].lng],
              [p.lat, p.lng]
            );
            return { ...p, distance: newDist };
          });
          
          if (user && isSupabaseConfigured) {
            supabase.from("tracks").update({ points: updatedPoints }).eq("id", trackId).then(({ error }) => {
              if (error) console.error("Failed to simplify track in Supabase:", error);
            });
          }
          return { ...t, points: updatedPoints };
        }
        return t;
      })
    );
  }, [user, tracks, areas, pushToHistory]);

  const applySmoothTrack = useCallback((trackId: string, strength: number = 1) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          if (t.points.length <= 2) return t;
          const smoothedPoints = smoothTrackPoints(t.points, strength);
          // Recalculate distances for the new points
          let newDist = 0;
          const updatedPoints = smoothedPoints.map((p, index) => {
            if (index === 0) return { ...p, distance: 0, elevation: p.elevation ?? 0 };
            newDist += calculateHaversineDistance(
              [smoothedPoints[index - 1].lat, smoothedPoints[index - 1].lng],
              [p.lat, p.lng]
            );
            return { ...p, distance: newDist, elevation: p.elevation ?? 0 };
          });
          
          if (user && isSupabaseConfigured) {
            supabase.from("tracks").update({ points: updatedPoints }).eq("id", trackId).then(({ error }) => {
              if (error) console.error("Failed to smooth track in Supabase:", error);
            });
          }
          return { ...t, points: updatedPoints };
        }
        return t;
      })
    );
  }, [user, tracks, areas, pushToHistory]);

  const applyRemoveOutliers = useCallback((trackId: string, speedThresholdKmh: number = 60) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          if (t.points.length <= 2) return t;
          const cleanedPoints = removeTrackOutliers(t.points, speedThresholdKmh);
          // Recalculate distances for the new points
          let newDist = 0;
          const updatedPoints = cleanedPoints.map((p, index) => {
            if (index === 0) return { ...p, distance: 0, elevation: p.elevation ?? 0 };
            newDist += calculateHaversineDistance(
              [cleanedPoints[index - 1].lat, cleanedPoints[index - 1].lng],
              [p.lat, p.lng]
            );
            return { ...p, distance: newDist, elevation: p.elevation ?? 0 };
          });
          
          if (user && isSupabaseConfigured) {
            supabase.from("tracks").update({ points: updatedPoints }).eq("id", trackId).then(({ error }) => {
              if (error) console.error("Failed to remove outliers from track in Supabase:", error);
            });
          }
          return { ...t, points: updatedPoints };
        }
        return t;
      })
    );
  }, [user, tracks, areas, pushToHistory]);

  const cleanTrackArea = useCallback((trackId: string, bounds: { north: number, south: number, east: number, west: number }, keepInside: boolean) => {
    pushToHistory(tracks, areas);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const isPointInBounds = (lat: number, lng: number) => {
            return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west;
          };

          const newPoints = t.points.filter((p) => {
            const inBounds = isPointInBounds(p.lat, p.lng);
            return keepInside ? inBounds : !inBounds;
          });
          
          if (newPoints.length === 0) return t; // Prevent deleting the whole track

          // Recalculate distances
          let newDist = 0;
          const updatedPoints = newPoints.map((p, index) => {
            if (index === 0) return { ...p, distance: 0 };
            newDist += calculateHaversineDistance(
              [newPoints[index - 1].lat, newPoints[index - 1].lng],
              [p.lat, p.lng]
            );
            return { ...p, distance: newDist };
          });

          if (user && isSupabaseConfigured) {
            supabase.from("tracks").update({ points: updatedPoints }).eq("id", trackId).then(({ error }) => {
              if (error) console.error("Failed to clean track in Supabase:", error);
            });
          }
          return { ...t, points: updatedPoints };
        }
        return t;
      })
    );
  }, [user, tracks, areas, pushToHistory]);

  // Area CRUD
  const addArea = useCallback((area: Omit<Area, "id">) => {
    pushToHistory(tracks, areas);
    const newArea: Area = {
      ...area,
      id: `area-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
    setAreas((prev) => [...prev, newArea]);

    if (user && isSupabaseConfigured) {
      supabase.from("areas").insert({
        id: newArea.id,
        user_id: user.id,
        name: newArea.name,
        points: newArea.points,
        color: newArea.color,
        visible: newArea.visible,
        area_m2: newArea.areaM2,
        perimeter_m: newArea.perimeterM,
        collection_id: newArea.collectionId || null,
      }).then(({ error }) => {
        if (error) {
          console.warn("Failed to sync new area to Supabase (check if areas table exists):", error);
        }
      });
    }
    return newArea.id;
  }, [user, tracks, areas, pushToHistory]);

  const updateArea = useCallback((id: string, fields: Partial<Area>) => {
    pushToHistory(tracks, areas);
    setAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...fields } : a))
    );

    if (user && isSupabaseConfigured) {
      const dbFields: any = {};
      if (fields.name !== undefined) dbFields.name = fields.name;
      if (fields.points !== undefined) dbFields.points = fields.points;
      if (fields.color !== undefined) dbFields.color = fields.color;
      if (fields.visible !== undefined) dbFields.visible = fields.visible;
      if (fields.areaM2 !== undefined) dbFields.area_m2 = fields.areaM2;
      if (fields.perimeterM !== undefined) dbFields.perimeter_m = fields.perimeterM;
      if (fields.collectionId !== undefined) dbFields.collection_id = fields.collectionId || null;

      supabase.from("areas").update(dbFields).eq("id", id).then(({ error }) => {
        if (error) {
          console.warn("Failed to update area in Supabase:", error);
        }
      });
    }
  }, [user, tracks, areas, pushToHistory]);

  const deleteArea = useCallback((id: string) => {
    pushToHistory(tracks, areas);
    setAreas((prev) => prev.filter((a) => a.id !== id));

    if (user && isSupabaseConfigured) {
      supabase.from("areas").delete().eq("id", id).then(({ error }) => {
        if (error) {
          console.warn("Failed to delete area in Supabase:", error);
        }
      });
    }
  }, [user, tracks, areas, pushToHistory]);

  const toggleAreaVisibility = useCallback((id: string) => {
    pushToHistory(tracks, areas);
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextVisible = !a.visible;
          if (user && isSupabaseConfigured) {
            supabase.from("areas").update({ visible: nextVisible }).eq("id", id).then(({ error }) => {
              if (error) console.warn("Failed to toggle area visibility in Supabase:", error);
            });
          }
          return { ...a, visible: nextVisible };
        }
        return a;
      })
    );
  }, [user, tracks, areas, pushToHistory]);

  const syncChangedTracksToSupabase = useCallback((nextTracks: Track[]) => {
    if (!user || !isSupabaseConfigured) return;

    syncQueueRef.current = syncQueueRef.current.then(async () => {
      for (const nextTrack of nextTracks) {
        const currentTrack = tracks.find(t => t.id === nextTrack.id);
        const isTrackNew = !currentTrack;
        const isTrackChanged = isTrackNew || JSON.stringify(currentTrack) !== JSON.stringify(nextTrack);

        if (isTrackChanged) {
          const { error: trackErr } = await supabase.from("tracks").upsert({
            id: nextTrack.id,
            user_id: user.id,
            name: nextTrack.name,
            points: nextTrack.points,
            visible: nextTrack.visible,
            color: nextTrack.color,
            collection_id: nextTrack.collectionId || "default"
          });
          if (trackErr) {
            console.error("Failed to sync track on undo/redo to Supabase:", trackErr);
          }

          const isWaypointsChanged = isTrackNew || JSON.stringify(currentTrack.waypoints) !== JSON.stringify(nextTrack.waypoints);
          if (isWaypointsChanged) {
            const { error: deleteErr } = await supabase.from("waypoints").delete().eq("track_id", nextTrack.id);
            if (deleteErr) {
              console.error("Failed to delete waypoints before insert on undo/redo:", deleteErr);
            }

            if (nextTrack.waypoints.length > 0) {
              const dbWaypoints = nextTrack.waypoints.map(w => ({
                id: w.id,
                user_id: user.id,
                track_id: nextTrack.id,
                name: w.name,
                lat: w.lat,
                lng: w.lng,
                icon: w.icon,
                note: w.note,
                color: w.color,
                group_id: w.groupId === "default" ? null : (w.groupId || null),
                completed: w.completed || false,
                image: w.image || null,
                link: w.link || null
              }));
              const { error: insertErr } = await supabase.from("waypoints").insert(dbWaypoints);
              if (insertErr) {
                console.error("Failed to sync waypoints on undo/redo to Supabase:", insertErr);
              }
            }
          }
        }
      }

      for (const currTrack of tracks) {
        if (!nextTracks.some(t => t.id === currTrack.id)) {
          const { error: deleteTrackErr } = await supabase.from("tracks").delete().eq("id", currTrack.id);
          if (deleteTrackErr) {
            console.error("Failed to delete track on undo/redo in Supabase:", deleteTrackErr);
          }
        }
      }
    });
  }, [user, tracks]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const previous = undoStack[undoStack.length - 1];
    
    const currentClonedTracks = JSON.parse(JSON.stringify(tracks));
    const currentClonedAreas = JSON.parse(JSON.stringify(areas));
    setRedoStack((prev) => [...prev, { tracks: currentClonedTracks, areas: currentClonedAreas }]);

    setTracks(previous.tracks);
    setAreas(previous.areas);

    setUndoStack((prev) => prev.slice(0, -1));

    if (user && isSupabaseConfigured) {
      syncChangedTracksToSupabase(previous.tracks);
      previous.areas.forEach(nextArea => {
        const currArea = areas.find(a => a.id === nextArea.id);
        if (!currArea || JSON.stringify(currArea) !== JSON.stringify(nextArea)) {
          supabase.from("areas").upsert({
            id: nextArea.id,
            user_id: user.id,
            name: nextArea.name,
            points: nextArea.points,
            color: nextArea.color,
            visible: nextArea.visible,
            area_m2: nextArea.areaM2,
            perimeter_m: nextArea.perimeterM,
            collection_id: nextArea.collectionId || "default"
          }).then(({ error }) => {
            if (error) console.warn("Failed to sync area on undo/redo to Supabase:", error);
          });
        }
      });
      areas.forEach(currArea => {
        if (!previous.areas.some(a => a.id === currArea.id)) {
          supabase.from("areas").delete().eq("id", currArea.id).then(({ error }) => {
            if (error) console.warn("Failed to delete area on undo/redo to Supabase:", error);
          });
        }
      });
    }
  }, [undoStack, tracks, areas, user, syncChangedTracksToSupabase]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];

    const currentClonedTracks = JSON.parse(JSON.stringify(tracks));
    const currentClonedAreas = JSON.parse(JSON.stringify(areas));
    setUndoStack((prev) => [...prev, { tracks: currentClonedTracks, areas: currentClonedAreas }]);

    setTracks(next.tracks);
    setAreas(next.areas);

    setRedoStack((prev) => prev.slice(0, -1));

    if (user && isSupabaseConfigured) {
      syncChangedTracksToSupabase(next.tracks);
      next.areas.forEach(nextArea => {
        const currArea = areas.find(a => a.id === nextArea.id);
        if (!currArea || JSON.stringify(currArea) !== JSON.stringify(nextArea)) {
          supabase.from("areas").upsert({
            id: nextArea.id,
            user_id: user.id,
            name: nextArea.name,
            points: nextArea.points,
            color: nextArea.color,
            visible: nextArea.visible,
            area_m2: nextArea.areaM2,
            perimeter_m: nextArea.perimeterM,
            collection_id: nextArea.collectionId || "default"
          }).then(({ error }) => {
            if (error) console.warn("Failed to sync area on undo/redo to Supabase:", error);
          });
        }
      });
      areas.forEach(currArea => {
        if (!next.areas.some(a => a.id === currArea.id)) {
          supabase.from("areas").delete().eq("id", currArea.id).then(({ error }) => {
            if (error) console.warn("Failed to delete area on undo/redo to Supabase:", error);
          });
        }
      });
    }
  }, [redoStack, tracks, areas, user, syncChangedTracksToSupabase]);

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
    routingProfile,
    setRoutingProfile,
    distance,
    ascent,
    descent,
    loading,
    addPoint,
    removeLastPoint,
    clearRoute,
    importRouteData,
    addWaypoint,
    addWaypointToMarkers,
    addWaypointToTrack,
    addMultipleWaypoints,
    updateWaypoint,
    removeWaypoint,
    removeWaypoints,
    
    // Multi-track additions
    createNewTrack,
    deleteTrack,
    deleteMultipleTracks,
    toggleTrackVisibility,
    toggleTrackPublic,
    setTrackColor,
    mergeTracks,
    splitTrack,
    reverseTrack,
    trimTrack,
    roundTripTrack,
    updateRoutePoint,
    insertIntermediatePoint,
    applySimplifyTrack,
    applySmoothTrack,
    applyRemoveOutliers,
    cleanTrackArea,

    // Waypoint Group additions
    waypointGroups,
    setWaypointGroups,
    addWaypointGroup,
    deleteWaypointGroup,
    updateWaypointGroup,
    toggleWaypointGroupVisibility,
    toggleGroupPublic,
    toggleWaypointCompleted,
    fetchCommunityContent,

    // Route Collection additions
    routeCollections,
    setRouteCollections,
    addRouteCollection,
    deleteRouteCollection,
    updateRouteCollection,
    toggleRouteCollectionVisibility,
    setTrackCollection,

    // Area additions
    areas,
    setAreas,
    addArea,
    updateArea,
    deleteArea,
    toggleAreaVisibility,

    // Global History History additions
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
