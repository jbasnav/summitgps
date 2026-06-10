import { useState, useCallback, useMemo, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { MapContainer } from "./components/MapContainer";
import { ElevationProfile } from "./components/ElevationProfile";
import { WaypointModal } from "./components/WaypointModal";
import { WaypointInfoModal } from "./components/WaypointInfoModal";
import { Map3DCesiumModal } from "./components/Map3DCesiumModal";
import { useRoutePlanner, type Waypoint, type RoutePoint } from "./hooks/useRoutePlanner";
import { useImageLibrary } from "./hooks/useImageLibrary";
import type { BaseLayerId, CustomLayer } from "./components/LayerSelector";
import { Search, X, Compass, Loader, MapPin, Printer, CloudRain, Layers } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./utils/supabaseClient";
import { AuthScreen } from "./components/AuthScreen";
import PrintMapModal from "./components/PrintMapModal";
import { PlusModal } from "./components/PlusModal";
import { RouteConditionsPanel } from "./components/RouteConditionsPanel";
import { FloatingLayerSelector } from "./components/FloatingLayerSelector";
import { formatCoordinatesByFormat, parseCoordinateInput, calculateGeodesicArea, calculatePolygonPerimeter } from "./utils/geoUtils";
import { CustomDialogProvider, useCustomDialog } from "./components/CustomDialog";

function AppContent() {
  // Authentication States
  const [user, setUser] = useState<any | null>(null);
  // If the user previously chose "Skip" (guest mode), don't show the auth screen again on reload.
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(() => {
    if (localStorage.getItem("summit_guest_mode") === "1") return false;
    return true;
  });
  const [authChecking, setAuthChecking] = useState<boolean>(isSupabaseConfigured); // Check session if Supabase is configured

  // Image library (custom cover images for groups/collections/retos)
  const { images: libraryImages, uploading: libraryUploading, addImage: addLibraryImage, deleteImage: deleteLibraryImage, renameImage: renameLibraryImage } = useImageLibrary(user?.id ?? null);

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
    addWaypointToMarkers,
    addWaypointToTrack,
    addMultipleWaypoints,
    updateWaypoint,
    removeWaypoint,
    removeWaypoints,

    // Multi-track operations
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

    // Waypoint Groups / Challenges
    waypointGroups,
    addWaypointGroup,
    deleteWaypointGroup,
    updateWaypointGroup,
    toggleWaypointGroupVisibility,
    toggleGroupPublic,
    toggleWaypointCompleted,
    fetchCommunityContent,

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
    applySmoothTrack,
    applyRemoveOutliers,

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

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    address: string | null;       // full display_name
    osmName: string | null;       // specific feature name (peak, restaurant, etc.)
    osmClass: string | null;      // OSM class (natural, amenity, tourism…)
    osmType: string | null;       // OSM type (peak, restaurant, viewpoint…)
    loading: boolean;
  }>({ elevation: null, weather: null, address: null, osmName: null, osmClass: null, osmType: null, loading: false });

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [highlightedWptId, setHighlightedWptId] = useState<string | null>(null);

  // Automatically expand sidebar when a map location is marked
  useEffect(() => {
    if (markedLocation) {
      setIsSidebarCollapsed(false);
    }
  }, [markedLocation]);

  // Fetch location details (elevation, weather, reverse geocoding)
  useEffect(() => {
    if (!markedLocation) {
      setMarkedLocationDetails({ elevation: null, weather: null, address: null, osmName: null, osmClass: null, osmType: null, loading: false });
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

        // 3. Fetch Reverse Geocoding — zoom=18 to get specific POIs
        const geoPromise = fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'es' } }
        )
          .then(r => r.json())
          .then((data): { address: string | null; osmName: string | null; osmClass: string | null; osmType: string | null } => {
            if (!data || data.error) return { address: null, osmName: null, osmClass: null, osmType: null };
            return {
              address: data.display_name ?? null,
              osmName: data.name || data.namedetails?.name || null,
              osmClass: data.class || null,
              osmType: data.type || null,
            };
          })
          .catch(() => ({ address: null, osmName: null, osmClass: null, osmType: null }));

        const [elevation, weather, geoResult] = await Promise.all([elevPromise, weatherPromise, geoPromise]);

        if (isMounted) {
          setMarkedLocationDetails({
            elevation,
            weather,
            address: geoResult.address,
            osmName: geoResult.osmName,
            osmClass: geoResult.osmClass,
            osmType: geoResult.osmType,
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
  // Route edit panel & sub-panels (lifted from Sidebar so toolbar can control them)
  const [isRouteEditPanelOpen, setIsRouteEditPanelOpen] = useState<boolean>(false);

  // Splits highlight — which km/mile segment is selected in the SplitsTable
  const [selectedSplitNumber, setSelectedSplitNumber] = useState<number | null>(null);
  const [isStreetViewActive, setIsStreetViewActive] = useState<boolean>(false); // Street View active mode
  const [streetViewCoords, setStreetViewCoords] = useState<{ lat: number; lng: number } | null>(null); // Coordinates for Pegman
  const [streetViewAddress, setStreetViewAddress] = useState<string>(""); // Geocoded address for Street View
  const [isStreetViewFullscreen, setIsStreetViewFullscreen] = useState<boolean>(false); // Fullscreen Street View panel
  const [mapCenter, setMapCenter] = useState<[number, number] | null>([43.1906, -4.8322]);
  const [osmPois, setOsmPois] = useState<any[]>([]);

  // Waypoint Modal States
  const [isWptModalOpen, setIsWptModalOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [infoWaypoint, setInfoWaypoint] = useState<Waypoint | null>(null);
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

  // SummitGPS Plus & Weather states
  const [isPlusUser, setIsPlusUser] = useState<boolean>(() => {
    return localStorage.getItem("summitgps_is_plus") === "true";
  });
  const [isPlusModalOpen, setIsPlusModalOpen] = useState<boolean>(false);
  const [isRouteConditionsOpen, setIsRouteConditionsOpen] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<number>(720); // 12:00 PM in minutes
  const [is3DActive, setIs3DActive] = useState<boolean>(false);
  // Capas públicas España (2D + 3D)
  const [showProtectedAreas,  setShowProtectedAreas]  = useState(false);
  const [showCaminoSantiago,  setShowCaminoSantiago]  = useState(false);
  const [showSpainByBike,     setShowSpainByBike]     = useState(false);
  const [showMountainRefuges, setShowMountainRefuges] = useState(false);
  const [showHidrografia,    setShowHidrografia]    = useState(false);
  const [showOcupacionSuelo, setShowOcupacionSuelo] = useState(false);
  const [showTransportes,    setShowTransportes]    = useState(false);

  // Floating Layer Selector & Map Overlay options
  const [isLayerSelectorOpen, setIsLayerSelectorOpen] = useState<boolean>(false);
  const [showDistanceMarkers, setShowDistanceMarkers] = useState<boolean>(true);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(true);
  const [showCommunityWaypoints, setShowCommunityWaypoints] = useState<boolean>(false);
  const [showPersonalHeatmap, setShowPersonalHeatmap] = useState<boolean>(false);
  const [showCommunityHeatmap, setShowCommunityHeatmap] = useState<boolean>(false);
  const [showTerrainLimits, setShowTerrainLimits] = useState<boolean>(false);
  const [showNearbyTrails, setShowNearbyTrails] = useState<boolean>(false);
  const [showHikingTrails, setShowHikingTrails] = useState<boolean>(false);
  const [showCyclingTrails, setShowCyclingTrails] = useState<boolean>(false);
  const [showMtbTrails, setShowMtbTrails] = useState<boolean>(false);

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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${streetViewCoords.lat}&lon=${streetViewCoords.lng}&zoom=18`,
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
    }, 1100); // 1100ms debounce while dragging to satisfy Nominatim's 1 req/sec policy

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [streetViewCoords, isStreetViewActive]);

  // Waypoints for the MAP: all visible tracks (including route-embedded waypoints)
  const visibleWaypoints = useMemo(() => {
    if (!showWaypoints) return [];
    const list: Waypoint[] = [];
    const groupVisibilityMap = new Map(waypointGroups.map((g) => [g.id, g.visible]));
    const collectionVisibilityMap = new Map(routeCollections.map((c) => [c.id, c.visible]));
    tracks.forEach((t) => {
      const collectionId = t.collectionId || "default";
      const isCollectionVisible = collectionVisibilityMap.get(collectionId) !== false;
      if (t.visible && isCollectionVisible) {
        const isGlobalTrack = t.id === "waypoints-global-track";
        t.waypoints.forEach((w) => {
          if (isGlobalTrack) {
            const groupId = w.groupId || "default";
            if (groupVisibilityMap.get(groupId) === false) return;
          }
          list.push({ ...w, color: w.color || t.color });
        });
      }
    });
    return list;
  }, [tracks, waypointGroups, routeCollections, showWaypoints]);

  // Waypoints for the SIDEBAR Marcadores tab: ALL from waypoints-global-track (eye only hides from map)
  const sidebarWaypoints = useMemo(() => {
    const globalTrack = tracks.find((t) => t.id === "waypoints-global-track");
    return globalTrack?.waypoints || [];
  }, [tracks]);

  // Same reference — keep allGlobalWaypoints as alias for any consumer expecting it
  const allGlobalWaypoints = sidebarWaypoints;

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
        localStorage.removeItem("summit_guest_mode"); // user is authenticated
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
    // Remember the guest preference so we don't show the auth screen again on reload
    localStorage.setItem("summit_guest_mode", "1");
  }, []);

  const handleAuthSuccess = useCallback((authedUser: any) => {
    setUser(authedUser);
    setShowAuthScreen(false);
    // Clear guest flag — user is now authenticated
    localStorage.removeItem("summit_guest_mode");
  }, []);

  // Handle right-click on map to drop waypoint
  const handleRightClickMap = useCallback((lat: number, lng: number) => {
    setNewWptCoords([lat, lng]);
    setEditingWaypoint(null);
    setIsWptModalOpen(true);
  }, []);


  // Handle clicking a waypoint on map to edit it
  const handleEditWaypoint = useCallback((wpt: Waypoint) => {
    setEditingWaypoint(wpt);
    setNewWptCoords(null);
    setIsWptModalOpen(true);
  }, []);

  const handleShowWaypointInfo = useCallback((wpt: Waypoint) => {
    setInfoWaypoint(wpt);
  }, []);

  // Import an OSM POI directly as a waypoint (no modal)
  const handleAddOsmPoi = useCallback((poi: any) => {
    addWaypoint({
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      icon: poi.icon || "mountain",
      note: poi.note || (poi.elevation ? `Altitud: ${poi.elevation}m` : ""),
      color: poi.color || "#10b981",
      groupId: "default",
      completed: false,
      elevation: poi.elevation,
    });
  }, [addWaypoint]);

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
          addWaypointToMarkers({
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
    [editingWaypoint, newWptCoords, addWaypoint, addWaypointToMarkers, updateWaypoint, user]
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
        isPlusUser={isPlusUser}
        onOpenPlusModal={useCallback(() => setIsPlusModalOpen(true), [])}
        isRouteConditionsOpen={isRouteConditionsOpen}
        onToggleRouteConditions={useCallback(() => setIsRouteConditionsOpen(prev => !prev), [])}
        routeName={routeName}
        setRouteName={setRouteName}
        points={points}
        waypoints={sidebarWaypoints} // Only global waypoints for the Marcadores tab
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
        onDeleteWaypoints={removeWaypoints}
        onAddWaypointToMarkers={addWaypointToMarkers}
        onAddWaypointToTrack={addWaypointToTrack}
        allGlobalWaypoints={allGlobalWaypoints}
        onEditWaypoint={handleEditWaypoint}
        onUpdateWaypoint={updateWaypoint}
        onCreateNewTrack={createNewTrack}
        onDeleteTrack={deleteTrack}
        onDeleteMultipleTracks={deleteMultipleTracks}
        onToggleTrackVisibility={toggleTrackVisibility}
        onToggleTrackPublic={toggleTrackPublic}
        onSetTrackColor={setTrackColor}
        onMergeTracks={mergeTracks}
        onReverseTrack={reverseTrack}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onToggleShortcutsModal={useCallback(() => setIsShortcutsModalOpen(prev => !prev), [])}
        onRoundTripTrack={roundTripTrack}
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
        onToggleGroupPublic={toggleGroupPublic}
        onToggleWaypointCompleted={toggleWaypointCompleted}
        onFetchCommunityContent={fetchCommunityContent}
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
        isRouteEditPanelOpen={isRouteEditPanelOpen}
        setIsRouteEditPanelOpen={setIsRouteEditPanelOpen}
        applySimplifyTrack={applySimplifyTrack}
        trimTrack={trimTrack}
        applySmoothTrack={applySmoothTrack}
        applyRemoveOutliers={applyRemoveOutliers}
        libraryImages={libraryImages}
        libraryUploading={libraryUploading}
        onAddLibraryImage={addLibraryImage}
        onDeleteLibraryImage={deleteLibraryImage}
        onRenameLibraryImage={renameLibraryImage}
        selectedSplitNumber={selectedSplitNumber}
        onSelectSplit={setSelectedSplitNumber}
        onHighlightWpt={setHighlightedWptId}
      />

      {/* Point Info Drawer expanding the Sidebar */}
      {(isMobile || !isSidebarCollapsed) && markedLocation && (
        <div
          className={
            isMobile
              ? "fixed bottom-0 left-0 w-full rounded-t-2xl border-t border-[#1b3d2b] bg-[#131b17]/95 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col z-[9998] animate-slide-in-bottom pointer-events-auto transition-all duration-300"
              : "absolute w-[340px] md:w-[380px] border-l border-r border-[#1b3d2b] bg-[#131b17]/95 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col z-[9998] animate-slide-in-left pointer-events-auto transition-all duration-300"
          }
          style={
            isMobile
              ? { height: '55vh', left: 0 }
              : { left: isSidebarCollapsed ? 64 : 380, top: 144, height: 'calc(100vh - 144px)' }
          }
        >
          {/* Panel Header (Styled like GaiaGPS Premium Card) */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-[#1b3d2b] bg-[#0c120f]/60 select-none shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
                <svg className="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 4l6.5 13H5.5L12 6z"/>
                </svg>
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h3 className="text-xs font-bold text-slate-200 truncate leading-tight">
                  {markedLocationDetails.loading
                    ? "Buscando..."
                    : (markedLocationDetails.osmName || markedLocationDetails.address?.split(',')?.[0] || "Ubicación Marcada")}
                </h3>
                <p className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-wider truncate mt-0.5 leading-none">
                  {markedLocationDetails.loading
                    ? "Cargando info..."
                    : (getOsmTypeLabel(markedLocationDetails.osmClass, markedLocationDetails.osmType) ?? "Ubicación en el mapa")}
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
                {/* Dedicated coordinates and altitude block */}
                <div className="grid grid-cols-2 gap-2 bg-[#0c120f]/40 p-3 rounded-xl border border-[#1b3d2b] text-[11px] select-text shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Coordenadas</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-mono text-slate-300 truncate text-[10.5px]">
                        {markedLocation.lat.toFixed(5)}, {markedLocation.lng.toFixed(5)}
                      </p>
                      <button
                        onClick={() => {
                          const coordStr = formatCoordinatesByFormat(markedLocation.lat, markedLocation.lng, coordinateFormat);
                          navigator.clipboard.writeText(coordStr);
                          setCopiedCoords(true);
                          setTimeout(() => setCopiedCoords(false), 2000);
                        }}
                        className="p-1 rounded hover:bg-[#1b3d2b]/30 text-slate-500 hover:text-emerald-400 transition-all cursor-pointer shrink-0"
                        title="Copiar Coordenadas"
                      >
                        {copiedCoords ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-0.5 border-l border-[#1b3d2b] pl-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Altitud</span>
                    <p className="font-sans font-bold text-emerald-400 text-xs mt-0.5">
                      {markedLocationDetails.elevation !== null
                        ? (useImperial ? `${Math.round(markedLocationDetails.elevation * 3.28084)} ft` : `${Math.round(markedLocationDetails.elevation)} m`)
                        : "No disponible"}
                    </p>
                  </div>
                </div>
                {/* Clean Location Context — skip leading POI name since it's in the header */}
                {markedLocationDetails.address && (
                  <div className="text-[11px] text-slate-400 bg-[#0c120f]/20 border border-[#1b3d2b] px-3.5 py-2.5 rounded-lg leading-relaxed select-text flex items-center justify-between gap-2">
                    <span className="truncate">
                      {(() => {
                        const parts = markedLocationDetails.address.split(',');
                        // If osmName matches the first segment, skip it to avoid duplication
                        const firstPart = parts[0]?.trim();
                        const skip = markedLocationDetails.osmName && firstPart?.toLowerCase() === markedLocationDetails.osmName.toLowerCase();
                        return (skip ? parts.slice(1) : parts).join(',').trim() || "Área de montaña";
                      })()}
                    </span>
                    <button
                      onClick={() => {
                        const coordStr = formatCoordinatesByFormat(markedLocation.lat, markedLocation.lng, coordinateFormat);
                        navigator.clipboard.writeText(coordStr);
                        setCopiedCoords(true);
                        setTimeout(() => setCopiedCoords(false), 2000);
                      }}
                      className="p-1 rounded bg-[#131b17] border border-[#1b3d2b] hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer shrink-0"
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
                  <div className="space-y-4 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b] shadow-2xl backdrop-blur-md">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#1b3d2b]">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        ❄️ El Tiempo
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 bg-[#131b17]/80 px-1.5 py-0.5 rounded border border-[#1b3d2b]">
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
                        <div className="absolute inset-y-0 left-0 border-l border-[#1b3d2b]"></div>
                        
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
                    <div className="bg-[#131b17]/80 border border-[#1b3d2b] rounded-lg py-1.5 px-3 flex items-center justify-between text-[10px] text-slate-300 font-medium select-none">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">🌅</span>
                        <span>Amanece:</span>
                        <span className="font-mono font-bold text-emerald-400">{markedLocationDetails.weather.sunrise}</span>
                      </div>
                      <div className="h-3 w-px bg-[#1b3d2b]"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">🌇</span>
                        <span>Anochece:</span>
                        <span className="font-mono font-bold text-amber-500">{markedLocationDetails.weather.sunset}</span>
                      </div>
                    </div>

                    {/* Weekly Forecast Sub-Section (List Layout) */}
                    {markedLocationDetails.weather.daily && (
                      <div className="space-y-2 border-t border-[#1b3d2b] pt-3 mt-1">
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
                                className="flex items-center justify-between bg-[#131b17]/40 hover:bg-[#131b17]/85 border border-[#1b3d2b] hover:border-emerald-500/20 rounded-lg px-2.5 py-1.5 transition-all duration-150"
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
                        className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-[#1b3d2b]/30 hover:bg-[#1b3d2b]/60 border border-[#1b3d2b] hover:border-emerald-500/50 text-[10.5px] font-extrabold text-slate-200 hover:text-emerald-400 tracking-wider uppercase transition-all shadow-md cursor-pointer"
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
                    <div className="flex items-center justify-center gap-1.5 pt-3.5 border-t border-[#1b3d2b] text-[9.5px] text-slate-500 font-bold select-none">
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

          {/* 3D modal — CesiumJS globe viewer */}
          <Map3DCesiumModal
            isOpen={is3DActive}
            onClose={() => setIs3DActive(false)}
            trackPoints={(activeTrackForPrint?.points ?? []) as any}
            trackColor={activeTrackForPrint?.color ?? "#10b981"}
            trackName={activeTrackForPrint?.name ?? "Ruta activa"}
          />

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
            onShowWaypointInfo={handleShowWaypointInfo}
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
            selectedSplitNumber={selectedSplitNumber}
            isStreetViewActive={isStreetViewActive}
            streetViewCoords={streetViewCoords}
            onStreetViewCoordsChange={useCallback((lat: number, lng: number) => {
              setStreetViewCoords({ lat, lng });
            }, [])}
            customLayers={customLayers}
            showSlopeShading={showSlopeShading}
            slopeShadingOpacity={slopeShadingOpacity}
            highlightedWptId={highlightedWptId}
            showDistanceMarkers={showDistanceMarkers}
            showPersonalHeatmap={showPersonalHeatmap}
            showCommunityHeatmap={showCommunityHeatmap}
            showTerrainLimits={showTerrainLimits}
            showNearbyTrails={showNearbyTrails}
            showHikingTrails={showHikingTrails}
            showCyclingTrails={showCyclingTrails}
            showMtbTrails={showMtbTrails}
            showCommunityWaypoints={showCommunityWaypoints}
            showProtectedAreas={showProtectedAreas}
            showCaminoSantiago={showCaminoSantiago}
            showSpainByBike={showSpainByBike}
            showMountainRefuges={showMountainRefuges}
            showHidrografia={showHidrografia}
            showOcupacionSuelo={showOcupacionSuelo}
            showTransportes={showTransportes}
          />
          {/* Day/Night solar simulated illumination overlay */}
          {(() => {
            const getNightOpacity = (minutes: number) => {
              if (minutes < 300 || minutes > 1320) {
                return 0.75;
              } else if (minutes >= 300 && minutes < 420) {
                const progress = (minutes - 300) / 120;
                return 0.75 * (1 - progress);
              } else if (minutes >= 1200 && minutes <= 1320) {
                const progress = (minutes - 1200) / 120;
                return 0.75 * progress;
              } else {
                return 0;
              }
            };
            const opacity = getNightOpacity(simulatedTime);
            if (opacity === 0) return null;
            return (
              <div 
                className="absolute inset-0 z-[1000] pointer-events-none mix-blend-multiply transition-opacity duration-500 animate-fade-in"
                style={{ 
                  backgroundColor: "#070c24", 
                  opacity: opacity 
                }} 
              />
            );
          })()}

          {/* ── Fin Ruta floating button (visible only while drawing) ── */}
          {isDrawing && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[4500] pointer-events-auto animate-fade-in">
              <button
                onClick={() => setIsDrawing(false)}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-sm shadow-2xl shadow-emerald-500/40 transition-all border border-emerald-400/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Finalizar Ruta
              </button>
            </div>
          )}

          {/* ── Unified right-side vertical button group ── */}
          <div className="absolute top-4 right-4 z-[4000] pointer-events-auto flex flex-col gap-2">

            {/* Capas / Layer Selector */}
            <div className="relative group">
              <button onClick={() => setIsLayerSelectorOpen(prev => !prev)} title="Capas del Mapa"
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all duration-150 ${isLayerSelectorOpen ? "bg-[#131b17]/95 border-[#1b3d2b] text-emerald-400" : "bg-[#131b17]/95 border-[#1b3d2b] text-slate-400"} hover:text-emerald-400`}>
                <Layers className="w-[18px] h-[18px]" />
              </button>
              <span className="absolute top-1/2 right-full -translate-y-1/2 mr-2 whitespace-nowrap text-[9px] font-semibold text-slate-200 bg-[#0b100d] border border-[#1b3d2b] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">Capas del Mapa</span>
            </div>

            {/* Printer */}
            <div className="relative group">
              <button onClick={() => setIsPrintModalOpen(true)} title="Imprimir Mapa"
                className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all duration-150 bg-[#131b17]/95 border-[#1b3d2b] text-slate-400 hover:text-emerald-400">
                <Printer className="w-[18px] h-[18px]" />
              </button>
              <span className="absolute top-1/2 right-full -translate-y-1/2 mr-2 whitespace-nowrap text-[9px] font-semibold text-slate-200 bg-[#0b100d] border border-[#1b3d2b] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">Imprimir Mapa</span>
            </div>

            {/* Condiciones del Clima */}
            <div className="relative group">
              <button onClick={() => setIsRouteConditionsOpen(prev => !prev)} title="Condiciones de la Ruta"
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all duration-150 ${isRouteConditionsOpen ? "bg-[#131b17]/95 border-[#1b3d2b] text-emerald-400" : "bg-[#131b17]/95 border-[#1b3d2b] text-slate-400"} hover:text-emerald-400`}>
                <CloudRain className="w-[18px] h-[18px]" />
              </button>
              <span className="absolute top-1/2 right-full -translate-y-1/2 mr-2 whitespace-nowrap text-[9px] font-semibold text-slate-200 bg-[#0b100d] border border-[#1b3d2b] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">Condiciones de la Ruta</span>
            </div>

            {/* Perfil de Elevación toggle */}
            <div className="relative group">
              <button onClick={() => setIsChartCollapsed(prev => !prev)} title="Perfil de Elevación"
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all duration-150 ${!isChartCollapsed ? "bg-[#131b17]/95 border-[#1b3d2b] text-emerald-400" : "bg-[#131b17]/95 border-[#1b3d2b] text-slate-400"} hover:text-emerald-400`}>
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L12 7l3 6 2-3 3 4" />
                </svg>
              </button>
              <span className="absolute top-1/2 right-full -translate-y-1/2 mr-2 whitespace-nowrap text-[9px] font-semibold text-slate-200 bg-[#0b100d] border border-[#1b3d2b] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">{isChartCollapsed ? "Mostrar Elevación" : "Ocultar Elevación"}</span>
            </div>

            {/* Vista 3D */}
            <div className="relative group">
              <button onClick={() => { if (!isPlusUser) { setIsPlusModalOpen(true); } else { setIs3DActive(prev => !prev); } }} title="Vista 3D"
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all duration-150 ${is3DActive ? "bg-[#131b17]/95 border-[#1b3d2b] text-emerald-400" : "bg-[#131b17]/95 border-[#1b3d2b] text-slate-400"} hover:text-emerald-400`}>
                <span className="text-[10px] font-extrabold tracking-tighter">3D</span>
              </button>
              <span className="absolute top-1/2 right-full -translate-y-1/2 mr-2 whitespace-nowrap text-[9px] font-semibold text-slate-200 bg-[#0b100d] border border-[#1b3d2b] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">Vista 3D {!isPlusUser && "(Plus)"}</span>
            </div>

            {/* Street View */}
            <div className="relative group">
              <button onClick={() => { setIsStreetViewActive((prev) => { const next = !prev; if (next) { setIsDrawing(false); setIsDrawingArea(false); setIsSplitting(false); setIsEditingRoute(false); setIsCleaningArea(false); if (!streetViewCoords && mapInstance) { const center = mapInstance.getCenter(); setStreetViewCoords({ lat: center.lat, lng: center.lng }); } } return next; }); }} title={isStreetViewActive ? "Desactivar Vista de Calle" : "Activar Vista de Calle"}
                className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all duration-150 ${isStreetViewActive ? "bg-[#131b17]/95 border-[#1b3d2b] text-emerald-400" : "bg-[#131b17]/95 border-[#1b3d2b] text-slate-400"} hover:text-emerald-400`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="4" r="2"/><path d="M12 6c-1.1 0-2 .9-2 2v5h1v7h2v-7h1V8c0-1.1-.9-2-2-2z"/></svg>
              </button>
              <span className="absolute top-1/2 right-full -translate-y-1/2 mr-2 whitespace-nowrap text-[9px] font-semibold text-slate-200 bg-[#0b100d] border border-[#1b3d2b] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">Vista de Calle</span>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="relative group">
              <button onClick={() => setIsShortcutsModalOpen(true)} title="Atajos de Teclado (?)"
                className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center cursor-pointer border transition-all duration-150 bg-[#131b17]/95 border-[#1b3d2b] text-slate-400 hover:text-emerald-400">
                <Compass className="w-[18px] h-[18px]" />
              </button>
              <span className="absolute top-1/2 right-full -translate-y-1/2 mr-2 whitespace-nowrap text-[9px] font-semibold text-slate-200 bg-[#0b100d] border border-[#1b3d2b] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">Atajos de Teclado (?)</span>
            </div>
          </div>



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


          </div>

          {/* Street View Panel (Split Screen) */}
          {isStreetViewActive && streetViewCoords && (
            <div
              className={`border-[#1b3d2b] bg-[#0a0e0c]/95 backdrop-blur-md flex flex-col z-[3000] transition-all duration-300 shrink-0 overflow-hidden ${
                isStreetViewFullscreen
                  ? "w-full h-full border-0"
                  : "w-full md:w-[40%] h-[40%] md:h-full border-t md:border-t-0 md:border-l border-[#1b3d2b]"
              }`}
            >
              {/* Glassmorphic Panel Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-[#1b3d2b] bg-[#0c120f]/60 select-none shrink-0">
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
        {points.length > 0 && !isChartCollapsed && (() => {
          const leftSpacing = isSidebarCollapsed
            ? 64
            : (markedLocation && !isMobile ? 760 : 380);
          return (
            <div
              className="absolute bottom-4 right-16 z-[2000] pointer-events-auto transition-all duration-300"
              style={{
                width: `calc(100vw - ${leftSpacing + 80}px)`,
                maxWidth: '640px'
              }}
            >
              <div className="h-[200px]">
                <ElevationProfile
                  points={points}
                  useImperial={useImperial}
                  onHoverPoint={setHoverPoint}
                  selectedRange={selectedRange}
                  onSelectRange={setSelectedRange}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Waypoint Info Modal */}
      <WaypointInfoModal
        isOpen={infoWaypoint !== null}
        waypoint={infoWaypoint}
        onClose={() => setInfoWaypoint(null)}
      />

      {/* Waypoint Modal */}
      <WaypointModal
        isOpen={isWptModalOpen}
        onClose={() => { setIsWptModalOpen(false); setEditingWaypoint(null); setNewWptCoords(null); }}
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
            <div className="flex items-center gap-3 border-b border-[#1b3d2b] pb-4 mb-4 select-none">
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
                  <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0c120f]/80 border border-[#1b3d2b] hover:border-emerald-500/30 transition-all select-none">
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
            <div className="border-t border-[#1b3d2b] pt-4 flex items-center justify-between">
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
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#1b3d2b] flex items-center justify-center shadow-2xl bg-[#131b17]/90 relative">
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
            <div className="w-36 h-0.5 bg-[#131b17] border border-[#1b3d2b] rounded-full overflow-hidden relative">
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

      {/* SummitGPS Plus Modal */}
      <PlusModal
        isOpen={isPlusModalOpen}
        onClose={() => setIsPlusModalOpen(false)}
        onUpgradeSuccess={() => {
          setIsPlusUser(true);
          localStorage.setItem("summitgps_is_plus", "true");
          setIsPlusModalOpen(false);
          customAlert("¡Felicidades! Has desbloqueado SummitGPS Plus de manera exitosa. Todas las funciones premium ya están disponibles.");
        }}
      />

      {/* Route Conditions Panel */}
      <RouteConditionsPanel
        isOpen={isRouteConditionsOpen}
        onClose={() => setIsRouteConditionsOpen(false)}
        isPlusUser={isPlusUser}
        onOpenPlusModal={() => {
          setIsRouteConditionsOpen(false);
          setIsPlusModalOpen(true);
        }}
        points={activeTrackForPrint?.points || []}
        useImperial={useImperial}
        simulatedTime={simulatedTime}
        onChangeSimulatedTime={setSimulatedTime}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Floating Layer Selector */}
      <FloatingLayerSelector
        isOpen={isLayerSelectorOpen}
        onClose={() => setIsLayerSelectorOpen(false)}
        activeBaseLayer={activeBaseLayer}
        onChangeBaseLayer={setActiveBaseLayer}
        showPersonalHeatmap={showPersonalHeatmap}
        onTogglePersonalHeatmap={() => setShowPersonalHeatmap(prev => !prev)}
        showCommunityHeatmap={showCommunityHeatmap}
        onToggleCommunityHeatmap={() => setShowCommunityHeatmap(prev => !prev)}
        showTerrainLimits={showTerrainLimits}
        onToggleTerrainLimits={() => setShowTerrainLimits(prev => !prev)}
        showContours={showContours}
        onToggleContours={() => setShowContours(prev => !prev)}
        overlayOpacity={overlayOpacity}
        onChangeOverlayOpacity={setOverlayOpacity}
        showSlopeShading={showSlopeShading}
        onToggleSlopeShading={() => setShowSlopeShading(prev => !prev)}
        slopeShadingOpacity={slopeShadingOpacity}
        onChangeSlopeShadingOpacity={setSlopeShadingOpacity}
        showDistanceMarkers={showDistanceMarkers}
        onToggleDistanceMarkers={() => setShowDistanceMarkers(prev => !prev)}
        showWaypoints={showWaypoints}
        onToggleWaypoints={() => setShowWaypoints(prev => !prev)}
        showCommunityWaypoints={showCommunityWaypoints}
        onToggleCommunityWaypoints={() => setShowCommunityWaypoints(prev => !prev)}
        showNearbyTrails={showNearbyTrails}
        onToggleNearbyTrails={() => setShowNearbyTrails(prev => !prev)}
        showHikingTrails={showHikingTrails}
        onToggleHikingTrails={() => setShowHikingTrails(prev => !prev)}
        showCyclingTrails={showCyclingTrails}
        onToggleCyclingTrails={() => setShowCyclingTrails(prev => !prev)}
        showMtbTrails={showMtbTrails}
        onToggleMtbTrails={() => setShowMtbTrails(prev => !prev)}
        showProtectedAreas={showProtectedAreas}
        onToggleProtectedAreas={() => setShowProtectedAreas(prev => !prev)}
        showCaminoSantiago={showCaminoSantiago}
        onToggleCaminoSantiago={() => setShowCaminoSantiago(prev => !prev)}
        showSpainByBike={showSpainByBike}
        onToggleSpainByBike={() => setShowSpainByBike(prev => !prev)}
        showMountainRefuges={showMountainRefuges}
        onToggleMountainRefuges={() => setShowMountainRefuges(prev => !prev)}
        showHidrografia={showHidrografia}
        onToggleHidrografia={() => setShowHidrografia(prev => !prev)}
        showOcupacionSuelo={showOcupacionSuelo}
        onToggleOcupacionSuelo={() => setShowOcupacionSuelo(prev => !prev)}
        showTransportes={showTransportes}
        onToggleTransportes={() => setShowTransportes(prev => !prev)}
        isPlusUser={isPlusUser}
        onOpenPlusModal={() => setIsPlusModalOpen(true)}
      />
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

/** Spanish label + emoji for an OSM class:type pair */
function getOsmTypeLabel(osmClass: string | null, osmType: string | null): string | null {
  if (!osmClass || !osmType) return null;
  const key = `${osmClass}:${osmType}`;
  const labels: Record<string, string> = {
    "natural:peak": "🏔️ Cima / Cumbre",
    "natural:saddle": "⛰️ Collado / Puerto de Montaña",
    "natural:cliff": "🪨 Acantilado",
    "natural:spring": "💧 Manantial / Fuente",
    "natural:water": "🏞️ Lago / Embalse",
    "natural:wetland": "🌿 Humedal",
    "natural:wood": "🌲 Bosque / Arboleda",
    "natural:grassland": "🌿 Pradera / Pastizal",
    "natural:scrub": "🌿 Matorral",
    "natural:scree": "🪨 Zona de Pedregal",
    "natural:cave_entrance": "🕳️ Entrada de Cueva",
    "natural:glacier": "🧊 Glaciar",
    "natural:beach": "🏖️ Playa",
    "natural:coastline": "🌊 Línea de Costa",
    "natural:volcano": "🌋 Volcán",
    "natural:ridge": "⛰️ Cresta de Montaña",
    "natural:valley": "🏔️ Valle",
    "amenity:restaurant": "🍽️ Restaurante",
    "amenity:cafe": "☕ Cafetería",
    "amenity:bar": "🍺 Bar",
    "amenity:fast_food": "🍔 Comida Rápida",
    "amenity:parking": "🅿️ Aparcamiento",
    "amenity:fuel": "⛽ Gasolinera",
    "amenity:hospital": "🏥 Hospital",
    "amenity:pharmacy": "💊 Farmacia",
    "amenity:school": "🏫 Colegio",
    "amenity:place_of_worship": "⛪ Iglesia / Lugar de Culto",
    "amenity:shelter": "🛖 Refugio / Cobertizo",
    "amenity:toilets": "🚻 Aseos Públicos",
    "amenity:drinking_water": "💧 Fuente de Agua Potable",
    "amenity:bicycle_rental": "🚲 Alquiler de Bicis",
    "amenity:bench": "🪑 Banco",
    "amenity:picnic_site": "🧺 Área de Picnic",
    "tourism:viewpoint": "👁️ Mirador / Punto de Vista",
    "tourism:hotel": "🏨 Hotel",
    "tourism:hostel": "🏠 Albergue / Hostal",
    "tourism:campsite": "⛺ Zona de Camping",
    "tourism:attraction": "🎯 Atracción Turística",
    "tourism:museum": "🏛️ Museo",
    "tourism:information": "ℹ️ Centro de Información",
    "tourism:alpine_hut": "🏔️ Refugio de Montaña",
    "tourism:wilderness_hut": "🏕️ Refugio Rústico",
    "tourism:caravan_site": "🚐 Área de Autocaravanas",
    "historic:castle": "🏰 Castillo",
    "historic:ruins": "🏚️ Ruinas Históricas",
    "historic:monument": "🗽 Monumento",
    "historic:church": "⛪ Iglesia Histórica",
    "historic:archaeological_site": "⚱️ Yacimiento Arqueológico",
    "historic:fort": "🏰 Fortaleza",
    "historic:boundary_stone": "🪨 Mojón Histórico",
    "highway:footway": "🚶 Sendero Peatonal",
    "highway:path": "🥾 Camino / Senda",
    "highway:track": "🛤️ Pista Forestal / Rural",
    "highway:cycleway": "🚴 Carril Bici",
    "highway:residential": "🏘️ Calle Residencial",
    "highway:primary": "🛣️ Carretera Principal",
    "highway:secondary": "🛣️ Carretera Secundaria",
    "highway:tertiary": "🛣️ Carretera Terciaria",
    "highway:service": "🛣️ Vía de Servicio",
    "leisure:park": "🌳 Parque",
    "leisure:sports_centre": "🏃 Centro Deportivo",
    "leisure:pitch": "⚽ Campo Deportivo",
    "leisure:garden": "🌸 Jardín Público",
    "leisure:golf_course": "⛳ Campo de Golf",
    "waterway:river": "🌊 Río",
    "waterway:stream": "💧 Arroyo",
    "waterway:canal": "🚢 Canal",
    "waterway:waterfall": "💧 Cascada / Salto de Agua",
    "place:village": "🏘️ Pueblo",
    "place:town": "🏙️ Localidad",
    "place:city": "🏙️ Ciudad",
    "place:hamlet": "🏡 Aldea",
    "place:neighbourhood": "🏘️ Barrio",
    "place:suburb": "🏘️ Barrio / Distrito",
    "landuse:forest": "🌲 Zona Forestal",
    "landuse:farmland": "🌾 Terreno Agrícola",
    "landuse:meadow": "🌿 Pradera",
    "landuse:vineyard": "🍇 Viñedo",
    "landuse:orchard": "🍎 Huerto / Frutales",
    "mountain_pass:pass": "⛰️ Puerto de Montaña",
  };
  return labels[key] ?? null;
}
