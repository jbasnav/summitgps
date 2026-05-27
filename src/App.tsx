import { useState, useCallback, useMemo, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { MapContainer } from "./components/MapContainer";
import { ElevationProfile } from "./components/ElevationProfile";
import { WaypointModal } from "./components/WaypointModal";
import { useRoutePlanner, type Waypoint, type RoutePoint } from "./hooks/useRoutePlanner";
import type { BaseLayerId, CustomLayer } from "./components/LayerSelector";
import { ChevronDown, ChevronUp, Search, X, Compass, Loader, MapPin, Route, Square, Upload, Download, Printer, Scissors, ArrowLeftRight, RefreshCw, Edit2, Redo2, Undo2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./utils/supabaseClient";
import { AuthScreen } from "./components/AuthScreen";
import PrintMapModal from "./components/PrintMapModal";
import { formatCoordinatesByFormat, parseCoordinateInput, calculateGeodesicArea, calculatePolygonPerimeter } from "./utils/geoUtils";
import { exportToGPX } from "./utils/gpxExporter";

import { CustomDialogProvider, useCustomDialog } from "./components/CustomDialog";

function AppContent() {
  // Authentication States
  const [user, setUser] = useState<any | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(true); // Start as true to show login screen first
  const [authChecking, setAuthChecking] = useState<boolean>(isSupabaseConfigured); // Check session if Supabase is configured

  const { customAlert } = useCustomDialog();

  const {
    routeName,
    setRouteName,
    points,
    tracks,
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
    addMultipleWaypoints,
    updateWaypoint,
    removeWaypoint,
    
    // Multi-track operations
    createNewTrack,
    deleteTrack,
    deleteMultipleTracks,
    toggleTrackVisibility,
    setTrackColor,
    mergeTracks,
    splitTrack,
    reverseTrack,
    trimTrack,
    roundTripTrack,
    updateRoutePoint,
    insertIntermediatePoint,

    // Waypoint Groups / Challenges
    waypointGroups,
    addWaypointGroup,
    deleteWaypointGroup,
    updateWaypointGroup,
    toggleWaypointGroupVisibility,
    toggleWaypointCompleted,

    // Route Collections
    routeCollections,
    addRouteCollection,
    deleteRouteCollection,
    updateRouteCollection,
    toggleRouteCollectionVisibility,
    setTrackCollection,

    // Area additions
    areas,
    addArea,
    updateArea,
    deleteArea,
    toggleAreaVisibility,
    applySimplifyTrack,
    cleanTrackArea,

    // Global History additions
    undo,
    redo,
    canUndo,
    canRedo,
  } = useRoutePlanner(user);

  // App settings states
  const [activeBaseLayer, setActiveBaseLayer] = useState<BaseLayerId>("osm");
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.4);
  const [showContours, setShowContours] = useState<boolean>(false);
  const [useImperial, setUseImperial] = useState<boolean>(() => {
    return localStorage.getItem("useImperial") === "true";
  });
  const [coordinateFormat, setCoordinateFormat] = useState<"dd" | "ddm" | "dms" | "utm" | "mgrs">(() => {
    return (localStorage.getItem("coordinateFormat") as any) || "dd";
  });
  const [gridOverlay, setGridOverlay] = useState<"none" | "dd" | "dms" | "utm" | "mgrs">(() => {
    return (localStorage.getItem("gridOverlay") as any) || "none";
  });
  const [showGridLabels, setShowGridLabels] = useState<boolean>(() => {
    return localStorage.getItem("showGridLabels") !== "false"; // Default to true
  });

  // Custom layers and slope shading states (Fase 13)
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>(() => {
    try {
      const saved = localStorage.getItem("summit_custom_layers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showSlopeShading, setShowSlopeShading] = useState<boolean>(() => {
    return localStorage.getItem("summit_show_slope_shading") === "true";
  });

  const [slopeShadingOpacity, setSlopeShadingOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("summit_slope_shading_opacity");
    return saved ? parseFloat(saved) : 0.6;
  });

  // Persist custom layers & slope shading
  useEffect(() => {
    localStorage.setItem("summit_custom_layers", JSON.stringify(customLayers));
  }, [customLayers]);

  useEffect(() => {
    localStorage.setItem("summit_show_slope_shading", String(showSlopeShading));
  }, [showSlopeShading]);

  useEffect(() => {
    localStorage.setItem("summit_slope_shading_opacity", String(slopeShadingOpacity));
  }, [slopeShadingOpacity]);

  // CRUD Handlers for custom layers
  const handleAddCustomLayer = useCallback((layer: Omit<CustomLayer, "id" | "visible" | "opacity">) => {
    const newLayer: CustomLayer = {
      ...layer,
      id: `custom-layer-${Date.now()}`,
      visible: !layer.isBase, // bases are active via activeBaseLayer; overlays start visible
      opacity: 0.75,
    };
    setCustomLayers((prev) => [...prev, newLayer]);
  }, []);

  const handleDeleteCustomLayer = useCallback((id: string) => {
    setCustomLayers((prev) => prev.filter((l) => l.id !== id));
    setActiveBaseLayer((prev) => (prev === id ? "osm" : prev));
  }, []);

  const handleToggleCustomLayer = useCallback((id: string) => {
    setCustomLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  const handleUpdateCustomLayerOpacity = useCallback((id: string, opacity: number) => {
    setCustomLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("useImperial", String(useImperial));
  }, [useImperial]);

  useEffect(() => {
    localStorage.setItem("coordinateFormat", coordinateFormat);
  }, [coordinateFormat]);

  useEffect(() => {
    localStorage.setItem("gridOverlay", gridOverlay);
  }, [gridOverlay]);

  useEffect(() => {
    localStorage.setItem("showGridLabels", String(showGridLabels));
  }, [showGridLabels]);

  const handleToggleGridLabels = useCallback(() => {
    setShowGridLabels((prev) => !prev);
  }, []);

  // Marked Location details for right side panel
  const [markedLocation, setMarkedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [markedLocationDetails, setMarkedLocationDetails] = useState<{
    elevation: number | null;
    weather: {
      temp: number;
      windspeed: number;
      windgusts: number;
      winddirection: number;
      weathercode: number;
      rainProbability: number;
      sunset: string;
      sunrise: string;
      night: {
        temp: number;
        weathercode: number;
        rainProbability: number;
        windspeed: number;
        windgusts: number;
        winddirection: number;
      } | null;
      daily?: {
        time: string[];
        weathercode: number[];
        tempMax: number[];
        tempMin: number[];
        rainProbabilityMax: number[];
        windspeedMax: number[];
        windgustsMax: number[];
        winddirectionDominant: number[];
      } | null;
    } | null;
    address: string | null;
    loading: boolean;
  }>({ elevation: null, weather: null, address: null, loading: false });

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Automatically expand sidebar when a map location is marked
  useEffect(() => {
    if (markedLocation) {
      setIsSidebarCollapsed(false);
    }
  }, [markedLocation]);

  // Fetch location details (elevation, weather, reverse geocoding)
  useEffect(() => {
    if (!markedLocation) {
      setMarkedLocationDetails({ elevation: null, weather: null, address: null, loading: false });
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setMarkedLocationDetails(prev => ({ ...prev, loading: true }));
      try {
        const { lat, lng } = markedLocation;
        
        // 1. Fetch Elevation
        const elevPromise = fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
          .then(r => r.json())
          .then(data => data.elevation?.[0] ?? null)
          .catch(() => null);

        // 2. Fetch Weather & Weekly Forecast
        const weatherPromise = fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true` +
          `&hourly=temperature_2m,precipitation_probability,windspeed_10m,windgusts_10m,winddirection_10m,weathercode` +
          `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,sunrise,sunset` +
          `&timezone=auto`
        )
          .then(r => r.json())
          .then(data => {
            if (!data.current_weather) return null;
            
            // Extract current rain probability and gusts
            let currentRainProb = 0;
            let currentWindGusts = data.current_weather.windspeed;
            
            if (data.hourly && data.hourly.time) {
              const currentHourStr = data.current_weather.time;
              const currentIdx = data.hourly.time.indexOf(currentHourStr);
              if (currentIdx !== -1) {
                currentRainProb = data.hourly.precipitation_probability?.[currentIdx] ?? 0;
                currentWindGusts = data.hourly.windgusts_10m?.[currentIdx] ?? data.current_weather.windspeed;
              }
            }

            // Extract "Night" details (using 22:00 / 10 PM of today)
            let nightDetails = null;
            if (data.hourly && data.hourly.time) {
              const todayDateStr = data.current_weather.time.substring(0, 10);
              const nightHourStr = `${todayDateStr}T22:00`;
              let nightIdx = data.hourly.time.indexOf(nightHourStr);
              if (nightIdx === -1) {
                nightIdx = 22; // fallback
              }
              if (data.hourly.time[nightIdx]) {
                nightDetails = {
                  temp: data.hourly.temperature_2m[nightIdx] ?? data.current_weather.temperature,
                  weathercode: data.hourly.weathercode[nightIdx] ?? data.current_weather.weathercode,
                  rainProbability: data.hourly.precipitation_probability?.[nightIdx] ?? 0,
                  windspeed: data.hourly.windspeed_10m?.[nightIdx] ?? data.current_weather.windspeed,
                  windgusts: data.hourly.windgusts_10m?.[nightIdx] ?? data.current_weather.windspeed,
                  winddirection: data.hourly.winddirection_10m?.[nightIdx] ?? 0,
                };
              }
            }

            // Parse Sunrise / Sunset
            const formatTime = (timeStr: string) => {
              if (!timeStr) return "--:--";
              try {
                return new Date(timeStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              } catch {
                return "--:--";
              }
            };

            const sunriseTime = data.daily?.sunrise?.[0] ? formatTime(data.daily.sunrise[0]) : "--:--";
            const sunsetTime = data.daily?.sunset?.[0] ? formatTime(data.daily.sunset[0]) : "--:--";

            return {
              temp: data.current_weather.temperature,
              windspeed: data.current_weather.windspeed,
              windgusts: currentWindGusts,
              winddirection: data.current_weather.winddirection ?? 0,
              weathercode: data.current_weather.weathercode,
              rainProbability: currentRainProb,
              sunset: sunsetTime,
              sunrise: sunriseTime,
              night: nightDetails,
              daily: data.daily ? {
                time: data.daily.time,
                weathercode: data.daily.weathercode,
                tempMax: data.daily.temperature_2m_max,
                tempMin: data.daily.temperature_2m_min,
                rainProbabilityMax: data.daily.precipitation_probability_max ?? data.daily.time.map(() => 0),
                windspeedMax: data.daily.windspeed_10m_max ?? data.daily.time.map(() => 0),
                windgustsMax: data.daily.windgusts_10m_max ?? data.daily.time.map(() => 0),
                winddirectionDominant: data.daily.winddirection_10m_dominant ?? data.daily.time.map(() => 0),
              } : null
            };
          })
          .catch(() => null);

        // 3. Fetch Reverse Geocoding Address
        const geoPromise = fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
          headers: { 'Accept-Language': 'es' }
        })
          .then(r => r.json())
          .then(data => data.display_name ?? null)
          .catch(() => null);

        const [elevation, weather, address] = await Promise.all([elevPromise, weatherPromise, geoPromise]);

        if (isMounted) {
          setMarkedLocationDetails({
            elevation,
            weather,
            address,
            loading: false,
          });
        }
      } catch (err) {
        console.error("Error fetching location details:", err);
        if (isMounted) {
          setMarkedLocationDetails(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [markedLocation]);

  // Synchronization and Viewport states
  const [hoverPoint, setHoverPoint] = useState<RoutePoint | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false); // Split route mode
  const [isDrawingArea, setIsDrawingArea] = useState<boolean>(false); // Area drawing mode
  const [isEditingRoute, setIsEditingRoute] = useState<boolean>(false); // Advanced Route Edit mode
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false); // Keyboard shortcuts modal
  const [isStreetViewActive, setIsStreetViewActive] = useState<boolean>(false); // Street View active mode
  const [streetViewCoords, setStreetViewCoords] = useState<{ lat: number; lng: number } | null>(null); // Coordinates for Pegman
  const [streetViewAddress, setStreetViewAddress] = useState<string>(""); // Geocoded address for Street View
  const [isStreetViewFullscreen, setIsStreetViewFullscreen] = useState<boolean>(false); // Fullscreen Street View panel
  const [mapCenter, setMapCenter] = useState<[number, number] | null>([43.1906, -4.8322]);
  const [osmPois, setOsmPois] = useState<any[]>([]);

  // Waypoint Modal States
  const [isWptModalOpen, setIsWptModalOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [newWptCoords, setNewWptCoords] = useState<[number, number] | null>(null);
  const [newWptGroupId, setNewWptGroupId] = useState<string>("default");

  // Floating Geocoding Search States
  const [floatingSearchQuery, setFloatingSearchQuery] = useState("");
  const [floatingSearchResults, setFloatingSearchResults] = useState<any[]>([]);
  const [floatingSearchLoading, setFloatingSearchLoading] = useState(false);

  // Lifted selection states for bulk waypoint actions
  const [isBulkMode, _setIsBulkMode] = useState<boolean>(false);
  const [selectedWptIds, setSelectedWptIds] = useState<string[]>([]);
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>([]);
  const [isSelectingArea, setIsSelectingArea] = useState<boolean>(false);
  
  // Track Cleaning Area States
  const [isCleaningArea, setIsCleaningArea] = useState<boolean>(false);
  const [cleanBounds, setCleanBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  // Cartographic Printing States
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Dynamic statistics & selection states
  const [trackColorMode, setTrackColorMode] = useState<"solid" | "slope" | "elevation" | "heartRate" | "cadence" | "power" | "speed">("solid");
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);

  const activeTrackForPrint = useMemo(() => {
    return tracks.find((t) => t.id === activeTrackId);
  }, [tracks, activeTrackId]);

  // Automatically reset brushing selection when switching active tracks
  useEffect(() => {
    setSelectedRange(null);
  }, [activeTrackId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing in any input field
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.hasAttribute("contenteditable"))
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Undo / Redo
      if (e.ctrlKey || e.metaKey) {
        if (key === "z") {
          e.preventDefault();
          undo();
        } else if (key === "y") {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Undo/Redo fallback (some OS handle Shift+Z for Redo)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "z") {
        e.preventDefault();
        redo();
        return;
      }

      // Drawing Route Mode toggle
      if (key === "k" || key === "d") {
        e.preventDefault();
        setIsDrawing((prev) => {
          const next = !prev;
          if (next) {
            setIsDrawingArea(false);
            setIsSplitting(false);
            setIsEditingRoute(false);
            setIsCleaningArea(false);
          }
          return next;
        });
      }

      // Drawing Area Mode toggle
      if (key === "a") {
        e.preventDefault();
        setIsDrawingArea((prev) => {
          const next = !prev;
          if (next) {
            setIsDrawing(false);
            setIsSplitting(false);
            setIsEditingRoute(false);
            setIsCleaningArea(false);
          }
          return next;
        });
      }

      // Edit Mode toggle
      if (key === "e") {
        e.preventDefault();
        setIsEditingRoute((prev) => {
          const next = !prev;
          if (next) {
            setIsDrawing(false);
            setIsDrawingArea(false);
            setIsSplitting(false);
            setIsCleaningArea(false);
          }
          return next;
        });
      }

      // Cancel modes / close modal
      if (e.key === "Escape") {
        e.preventDefault();
        setIsDrawing(false);
        setIsDrawingArea(false);
        setIsSplitting(false);
        setIsEditingRoute(false);
        setIsCleaningArea(false);
        setIsShortcutsModalOpen(false);
        setIsStreetViewActive(false);
      }

      // Toggle help cheatsheet modal (either "?" or "Shift + /")
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo, setIsDrawing, setIsDrawingArea, setIsSplitting, setIsEditingRoute, setIsCleaningArea, setIsShortcutsModalOpen, setIsStreetViewActive]);

  // Automatically clear POI selection when new search results load
  useEffect(() => {
    setSelectedPoiIds([]);
  }, [osmPois]);

  // Reverse geocode Street View coordinates
  useEffect(() => {
    if (!isStreetViewActive || !streetViewCoords) {
      setStreetViewAddress("");
      return;
    }

    let isMounted = true;
    setStreetViewAddress("Cargando dirección...");

    const delayDebounceFn = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${streetViewCoords.lat}&lon=${streetViewCoords.lng}&zoom=14`,
        { headers: { "Accept-Language": "es" } }
      )
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) {
            setStreetViewAddress(data.display_name || "Dirección de montaña");
          }
        })
        .catch(() => {
          if (isMounted) {
            setStreetViewAddress(
              `Coordenadas: ${streetViewCoords.lat.toFixed(5)}, ${streetViewCoords.lng.toFixed(5)}`
            );
          }
        });
    }, 400); // 400ms debounce while dragging

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [streetViewCoords, isStreetViewActive]);

  // Derive all visible waypoints across all visible tracks in the library
  const visibleWaypoints = useMemo(() => {
    const list: Waypoint[] = [];
    const groupVisibilityMap = new Map(waypointGroups.map((g) => [g.id, g.visible]));
    const collectionVisibilityMap = new Map(routeCollections.map((c) => [c.id, c.visible]));

    tracks.forEach((t) => {
      const collectionId = t.collectionId || "default";
      const isCollectionVisible = collectionVisibilityMap.get(collectionId) !== false;
      if (t.visible && isCollectionVisible) {
        t.waypoints.forEach((w) => {
          const groupId = w.groupId || "default";
          const isGroupVisible = groupVisibilityMap.get(groupId) !== false; // Default to true if not found

          if (isGroupVisible) {
            list.push({
              ...w,
              color: w.color || t.color, // Fallback to track color if none set
            });
          }
        });
      }
    });
    return list;
  }, [tracks, waypointGroups, routeCollections]);

  // Compute tracks with reactive collection visibility applied
  const tracksWithCollectionVisibility = useMemo(() => {
    const collectionVisibilityMap = new Map(routeCollections.map((c) => [c.id, c.visible]));
    return tracks.map((t) => {
      const collectionId = t.collectionId || "default";
      const isCollectionVisible = collectionVisibilityMap.get(collectionId) !== false;
      return {
        ...t,
        visible: t.visible && isCollectionVisible,
      };
    });
  }, [tracks, routeCollections]);

  // Handle unit switching
  const handleToggleUnits = useCallback(() => {
    setUseImperial((prev) => !prev);
  }, []);

  // Trigger search fly-to
  const handleFlyToCoords = useCallback((lat: number, lng: number) => {
    setFlyToCoords([lat, lng]);
    setTimeout(() => setFlyToCoords(null), 1600);
  }, []);

  // Handle floating search submit query to Nominatim (with coordinate detection)
  const handleFloatingSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floatingSearchQuery.trim()) return;

    // 1. First, try to parse as coordinates (DD, DMS, DDM, UTM, MGRS)
    const parsedCoord = parseCoordinateInput(floatingSearchQuery);
    if (parsedCoord) {
      handleFlyToCoords(parsedCoord.lat, parsedCoord.lng);
      setFloatingSearchResults([]);
      setFloatingSearchQuery("");
      // Open waypoint modal at the detected coordinate
      setNewWptCoords([parsedCoord.lat, parsedCoord.lng]);
      setEditingWaypoint(null);
      setIsWptModalOpen(true);
      return;
    }

    // 2. Otherwise, search Nominatim
    setFloatingSearchLoading(true);
    setFloatingSearchResults([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          floatingSearchQuery
        )}&limit=5`
      );
      if (!response.ok) throw new Error("Search service error");
      const data = await response.json();
      setFloatingSearchResults(data);
    } catch (err) {
      console.error("Floating search failed:", err);
    } finally {
      setFloatingSearchLoading(false);
    }
  }, [floatingSearchQuery, handleFlyToCoords]);

  // Handle flying to selected search result location and clearing lists
  const handleSelectFloatingResult = useCallback((result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    handleFlyToCoords(lat, lon);
    setFloatingSearchResults([]);
    setFloatingSearchQuery("");
  }, [handleFlyToCoords]);

  // Listen to Supabase Auth state changes and manage checking state
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthChecking(false);
      return;
    }

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setShowAuthScreen(false);
      }
      setAuthChecking(false);
    }).catch(() => {
      setAuthChecking(false);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setShowAuthScreen(false);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUser(null);
    setShowAuthScreen(isSupabaseConfigured);
  }, []);

  const handleSkipAuth = useCallback(() => {
    setShowAuthScreen(false);
    setUser(null);
  }, []);

  const handleAuthSuccess = useCallback((authedUser: any) => {
    setUser(authedUser);
    setShowAuthScreen(false);
  }, []);

  // Handle right-click on map to drop waypoint
  const handleRightClickMap = useCallback((lat: number, lng: number) => {
    setNewWptCoords([lat, lng]);
    setEditingWaypoint(null);
    setIsWptModalOpen(true);
  }, []);

  // Directly export the active route track to GPX
  const handleExportGpxDirect = useCallback(async () => {
    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack) {
      customAlert("Por favor, selecciona una ruta activa de la biblioteca para exportar.");
      return;
    }

    if (activeTrack.points.length === 0 && activeTrack.waypoints.length === 0) {
      customAlert("No hay ruta ni marcas en la ruta activa para exportar.");
      return;
    }

    const gpxString = exportToGPX(activeTrack.name, activeTrack.points, activeTrack.waypoints);
    const blob = new Blob([gpxString], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTrack.name.replace(/\s+/g, "_") || "ruta_summit"}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tracks, activeTrackId, customAlert]);

  // Handle clicking a waypoint on map to edit it
  const handleEditWaypoint = useCallback((wpt: Waypoint) => {
    setEditingWaypoint(wpt);
    setNewWptCoords(null);
    setIsWptModalOpen(true);
  }, []);

  // Handle pre-filling waypoint modal from an OSM POI template
  const handleAddOsmPoi = useCallback((poi: any) => {
    const templateWaypoint: Waypoint = {
      id: `temp-${Date.now()}`,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      icon: poi.icon || "mountain",
      note: poi.note || `Altitud: ${poi.elevation ? `${poi.elevation}m` : "No disponible"}`,
      color: poi.color || "#10b981",
      groupId: "default",
      completed: false,
    };
    setEditingWaypoint(templateWaypoint);
    setNewWptCoords(null);
    setIsWptModalOpen(true);
  }, []);

  // Save Waypoint (new, edited, or template imported)
  const handleSaveWaypoint = useCallback(
    async (data: { 
      name: string; 
      icon: string; 
      note: string; 
      color: string; 
      groupId: string; 
      completed: boolean; 
      image?: string; 
      link?: string; 
      imageFile?: File | null;
      elevation?: number;
    }) => {
      let imageUrl = data.image;

      // Handle async photo upload to Supabase Storage if a local file is provided
      if (data.imageFile && user && isSupabaseConfigured) {
        try {
          const file = data.imageFile;
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("waypoint-photos")
            .upload(filePath, file);

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from("waypoint-photos")
            .getPublicUrl(filePath);

          imageUrl = urlData.publicUrl;
        } catch (err: any) {
          console.error("Failed to upload image to Supabase Storage:", err);
          customAlert("Error al subir la imagen a la nube: " + (err.message || err));
        }
      }

      if (editingWaypoint && !editingWaypoint.id.startsWith("temp-")) {
        updateWaypoint(editingWaypoint.id, {
          name: data.name,
          icon: data.icon,
          note: data.note,
          color: data.color,
          groupId: data.groupId,
          completed: data.completed,
          link: data.link,
          image: imageUrl,
          elevation: data.elevation,
        });
      } else {
        const coords = editingWaypoint?.id.startsWith("temp-")
          ? ([editingWaypoint.lat, editingWaypoint.lng] as [number, number])
          : newWptCoords;

        if (coords) {
          addWaypoint({
            name: data.name,
            lat: coords[0],
            lng: coords[1],
            icon: data.icon,
            note: data.note,
            color: data.color,
            groupId: data.groupId,
            completed: data.completed,
            image: imageUrl,
            link: data.link,
            elevation: data.elevation,
          });
        }
      }
      setEditingWaypoint(null);
      setNewWptCoords(null);
    },
    [editingWaypoint, newWptCoords, addWaypoint, updateWaypoint, user]
  );

  // Handle vertex click splitting action
  const handleSplitTrackAt = useCallback((trackId: string, index: number) => {
    splitTrack(trackId, index);
    setIsSplitting(false); // turn off split mode after cutting
  }, [splitTrack]);

  // Handle polygon area drawing complete action
  const handleAreaComplete = useCallback((points: { lat: number; lng: number }[], color: string) => {
    const areaM2 = calculateGeodesicArea(points);
    const perimeterM = calculatePolygonPerimeter(points);
    addArea({
      name: `Área ${areas.length + 1}`,
      points,
      color,
      visible: true,
      areaM2,
      perimeterM,
    });
    setIsDrawingArea(false);
  }, [addArea, areas.length]);

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-[#070a08] select-none relative">
      {/* Sidebar Panel */}
      <Sidebar
        routeName={routeName}
        setRouteName={setRouteName}
        points={points}
        waypoints={visibleWaypoints} // Pass all visible waypoints to display in tab
        tracks={tracks}
        activeTrackId={activeTrackId}
        setActiveTrackId={setActiveTrackId}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        isSplitting={isSplitting}
        setIsSplitting={setIsSplitting}
        snapToTrail={snapToTrail}
        setSnapToTrail={setSnapToTrail}
        routingProfile={routingProfile}
        setRoutingProfile={setRoutingProfile}
        distance={distance}
        ascent={ascent}
        descent={descent}
        loading={loading}
        onClearRoute={clearRoute}
        onUndoPoint={removeLastPoint}
        onImportRoute={importRouteData}
        onFlyToCoords={handleFlyToCoords}
        onDeleteWaypoint={removeWaypoint}
        onEditWaypoint={handleEditWaypoint}
        onUpdateWaypoint={updateWaypoint}
        onCreateNewTrack={createNewTrack}
        onDeleteTrack={deleteTrack}
        onDeleteMultipleTracks={deleteMultipleTracks}
        onToggleTrackVisibility={toggleTrackVisibility}
        onSetTrackColor={setTrackColor}
        onMergeTracks={mergeTracks}
        onReverseTrack={reverseTrack}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onToggleShortcutsModal={useCallback(() => setIsShortcutsModalOpen(prev => !prev), [])}
        onTrimTrack={trimTrack}
        onRoundTripTrack={roundTripTrack}
        applySimplifyTrack={applySimplifyTrack}
        cleanTrackArea={cleanTrackArea}
        isCleaningArea={isCleaningArea}
        setIsCleaningArea={setIsCleaningArea}
        cleanBounds={cleanBounds}
        setCleanBounds={setCleanBounds}
        activeBaseLayer={activeBaseLayer}
        onChangeBaseLayer={setActiveBaseLayer}
        overlayOpacity={overlayOpacity}
        onChangeOverlayOpacity={setOverlayOpacity}
        showContours={showContours}
        onToggleContours={() => setShowContours(!showContours)}
        useImperial={useImperial}
        onToggleUnits={handleToggleUnits}
        waypointGroups={waypointGroups}
        onAddWaypointGroup={addWaypointGroup}
        onDeleteWaypointGroup={deleteWaypointGroup}
        onUpdateWaypointGroup={updateWaypointGroup}
        onToggleWaypointGroupVisibility={toggleWaypointGroupVisibility}
        onToggleWaypointCompleted={toggleWaypointCompleted}
        routeCollections={routeCollections}
        onAddRouteCollection={addRouteCollection}
        onDeleteRouteCollection={deleteRouteCollection}
        onUpdateRouteCollection={updateRouteCollection}
        onToggleRouteCollectionVisibility={toggleRouteCollectionVisibility}
        onSetTrackCollection={setTrackCollection}
        isDrawingArea={isDrawingArea}
        setIsDrawingArea={setIsDrawingArea}
        areas={areas}
        onUpdateArea={updateArea}
        onDeleteArea={deleteArea}
        onToggleAreaVisibility={toggleAreaVisibility}
        mapCenter={mapCenter}
        osmPois={osmPois}
        onSetOsmPois={setOsmPois}
        onAddOsmPoi={handleAddOsmPoi}
        onAddWaypoint={addWaypoint}
        onAddMultipleWaypoints={addMultipleWaypoints}
        onRequestAddWaypointAtCenter={useCallback((groupId?: string) => {
          setNewWptCoords(mapCenter ?? null);
          setNewWptGroupId(groupId || "default");
          setEditingWaypoint(null);
          setIsWptModalOpen(true);
        }, [mapCenter])}
        user={user}
        onSignOut={handleSignOut}
        onSignInClick={useCallback(() => setShowAuthScreen(true), [])}
        isSupabaseConfigured={isSupabaseConfigured}
        isBulkMode={isBulkMode}
        selectedWptIds={selectedWptIds}
        setSelectedWptIds={setSelectedWptIds}
        selectedPoiIds={selectedPoiIds}
        onSetSelectedPoiIds={setSelectedPoiIds}
        coordinateFormat={coordinateFormat}
        onChangeCoordinateFormat={setCoordinateFormat}
        gridOverlay={gridOverlay}
        onChangeGridOverlay={setGridOverlay}
        showGridLabels={showGridLabels}
        onToggleGridLabels={handleToggleGridLabels}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isEditingRoute={isEditingRoute}
        setIsEditingRoute={setIsEditingRoute}
        trackColorMode={trackColorMode}
        setTrackColorMode={setTrackColorMode}
        isStreetViewActive={isStreetViewActive}
        onToggleStreetView={useCallback(() => {
          setIsStreetViewActive((prev) => {
            const next = !prev;
            if (next) {
              // Deactivate drawing/edit modes
              setIsDrawing(false);
              setIsDrawingArea(false);
              setIsSplitting(false);
              setIsEditingRoute(false);
              setIsCleaningArea(false);
              // Set initial coordinates if not set yet (use map center)
              if (!streetViewCoords && mapInstance) {
                const center = mapInstance.getCenter();
                setStreetViewCoords({ lat: center.lat, lng: center.lng });
              }
            }
            return next;
          });
        }, [streetViewCoords, mapInstance])}
        customLayers={customLayers}
        onAddCustomLayer={handleAddCustomLayer}
        onDeleteCustomLayer={handleDeleteCustomLayer}
        onToggleCustomLayer={handleToggleCustomLayer}
        onUpdateCustomLayerOpacity={handleUpdateCustomLayerOpacity}
        showSlopeShading={showSlopeShading}
        onToggleSlopeShading={useCallback(() => setShowSlopeShading(prev => !prev), [])}
        slopeShadingOpacity={slopeShadingOpacity}
        onChangeSlopeShadingOpacity={setSlopeShadingOpacity}
      />

      {/* Point Info Drawer expanding the Sidebar */}
      {/* Point Info Drawer expanding the Sidebar */}
      {!isSidebarCollapsed && markedLocation && (
        <div className="w-[340px] md:w-[380px] h-full border-r border-[#1b3d2b] bg-[#131b17]/95 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col z-[9998] animate-slide-in-left pointer-events-auto">
          {/* Panel Header (Styled like GaiaGPS Premium Card) */}
          <div className="flex items-center justify-between p-5 border-b border-[#1b3d2b]/40 bg-[#0c120f]/60 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#1b3d2b]/25 border border-[#1b3d2b]/60 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
                <svg className="w-5 h-5 text-emerald-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 4l6.5 13H5.5L12 6z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-100 tracking-wide truncate">
                  {markedLocationDetails.loading ? "Buscando..." : (markedLocationDetails.address?.split(',')?.[0] || "Ubicación Marcada")}
                </h3>
                <p className="text-[10.5px] text-slate-400 font-mono mt-0.5 select-all leading-none">
                  {markedLocation.lat.toFixed(5)}, {markedLocation.lng.toFixed(5)}
                  {markedLocationDetails.elevation !== null && (
                    <span className="text-emerald-400/90 font-sans font-semibold"> • Altitud: {useImperial ? `${Math.round(markedLocationDetails.elevation * 3.28084)} ft` : `${Math.round(markedLocationDetails.elevation)} m`}</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMarkedLocation(null)}
              className="p-1.5 rounded-lg hover:bg-[#1b3d2b]/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {markedLocationDetails.loading ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold animate-pulse">Obteniendo datos...</span>
              </div>
            ) : (
              <>
                {/* Clean Location Context */}
                {markedLocationDetails.address && (
                  <div className="text-[11px] text-slate-400 bg-[#0c120f]/20 border border-[#1b3d2b]/15 px-3.5 py-2.5 rounded-lg leading-relaxed select-text flex items-center justify-between gap-2">
                    <span className="truncate">{markedLocationDetails.address.split(',').slice(1).join(',').trim() || "Área de montaña"}</span>
                    <button
                      onClick={() => {
                        const coordStr = formatCoordinatesByFormat(markedLocation.lat, markedLocation.lng, coordinateFormat);
                        navigator.clipboard.writeText(coordStr);
                        setCopiedCoords(true);
                        setTimeout(() => setCopiedCoords(false), 2000);
                      }}
                      className="p-1 rounded bg-[#131b17] border border-[#1b3d2b]/40 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer shrink-0"
                      title="Copiar Coordenadas"
                    >
                      {copiedCoords ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      )}
                    </button>
                  </div>
                )}

                {/* Current & Weekly Weather Card (OpenSnow Style) */}
                {markedLocationDetails.weather && (
                  <div className="space-y-4 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/30 shadow-2xl backdrop-blur-md">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#1b3d2b]/15">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        ❄️ El Tiempo
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 bg-[#131b17]/80 px-1.5 py-0.5 rounded border border-[#1b3d2b]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        OpenSnow Predictor
                      </span>
                    </div>

                    {/* Columns (Current vs Night) */}
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      {/* Left: Current */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 block tracking-wide select-none">Actual</span>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl filter drop-shadow select-none">
                            {getWeatherEmoji(markedLocationDetails.weather.weathercode)}
                          </span>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-black text-slate-100 font-sans tracking-tight">
                              {Math.round(markedLocationDetails.weather.temp)}
                            </span>
                            <span className="text-xs font-bold text-slate-400 ml-0.5">°C</span>
                          </div>
                        </div>
                        <div className="space-y-1 text-[10.5px] font-medium text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sky-400/90 w-3.5 text-center" title="Probabilidad de Lluvia">💧</span>
                            <span>{markedLocationDetails.weather.rainProbability}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400/90 w-3.5 text-center" title="Viento y Ráfagas">💨</span>
                            <span className="font-mono text-[9.5px]">
                              {getWindDirectionCardinal(markedLocationDetails.weather.winddirection)}{" "}
                              {Math.round(markedLocationDetails.weather.windspeed)} / {Math.round(markedLocationDetails.weather.windgusts)}
                            </span>
                            <span className="text-[8px] text-slate-500 uppercase font-mono">km/h</span>
                          </div>
                        </div>
                      </div>

                      {/* Divider line */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 border-l border-[#1b3d2b]/20"></div>
                        
                        {/* Right: Night */}
                        <div className="pl-4 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 block tracking-wide select-none">Noche</span>
                          {markedLocationDetails.weather.night ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-3xl filter drop-shadow select-none">
                                  {getWeatherEmoji(markedLocationDetails.weather.night.weathercode)}
                                </span>
                                <div className="flex items-baseline">
                                  <span className="text-2xl font-black text-slate-100 font-sans tracking-tight">
                                    {Math.round(markedLocationDetails.weather.night.temp)}
                                  </span>
                                  <span className="text-xs font-bold text-slate-400 ml-0.5">°C</span>
                                </div>
                              </div>
                              <div className="space-y-1 text-[10.5px] font-medium text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sky-400/90 w-3.5 text-center" title="Probabilidad de Lluvia">💧</span>
                                  <span>{markedLocationDetails.weather.night.rainProbability}%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400/90 w-3.5 text-center" title="Viento y Ráfagas">💨</span>
                                  <span className="font-mono text-[9.5px]">
                                    {getWindDirectionCardinal(markedLocationDetails.weather.night.winddirection)}{" "}
                                    {Math.round(markedLocationDetails.weather.night.windspeed)} / {Math.round(markedLocationDetails.weather.night.windgusts)}
                                  </span>
                                  <span className="text-[8px] text-slate-500 uppercase font-mono">km/h</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <span className="text-[9px] text-slate-500 italic block pt-2">No disponible</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Solar Indicators (Sunset & Sunrise) */}
                    <div className="bg-[#131b17]/80 border border-[#1b3d2b]/25 rounded-lg py-1.5 px-3 flex items-center justify-between text-[10px] text-slate-300 font-medium select-none">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">🌅</span>
                        <span>Amanece:</span>
                        <span className="font-mono font-bold text-emerald-400">{markedLocationDetails.weather.sunrise}</span>
                      </div>
                      <div className="h-3 w-px bg-[#1b3d2b]/30"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">🌇</span>
                        <span>Anochece:</span>
                        <span className="font-mono font-bold text-amber-500">{markedLocationDetails.weather.sunset}</span>
                      </div>
                    </div>

                    {/* Weekly Forecast Sub-Section (List Layout) */}
                    {markedLocationDetails.weather.daily && (
                      <div className="space-y-2 border-t border-[#1b3d2b]/15 pt-3 mt-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider select-none">
                          📅 Previsión Semanal
                        </span>

                        <div className="space-y-1 text-[11px]">
                          {markedLocationDetails.weather.daily.time.slice(0, 5).map((timeStr, idx) => {
                            const wcode = markedLocationDetails.weather!.daily!.weathercode[idx];
                            const tMax = markedLocationDetails.weather!.daily!.tempMax[idx];
                            const tMin = markedLocationDetails.weather!.daily!.tempMin[idx];
                            const rainProb = markedLocationDetails.weather!.daily!.rainProbabilityMax[idx];
                            const wSpeed = markedLocationDetails.weather!.daily!.windspeedMax[idx];
                            const wGusts = markedLocationDetails.weather!.daily!.windgustsMax[idx];
                            const wDir = markedLocationDetails.weather!.daily!.winddirectionDominant[idx];

                            // Day formatting (e.g. Lunes 25)
                            const getFullSpanishDay = (dateStr: string, idxVal: number) => {
                              if (idxVal === 0) return "Hoy";
                              if (idxVal === 1) return "Mañana";
                              try {
                                const date = new Date(dateStr);
                                const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][date.getDay()];
                                const dayNum = date.getDate();
                                return `${dayName} ${dayNum}`;
                              } catch {
                                return dateStr;
                              }
                            };

                            return (
                              <div
                                key={timeStr}
                                className="flex items-center justify-between bg-[#131b17]/40 hover:bg-[#131b17]/85 border border-[#1b3d2b]/10 hover:border-[#1b3d2b]/25 rounded-lg px-2.5 py-1.5 transition-all duration-150"
                              >
                                <span className="font-semibold text-slate-300 w-[72px] truncate select-none">
                                  {getFullSpanishDay(timeStr, idx)}
                                </span>
                                
                                <div className="flex items-center gap-1 w-[80px] shrink-0">
                                  <span className="text-sm filter drop-shadow" title={getWeatherDescription(wcode)}>
                                    {getWeatherEmoji(wcode)}
                                  </span>
                                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold select-none">
                                    <span className="text-slate-200">{Math.round(tMax)}°</span>
                                    <span className="text-slate-500/50">/</span>
                                    <span className="text-slate-400">{Math.round(tMin)}°</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 w-[42px] justify-center text-sky-400/90 font-mono text-[10px] font-bold" title="Probabilidad de Precipitación">
                                  <span>💧</span>
                                  <span>{rainProb}%</span>
                                </div>

                                <div className="flex items-center gap-1 w-[80px] justify-end text-slate-300 font-mono text-[9px] font-bold truncate" title="Viento y Ráfagas">
                                  <span>💨</span>
                                  <span>
                                    {getWindDirectionCardinal(wDir)} {Math.round(wSpeed)}/{Math.round(wGusts)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* View OpenSnow Button */}
                    <div className="pt-2">
                      <a
                        href={`https://opensnow.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-[#1b3d2b]/30 hover:bg-[#1b3d2b]/60 border border-[#1b3d2b]/50 hover:border-emerald-500/50 text-[10.5px] font-extrabold text-slate-200 hover:text-emerald-400 tracking-wider uppercase transition-all shadow-md cursor-pointer"
                      >
                        <span>View 10 Day Forecast</span>
                        <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>

                    {/* OpenSnow Badge Footer */}
                    <div className="flex items-center justify-center gap-1.5 pt-3.5 border-t border-[#1b3d2b]/15 text-[9.5px] text-slate-500 font-bold select-none">
                      <span>Powered by OpenSnow</span>
                      <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase shadow-sm">
                        <svg className="w-2.5 h-2.5 fill-current animate-spin" viewBox="0 0 24 24" style={{ animationDuration: '10s' }}>
                          <path d="M12,2a1,1,0,0,0-1,1V7.59L8.41,5A1,1,0,0,0,7,6.41L9.59,9H5a1,1,0,0,0,0,2H9.59L7,13.59A1,1,0,1,0,8.41,15L11,12.41V17a1,1,0,0,0,2,0V12.41L15.59,15a1,1,0,0,0,1.41-1.41L14.41,11H19a1,1,0,0,0,0-2H14.41L17,6.41A1,1,0,1,0,15.59,5L13,7.59V3A1,1,0,0,0,12,2Z"/>
                        </svg>
                        <span>OpenSnow</span>
                      </div>
                    </div>

                  </div>
                )}

                {/* Location Actions */}
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => {
                      const templateWaypoint: Waypoint = {
                        id: `temp-${Date.now()}`,
                        name: "Ubicación Marcada",
                        lat: markedLocation.lat,
                        lng: markedLocation.lng,
                        icon: "mountain",
                        note: `Altitud: ${markedLocationDetails.elevation ? `${Math.round(markedLocationDetails.elevation)}m` : "No disponible"}`,
                        color: "#f97316",
                        groupId: "default",
                        completed: false,
                      };
                      setEditingWaypoint(templateWaypoint);
                      setNewWptCoords(null);
                      setIsWptModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-[#1b3d2b] hover:border-emerald-500 bg-[#0c120f]/60 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    📥 Guardar Marca (Waypoint)
                  </button>
                  <button
                    onClick={() => {
                      let trackToUse = tracks.find(t => t.id === activeTrackId);
                      if (!trackToUse) {
                        const newTrackId = createNewTrack();
                        setActiveTrackId(newTrackId);
                      }
                      addPoint(markedLocation.lat, markedLocation.lng);
                      setIsDrawing(true);
                      setMarkedLocation(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-[#1b3d2b] hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    📐 Dibujar Ruta desde aquí
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Map Viewport & Collapsible Elevation Chart */}
      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        <div className={`flex-1 min-h-0 relative flex flex-col md:flex-row overflow-hidden`}>
          {/* Left/Top Map Area */}
          <div className={`flex-1 h-full relative ${isStreetViewActive && isStreetViewFullscreen ? 'hidden' : 'flex flex-col'}`}>
          <MapContainer
            tracks={tracksWithCollectionVisibility}
            activeTrackId={activeTrackId}
            isDrawing={isDrawing}
            isSplitting={isSplitting}
            activeBaseLayer={activeBaseLayer}
            overlayOpacity={overlayOpacity}
            showContours={showContours}
            hoverPoint={hoverPoint}
            flyToCoords={flyToCoords}
            onAddPoint={addPoint}
            onRightClickMap={handleRightClickMap}
            onEditWaypoint={handleEditWaypoint}
            onSplitTrackAt={handleSplitTrackAt}
            waypointGroups={waypointGroups}
            onMapMove={useCallback((lat: number, lng: number) => setMapCenter([lat, lng]), [])}
            osmPois={osmPois}
            onAddOsmPoi={handleAddOsmPoi}
            isBulkMode={isBulkMode}
            selectedWptIds={selectedWptIds}
            onSetSelectedWptIds={setSelectedWptIds}
            selectedPoiIds={selectedPoiIds}
            onSetSelectedPoiIds={setSelectedPoiIds}
            waypoints={visibleWaypoints}
            gridOverlay={gridOverlay}
            showGridLabels={showGridLabels}
            markedLocation={markedLocation}
            onSetMarkedLocation={setMarkedLocation}
            isSelectingArea={isSelectingArea}
            setIsSelectingArea={setIsSelectingArea}
            isCleaningArea={isCleaningArea}
            onSetCleanBounds={setCleanBounds}
            isDrawingArea={isDrawingArea}
            areas={areas}
            onAreaComplete={handleAreaComplete}
            useImperial={useImperial}
            onToggleUnits={handleToggleUnits}
            coordinateFormat={coordinateFormat}
            onMapReady={setMapInstance}
            onUpdateWaypoint={updateWaypoint}
            isEditingRoute={isEditingRoute}
            onUpdateRoutePoint={updateRoutePoint}
            onInsertIntermediatePoint={insertIntermediatePoint}
            trackColorMode={trackColorMode}
            selectedRange={selectedRange}
            isStreetViewActive={isStreetViewActive}
            streetViewCoords={streetViewCoords}
            onStreetViewCoordsChange={useCallback((lat: number, lng: number) => {
              setStreetViewCoords({ lat, lng });
            }, [])}
            customLayers={customLayers}
            showSlopeShading={showSlopeShading}
            slopeShadingOpacity={slopeShadingOpacity}
          />

          {/* Floating vertical Tools toolbar overlaying the map on the left */}
          {isDrawing && (
            <div className="absolute top-20 left-6 z-[2000] flex flex-col items-center rounded-2xl border border-[#1b3d2b] bg-[#131b17]/95 shadow-2xl backdrop-blur-md overflow-hidden animate-fade-in p-2 w-14">
              <div className="text-[9px] font-extrabold text-emerald-400/80 uppercase tracking-widest text-center mt-1 pb-2 border-b border-[#1b3d2b]/40 w-full select-none font-sans">
                Tools
              </div>
              
              <div className="flex flex-col gap-3.5 mt-4 w-full">
                {/* Tool 1: Map Pin (Add Waypoint at center) */}
                <button
                  onClick={() => {
                    if (mapCenter) {
                      handleRightClickMap(mapCenter[0], mapCenter[1]);
                    }
                  }}
                  title="Añadir Marca en el Centro del Mapa"
                  className="w-10 h-10 rounded-xl bg-transparent hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-emerald-500/20"
                >
                  <MapPin className="w-5 h-5" />
                </button>

                {/* Tool 2: Draw Path (Active State indicator/toggle) */}
                <button
                  onClick={() => {
                    setIsDrawing(!isDrawing);
                  }}
                  title="Dibujar Ruta (Activo)"
                  className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] animate-pulse"
                >
                  <Route className="w-5 h-5" />
                </button>

                {/* Tool 3: Box Area Selection (Toggle area selection) */}
                <button
                  onClick={() => {
                    setIsSelectingArea((prev) => !prev);
                  }}
                  title="Selección por Área (Arrastrar en el Mapa)"
                  className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                    isSelectingArea
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse"
                      : "bg-transparent hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border-transparent hover:border-emerald-500/20"
                  }`}
                >
                  <Square className="w-5 h-5 border-dashed border-2 rounded-sm border-current p-0.5" />
                </button>

                {/* Tool 4: Import GPX */}
                <button
                  onClick={() => {
                    document.getElementById("gpx-upload-input")?.click();
                  }}
                  title="Importar GPX"
                  className="w-10 h-10 rounded-xl bg-transparent hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-emerald-500/20"
                >
                  <Upload className="w-5 h-5" />
                </button>

                {/* Tool 5: Export GPX */}
                <button
                  onClick={handleExportGpxDirect}
                  title="Exportar Ruta Activa a GPX"
                  className="w-10 h-10 rounded-xl bg-transparent hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-emerald-500/20"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}



          {/* Floating Glassmorphic Search Bar */}
          <div className="absolute top-4 left-4 z-[4000] w-72 md:w-96 flex flex-col pointer-events-auto">
            <form
              onSubmit={handleFloatingSearchSubmit}
              className="relative flex items-center shadow-lg rounded-xl overflow-hidden bg-[#131b17]/95 border border-[#1b3d2b] backdrop-blur-md transition-all focus-within:border-emerald-400"
            >
              <Search className="w-4 h-4 text-emerald-400 absolute left-3.5" />
              <input
                type="text"
                value={floatingSearchQuery}
                onChange={(e) => setFloatingSearchQuery(e.target.value)}
                placeholder="Buscar lugar o coordenadas (DD, UTM, MGRS)..."
                className="w-full bg-transparent pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {floatingSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setFloatingSearchQuery("");
                    setFloatingSearchResults([]);
                  }}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Live Coordinate Detection Indicator */}
            {floatingSearchQuery.trim().length >= 3 && (() => {
              const liveCoord = parseCoordinateInput(floatingSearchQuery);
              if (!liveCoord) return null;
              return (
                <button
                  onClick={() => {
                    handleFlyToCoords(liveCoord.lat, liveCoord.lng);
                    setFloatingSearchResults([]);
                    setFloatingSearchQuery("");
                    setNewWptCoords([liveCoord.lat, liveCoord.lng]);
                    setEditingWaypoint(null);
                    setIsWptModalOpen(true);
                  }}
                  className="mt-2 w-full flex items-center gap-3 p-3 rounded-xl bg-[#131b17]/95 border border-emerald-500/40 shadow-xl backdrop-blur-md hover:bg-emerald-500/10 transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                      📍 Coordenadas Detectadas
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                      {liveCoord.label} → {liveCoord.lat.toFixed(5)}, {liveCoord.lng.toFixed(5)}
                    </p>
                  </div>
                  <span className="text-[8px] text-emerald-400/70 font-bold uppercase tracking-wider shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    Ir + Marca
                  </span>
                </button>
              );
            })()}

            {floatingSearchLoading && (
              <div className="mt-2 p-4 bg-[#131b17]/95 border border-[#1b3d2b] rounded-xl flex justify-center shadow-xl backdrop-blur-md">
                <Loader className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
            )}

            {floatingSearchResults.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-[#1b3d2b] bg-[#131b17]/95 p-2 space-y-1.5 shadow-2xl backdrop-blur-md pr-1">
                {floatingSearchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectFloatingResult(result)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-transparent hover:bg-emerald-500/10 hover:border-emerald-400/20 text-left transition-all group border border-transparent"
                  >
                    <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
                        {result.display_name.split(",")[0]}
                      </p>
                      <p className="text-[9.5px] text-slate-500 truncate mt-0.5 leading-tight">
                        {result.display_name.split(",").slice(1).join(",").trim()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Floating Street View Toggle Button */}
          <div className="absolute top-4 right-16 z-[4000] pointer-events-auto">
            <button
              onClick={() => {
                setIsStreetViewActive((prev) => {
                  const next = !prev;
                  if (next) {
                    // Turn off other drawing/edit modes
                    setIsDrawing(false);
                    setIsDrawingArea(false);
                    setIsSplitting(false);
                    setIsEditingRoute(false);
                    setIsCleaningArea(false);
                    // Set coordinates
                    if (!streetViewCoords && mapInstance) {
                      const center = mapInstance.getCenter();
                      setStreetViewCoords({ lat: center.lat, lng: center.lng });
                    }
                  }
                  return next;
                });
              }}
              title={isStreetViewActive ? "Desactivar Vista de Calle (Pegman)" : "Activar Vista de Calle / Street View"}
              className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all ${
                isStreetViewActive
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)] animate-pulse"
                  : "bg-[#131b17]/95 border-[#1b3d2b] hover:border-yellow-500/30 text-slate-300 hover:text-yellow-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="4" r="2"/>
                <path d="M12 6c-1.1 0-2 .9-2 2v5h1v7h2v-7h1V8c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
          </div>

          {/* Floating Cartographic Print Button */}
          <div className="absolute top-4 right-4 z-[4000] pointer-events-auto">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              title="Imprimir Mapa (Composición Cartográfica)"
              className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer bg-[#131b17]/95 hover:bg-[#182a20] border border-[#1b3d2b] hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            >
              <Printer className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Floating Route Edit Toolbar (on the right side, like the printer) */}
          {activeTrackId && (
            <div className="absolute top-16 right-4 z-[4000] pointer-events-auto flex flex-col gap-2 select-none animate-fade-in">
              {/* Undo Button */}
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Deshacer última acción (Ctrl+Z)"
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all border ${
                  canUndo
                    ? "bg-[#131b17]/95 border-[#1b3d2b] hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 cursor-pointer"
                    : "bg-[#0c120f]/60 border-white/5 text-slate-600 opacity-40 cursor-not-allowed"
                }`}
              >
                <Undo2 className="w-[18px] h-[18px]" />
              </button>

              {/* Redo Button */}
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Rehacer última acción deshecha (Ctrl+Y)"
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all border ${
                  canRedo
                    ? "bg-[#131b17]/95 border-[#1b3d2b] hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 cursor-pointer"
                    : "bg-[#0c120f]/60 border-white/5 text-slate-600 opacity-40 cursor-not-allowed"
                }`}
              >
                <Redo2 className="w-[18px] h-[18px]" />
              </button>

              {/* Separador sutil */}
              <div className="w-6 h-[1px] bg-[#1b3d2b]/40 self-center my-0.5" />

              {/* Draw Route Toggle */}
              <button
                onClick={() => {
                  setIsDrawing(!isDrawing);
                  if (isSplitting) setIsSplitting(false);
                  if (isEditingRoute) setIsEditingRoute(false);
                  if (isCleaningArea) setIsCleaningArea(false);
                }}
                title={isDrawing ? "Finalizar Dibujo de Ruta" : "Dibujar en Ruta (K o D)"}
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer transition-all border ${
                  isDrawing
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse"
                    : "bg-[#131b17]/95 border-[#1b3d2b] hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400"
                }`}
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Route className="w-[18px] h-[18px]" />}
              </button>

              {/* Split Track (only if points.length > 3) */}
              {points.length > 3 && (
                <button
                  onClick={() => {
                    setIsSplitting(!isSplitting);
                    if (isDrawing) setIsDrawing(false);
                    if (isEditingRoute) setIsEditingRoute(false);
                  }}
                  title={isSplitting ? "Cancelar División" : "Dividir Ruta (Split)"}
                  className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer transition-all border ${
                    isSplitting
                      ? "bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                      : "bg-[#131b17]/95 border-[#1b3d2b] hover:border-orange-500/30 text-slate-300 hover:text-orange-400"
                  }`}
                >
                  <Scissors className="w-[18px] h-[18px]" />
                </button>
              )}

              {/* Reverse Track (only if points.length > 1) */}
              {points.length > 1 && (
                <button
                  onClick={() => reverseTrack(activeTrackId)}
                  title="Invertir Dirección de Ruta"
                  className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer bg-[#131b17]/95 border border-[#1b3d2b] hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400 transition-all"
                >
                  <ArrowLeftRight className="w-[18px] h-[18px]" />
                </button>
              )}

              {/* Round Trip / Bucle (only if points.length > 1) */}
              {points.length > 1 && !isDrawing && (
                <button
                  onClick={() => roundTripTrack(activeTrackId)}
                  title="Ida y Vuelta (Cerrar Bucle)"
                  className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer bg-[#131b17]/95 border border-[#1b3d2b] hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 transition-all"
                >
                  <RefreshCw className="w-[18px] h-[18px]" />
                </button>
              )}

              {/* Edit Route Vertices */}
              {points.length > 0 && !isDrawing && (
                <button
                  onClick={() => {
                    setIsEditingRoute(!isEditingRoute);
                    if (isSplitting) setIsSplitting(false);
                  }}
                  title={isEditingRoute ? "Finalizar Edición Geométrica" : "Edición Geométrica (Arrastrar Vértices) (E)"}
                  className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer transition-all border ${
                    isEditingRoute
                      ? "bg-violet-500/20 border-violet-500/40 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                      : "bg-[#131b17]/95 border-[#1b3d2b] hover:border-violet-500/30 text-slate-300 hover:text-violet-400"
                  }`}
                >
                  <Edit2 className="w-[18px] h-[18px]" />
                </button>
              )}

              {/* Clean Area / Borrar por rectangulo */}
              {points.length > 2 && !isDrawing && (
                <button
                  onClick={() => setIsCleaningArea(!isCleaningArea)}
                  title={isCleaningArea ? "Cancelar Limpieza" : "Limpiar Track por Rectángulo"}
                  className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer transition-all border ${
                    isCleaningArea
                      ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                      : "bg-[#131b17]/95 border-[#1b3d2b] hover:border-red-500/30 text-slate-300 hover:text-red-400"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                </button>
              )}

              {/* Help Keyboard Shortcuts button */}
              <button
                onClick={() => setIsShortcutsModalOpen(true)}
                title="Ayuda y Atajos de Teclado (?)"
                className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer bg-[#131b17]/95 border border-[#1b3d2b] hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 transition-all"
              >
                <Compass className="w-[18px] h-[18px]" />
              </button>
            </div>
          )}
          </div>

          {/* Street View Panel (Split Screen) */}
          {isStreetViewActive && streetViewCoords && (
            <div
              className={`border-[#1b3d2b]/40 bg-[#0a0e0c]/95 backdrop-blur-md flex flex-col z-[3000] transition-all duration-300 shrink-0 overflow-hidden ${
                isStreetViewFullscreen
                  ? "w-full h-full border-0"
                  : "w-full md:w-[40%] h-[40%] md:h-full border-t md:border-t-0 md:border-l"
              }`}
            >
              {/* Glassmorphic Panel Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-[#1b3d2b]/40 bg-[#0c120f]/60 select-none shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="4" r="2"/>
                      <path d="M12 6c-1.1 0-2 .9-2 2v5h1v7h2v-7h1V8c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-black text-slate-100 uppercase tracking-wider">
                      Vista de Calle (Street View)
                    </h4>
                    <p className="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5" title={streetViewAddress}>
                      📍 {streetViewAddress || "Obteniendo dirección..."}
                    </p>
                  </div>
                </div>

                {/* Panel Actions */}
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  {/* Link to Open in Google Maps */}
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetViewCoords.lat},${streetViewCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir en Google Maps completo"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-[#131b17] transition-all flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>

                  {/* Toggle Fullscreen button */}
                  <button
                    onClick={() => setIsStreetViewFullscreen(!isStreetViewFullscreen)}
                    title={isStreetViewFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-[#131b17] transition-all flex items-center justify-center"
                  >
                    {isStreetViewFullscreen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3M10 21v-6H4M14 3v6h6"/></svg>
                    )}
                  </button>

                  {/* Close button */}
                  <button
                    onClick={() => setIsStreetViewActive(false)}
                    title="Cerrar Vista de Calle (Esc)"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#131b17] transition-all flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Iframe Viewport */}
              <div className="flex-1 bg-[#070a08] relative">
                <iframe
                  key={`${streetViewCoords.lat}-${streetViewCoords.lng}`}
                  src={`https://maps.google.com/maps?q=&layer=c&cbll=${streetViewCoords.lat},${streetViewCoords.lng}&cbp=11,0,0,0,0&output=svembed`}
                  className="w-full h-full border-none shadow-inner"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Elevation Chart */}
        {points.length > 0 && (
          <div className="absolute bottom-5 right-5 left-5 md:left-auto md:w-[600px] z-[2000] flex flex-col pointer-events-auto transition-transform duration-300">
            <button
              onClick={() => setIsChartCollapsed(!isChartCollapsed)}
              className="self-end px-3 py-1 bg-[#131b17]/95 border border-[#1b3d2b] border-b-0 rounded-t-xl text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 text-[10px] font-bold shadow-lg"
            >
              {isChartCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Mostrar Elevación
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Ocultar Elevación
                </>
              )}
            </button>

            <div
              className={`transition-all duration-300 ${
                isChartCollapsed ? "h-0 opacity-0 pointer-events-none" : "h-[200px] opacity-100"
              }`}
            >
              <ElevationProfile
                points={points}
                useImperial={useImperial}
                onHoverPoint={setHoverPoint}
                selectedRange={selectedRange}
                onSelectRange={setSelectedRange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Waypoint Modal */}
      <WaypointModal
        isOpen={isWptModalOpen}
        onClose={() => setIsWptModalOpen(false)}
        onSave={handleSaveWaypoint}
        groups={waypointGroups}
        initialData={
          editingWaypoint
            ? {
                name: editingWaypoint.name,
                icon: editingWaypoint.icon,
                note: editingWaypoint.note,
                color: editingWaypoint.color,
                groupId: editingWaypoint.groupId,
                completed: editingWaypoint.completed,
                lat: editingWaypoint.lat,
                lng: editingWaypoint.lng,
                elevation: editingWaypoint.elevation,
              }
            : (newWptCoords || newWptGroupId !== "default")
            ? {
                name: "",
                icon: "mountain",
                note: "",
                color: "#10b981",
                groupId: newWptGroupId,
                completed: false,
                lat: newWptCoords?.[0],
                lng: newWptCoords?.[1],
              }
            : undefined
        }
        onDelete={
          editingWaypoint
            ? () => {
                removeWaypoint(editingWaypoint.id);
                setIsWptModalOpen(false);
              }
            : undefined
        }
      />

      {/* Cartographic Print Modal */}
      <PrintMapModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        mapInstance={mapInstance}
        tracks={tracksWithCollectionVisibility}
        defaultTitle={activeTrackForPrint?.name || 'Mapa de SummitGPS'}
      />

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all duration-300">
          <div className="bg-[#0a0e0c]/95 border border-emerald-500/25 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] p-6 max-w-lg w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Ambient subtle green glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#1b3d2b]/40 pb-4 mb-4 select-none">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">Atajos de Teclado</h3>
                <p className="text-[10px] text-emerald-500/60 uppercase tracking-widest font-semibold">SummitGPS Hub de Navegación</p>
              </div>
              <button 
                onClick={() => setIsShortcutsModalOpen(false)}
                className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-[#131b17] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content list */}
            <div className="space-y-3.5 my-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { keys: ["Ctrl", "Z"], desc: "Deshacer la última acción (Undo)" },
                  { keys: ["Ctrl", "Y"], desc: "Rehacer la última acción (Redo)" },
                  { keys: ["K"], desc: "Alternar dibujar ruta por caminos", alternative: "D" },
                  { keys: ["A"], desc: "Alternar dibujar área / polígono" },
                  { keys: ["E"], desc: "Alternar modo edición de ruta" },
                  { keys: ["Esc"], desc: "Cancelar dibujos o cerrar panel" },
                  { keys: ["?"], desc: "Mostrar / ocultar menú de atajos" },
                ].map((shortcut, i) => (
                  <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0c120f]/80 border border-[#1b3d2b]/25 hover:border-emerald-500/30 transition-all select-none">
                    <div className="flex items-center gap-1 flex-wrap">
                      {shortcut.keys.map((k, ki) => (
                        <span key={ki} className="flex items-center gap-1">
                          {ki > 0 && <span className="text-[9px] text-slate-500 font-bold">+</span>}
                          <kbd className="px-2 py-0.5 min-w-[20px] text-center bg-[#131b17] border border-emerald-500/30 text-emerald-400 rounded-md font-mono text-[10px] font-bold shadow-[0_2px_0_rgba(16,185,129,0.2)]">
                            {k}
                          </kbd>
                        </span>
                      ))}
                      {shortcut.alternative && (
                        <>
                          <span className="text-[9px] text-slate-500 mx-1 font-bold">o</span>
                          <kbd className="px-2 py-0.5 min-w-[20px] text-center bg-[#131b17] border border-emerald-500/30 text-emerald-400 rounded-md font-mono text-[10px] font-bold shadow-[0_2px_0_rgba(16,185,129,0.2)]">
                            {shortcut.alternative}
                          </kbd>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {shortcut.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#1b3d2b]/40 pt-4 flex items-center justify-between">
              <span className="text-[9px] text-slate-500 select-none">
                Consejo: Presiona <kbd className="px-1.5 py-0.5 bg-[#131b17] border border-white/5 text-slate-400 rounded font-mono text-[9px]">?</kbd> para ver de nuevo.
              </span>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-bold rounded-xl transition-all shadow-lg select-none cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exclusive loading or login overlay */}
      {authChecking && (
        <div className="absolute inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070a08] select-none text-slate-100 overflow-hidden">
          {/* Deep background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          {/* Subtle mountain background pattern */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none" />
          
          <div className="relative flex flex-col items-center space-y-6 animate-fade-in">
            {/* Logo container */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#1b3d2b]/60 flex items-center justify-center shadow-2xl bg-[#131b17]/90 relative">
              <Compass className="w-9 h-9 text-emerald-400 animate-spin-slow" />
            </div>
            
            {/* Text header */}
            <div className="text-center space-y-1.5 select-none">
              <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                SUMMIT GPS
              </h1>
              <p className="text-[9px] text-emerald-500/60 uppercase tracking-[0.25em] font-bold">
                Cargando tu próxima aventura...
              </p>
            </div>
            
            {/* Loading bar progress tracker */}
            <div className="w-36 h-0.5 bg-[#131b17] border border-[#1b3d2b]/30 rounded-full overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full w-full animate-loading-bar" />
            </div>
          </div>
        </div>
      )}

      {!authChecking && showAuthScreen && (
        <AuthScreen
          onAuthSuccess={handleAuthSuccess}
          onSkipAuth={handleSkipAuth}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CustomDialogProvider>
      <AppContent />
    </CustomDialogProvider>
  );
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code >= 1 && code <= 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 55) return "🌧️";
  if (code >= 61 && code <= 65) return "🌧️";
  if (code >= 71 && code <= 75) return "❄️";
  if (code === 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "☁️";
}

function getWeatherDescription(code: number): string {
  if (code === 0) return "Cielo Despejado";
  if (code >= 1 && code <= 3) return "Parcialmente Nublado";
  if (code === 45 || code === 48) return "Niebla";
  if (code >= 51 && code <= 55) return "Llovizna";
  if (code >= 61 && code <= 65) return "Lluvia Fuerte";
  if (code >= 71 && code <= 75) return "Nieve";
  if (code === 77) return "Nieve Granulada";
  if (code >= 80 && code <= 82) return "Chubascos de Lluvia";
  if (code >= 85 && code <= 86) return "Chubascos de Nieve";
  if (code >= 95 && code <= 99) return "Tormenta Eléctrica";
  return "Nubosidad";
}

function getWindDirectionCardinal(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(((degrees % 360) / 22.5)) % 16;
  return directions[index];
}
