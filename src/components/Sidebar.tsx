import React, { useState } from "react";
import {
  Compass,
  Search,
  Layers as LayersIcon,
  MapPin,
  Route,
  Trash2,
  Download,
  Upload,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Loader,
  Eye,
  EyeOff,
  Plus,
  Scissors,
  Link,
  Edit2,
  Trophy,
  ChevronDown,
  ChevronUp,
  Check,
  LogOut,
  X,
  Settings,
  Folder,
  ArrowLeftRight,
  RefreshCw,
  Hexagon,
  Palette,
  Trees,
} from "lucide-react";
import { LayerSelector, type BaseLayerId, type CustomLayer } from "./LayerSelector";
import { StatsPanel } from "./StatsPanel";
import { parseGPX, exportToGPX } from "../utils/gpxExporter";
import { parseGeoJSON, exportToGeoJSON } from "../utils/geojsonParser";
import { parseKML, exportToKML } from "../utils/kmlParser";
import { parseFIT } from "../utils/fitParser";
import { LANDSCAPE_IMAGES, type Track, type RouteCollection, type RoutingProfile, type Area } from "../hooks/useRoutePlanner";
import { formatArea, calculatePolygonPerimeter } from "../utils/geoUtils";
import { useCustomDialog } from "./CustomDialog";
import { WPT_ICONS } from "../utils/iconLibrary";



interface SidebarProps {
  routeName: string;
  setRouteName: (name: string) => void;
  points: any[];
  waypoints: any[];
  tracks: Track[];
  activeTrackId: string | null;
  setActiveTrackId: (id: string | null) => void;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  isSplitting: boolean;
  setIsSplitting: (splitting: boolean) => void;
  snapToTrail: boolean;
  setSnapToTrail: (snap: boolean) => void;
  routingProfile: RoutingProfile;
  setRoutingProfile: (profile: RoutingProfile) => void;
  distance: number;
  ascent: number;
  descent: number;
  loading: boolean;
  onClearRoute: () => void;
  onUndoPoint: () => void;
  onImportRoute: (name: string, points: any[], waypoints: any[]) => void;
  onFlyToCoords: (lat: number, lng: number) => void;
  onDeleteWaypoint: (id: string) => void;
  onEditWaypoint: (wpt: any) => void;
  onUpdateWaypoint?: (id: string, fields: any) => void;
  
  // Multi-track additions
  onCreateNewTrack: (name?: string, collectionId?: string) => string;
  onDeleteTrack: (id: string) => void;
  onDeleteMultipleTracks?: (ids: string[]) => void;
  onToggleTrackVisibility: (id: string) => void;
  onSetTrackColor: (id: string, color: string) => void;
  onMergeTracks: (ids: string[], name?: string) => void;
  
  // Layer controls
  activeBaseLayer: BaseLayerId;
  onChangeBaseLayer: (id: BaseLayerId) => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (opacity: number) => void;
  showContours: boolean;
  onToggleContours: () => void;

  // Units
  useImperial: boolean;
  onToggleUnits: () => void;

  // Coordinate and Grid formatting settings
  coordinateFormat: "dd" | "ddm" | "dms" | "utm" | "mgrs";
  onChangeCoordinateFormat: (format: "dd" | "ddm" | "dms" | "utm" | "mgrs") => void;
  gridOverlay: "none" | "dd" | "dms" | "utm" | "mgrs";
  onChangeGridOverlay: (grid: "none" | "dd" | "dms" | "utm" | "mgrs") => void;
  showGridLabels: boolean;
  onToggleGridLabels: () => void;

  // Waypoint Groups / Challenges Props
  waypointGroups: any[];
  onAddWaypointGroup: (group: { id?: string; name: string; description: string; color: string; visible: boolean; image?: string }) => any;
  onDeleteWaypointGroup: (id: string) => void;
  onUpdateWaypointGroup: (id: string, group: { name?: string; description?: string; color?: string; visible?: boolean; image?: string }) => void;
  onToggleWaypointGroupVisibility: (id: string) => void;
  onToggleWaypointCompleted: (id: string) => void;

  // Route Collections Props
  routeCollections: RouteCollection[];
  onAddRouteCollection: (collection: { id?: string; name: string; description: string; color: string; visible: boolean; image?: string }) => any;
  onDeleteRouteCollection: (id: string) => void;
  onUpdateRouteCollection: (id: string, collection: { name?: string; description?: string; color?: string; visible?: boolean; image?: string }) => void;
  onToggleRouteCollectionVisibility: (id: string) => void;
  onSetTrackCollection: (trackId: string, collectionId: string) => void;

  // OSM POI & JSON Bulk Import additions
  mapCenter: [number, number] | null;
  osmPois: any[];
  onSetOsmPois: (pois: any[]) => void;
  onAddOsmPoi: (poi: any) => void;
  onAddWaypoint: (wpt: any) => void;
  onAddMultipleWaypoints?: (wpts: any[], trackName?: string) => void;
  onRequestAddWaypointAtCenter?: (groupId?: string) => void;

  // Authentication Props
  user: any | null;
  onSignOut: () => void;
  onSignInClick: () => void;
  isSupabaseConfigured: boolean;

  // Lifted selection state
  isBulkMode: boolean;
  selectedWptIds: string[];
  setSelectedWptIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPoiIds: string[];
  onSetSelectedPoiIds: React.Dispatch<React.SetStateAction<string[]>>;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;

  // Area Drawing and Measurement props
  isDrawingArea: boolean;
  setIsDrawingArea: (drawing: boolean) => void;
  areas: Area[];
  onUpdateArea: (id: string, fields: Partial<Area>) => void;
  onDeleteArea: (id: string) => void;
  onToggleAreaVisibility: (id: string) => void;
  onReverseTrack: (trackId: string) => void;
  isEditingRoute: boolean;
  setIsEditingRoute: (editing: boolean) => void;
  onTrimTrack: (trackId: string, startIndex: number, endIndex: number) => void;
  onRoundTripTrack: (trackId: string) => void;
  applySimplifyTrack?: (id: string, tolerance: number) => void;
  cleanTrackArea?: (id: string, bounds: { north: number; south: number; east: number; west: number }, keepInside: boolean) => void;
  isCleaningArea?: boolean;
  setIsCleaningArea?: (cleaning: boolean) => void;
  cleanBounds?: { north: number; south: number; east: number; west: number } | null;
  setCleanBounds?: (bounds: { north: number; south: number; east: number; west: number } | null) => void;
  trackColorMode: "solid" | "slope" | "elevation" | "heartRate" | "cadence" | "power" | "speed";
  setTrackColorMode: (mode: "solid" | "slope" | "elevation" | "heartRate" | "cadence" | "power" | "speed") => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleShortcutsModal: () => void;
  isStreetViewActive: boolean;
  onToggleStreetView: () => void;

  // Custom layers and slope shading props (Fase 13)
  customLayers?: CustomLayer[];
  onAddCustomLayer?: (layer: Omit<CustomLayer, "id" | "visible" | "opacity">) => void;
  onDeleteCustomLayer?: (id: string) => void;
  onToggleCustomLayer?: (id: string) => void;
  onUpdateCustomLayerOpacity?: (id: string, opacity: number) => void;
  showSlopeShading?: boolean;
  onToggleSlopeShading?: () => void;
  slopeShadingOpacity?: number;
  onChangeSlopeShadingOpacity?: (opacity: number) => void;
}

type TabId = "search" | "layers" | "route" | "waypoints" | "challenges" | "settings";



const DEFAULT_TRACK_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"];

export function Sidebar({
  routeName,
  setRouteName,
  points,
  waypoints,
  tracks,
  activeTrackId,
  setActiveTrackId,
  isDrawing,
  setIsDrawing,
  isSplitting,
  setIsSplitting,
  routingProfile,
  setRoutingProfile,
  distance,
  ascent,
  descent,
  loading,
  onClearRoute,
  onUndoPoint,
  onImportRoute,
  onFlyToCoords,
  onDeleteWaypoint,
  onEditWaypoint,
  onUpdateWaypoint,
  onCreateNewTrack,
  onDeleteTrack,
  onDeleteMultipleTracks,
  onToggleTrackVisibility,
  onSetTrackColor,
  onMergeTracks,
  activeBaseLayer,
  onChangeBaseLayer,
  overlayOpacity,
  onChangeOverlayOpacity,
  showContours,
  onToggleContours,
  useImperial,
  onToggleUnits,
  waypointGroups,
  onAddWaypointGroup,
  onDeleteWaypointGroup,
  onUpdateWaypointGroup,
  onToggleWaypointGroupVisibility,
  onToggleWaypointCompleted,
  routeCollections,
  onAddRouteCollection,
  onDeleteRouteCollection,
  onUpdateRouteCollection,
  onToggleRouteCollectionVisibility,
  onSetTrackCollection,
  mapCenter,
  osmPois,
  onSetOsmPois,
  onAddOsmPoi,
  onAddWaypoint,
  onAddMultipleWaypoints,
  onRequestAddWaypointAtCenter,
  user,
  onSignOut,
  onSignInClick,
  isSupabaseConfigured,
  isBulkMode,
  selectedWptIds,
  setSelectedWptIds,
  selectedPoiIds,
  onSetSelectedPoiIds,
  coordinateFormat,
  onChangeCoordinateFormat,
  gridOverlay,
  onChangeGridOverlay,
  showGridLabels,
  onToggleGridLabels,
  isCollapsed,
  setIsCollapsed,
  isDrawingArea,
  setIsDrawingArea,
  areas,
  onUpdateArea,
  onDeleteArea,
  onToggleAreaVisibility,
  onReverseTrack,
  isEditingRoute,
  setIsEditingRoute,
  onTrimTrack,
  onRoundTripTrack,
  applySimplifyTrack,
  cleanTrackArea,
  isCleaningArea,
  setIsCleaningArea,
  cleanBounds,
  setCleanBounds,
  trackColorMode,
  setTrackColorMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleShortcutsModal,
  isStreetViewActive,
  onToggleStreetView,
  customLayers = [],
  onAddCustomLayer,
  onDeleteCustomLayer,
  onToggleCustomLayer,
  onUpdateCustomLayerOpacity,
  showSlopeShading = false,
  onToggleSlopeShading,
  slopeShadingOpacity = 0.6,
  onChangeSlopeShadingOpacity,
}: SidebarProps) {
  const { customAlert, customConfirm, customPrompt } = useCustomDialog();
  const [activeTab, setActiveTab] = useState<TabId>("route");

  // Header hero image — rotates on each mount
  const HERO_IMAGES = [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1486823249359-2731bd6dafc7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1439853949212-36589f9a6400?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
  ];
  const [heroImage] = useState(() => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)]);
  
  // Local states for Trim/Crop Track
  const [showTrimPanel, setShowTrimPanel] = useState(false);
  const [showSimplifyPanel, setShowSimplifyPanel] = useState(false);
  const [simplifyTolerance, setSimplifyTolerance] = useState(5);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Sync trim sliders with active track points length
  React.useEffect(() => {
    if (points && points.length > 0) {
      setTrimStart(0);
      setTrimEnd(points.length - 1);
    }
  }, [points]);
  
  const displayTracks = tracks.filter((t) => t.id !== "waypoints-global-track");
  
  // Track Library selection state for merging
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);

  // Waypoint Groups / Challenges state
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [isOsmSearchOpen, setIsOsmSearchOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#10b981");
  const [newGroupImage, setNewGroupImage] = useState("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80");

  // Route Collections state
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("#10b981");
  const [newCollectionImage, setNewCollectionImage] = useState("https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80");

  // Library Search state
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");

  // OpenStreetMap POI Downloader states
  const [osmCategory, setOsmCategory] = useState("peak");
  const [osmRadius, setOsmRadius] = useState(5); // default 5km
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmSearchExecuted, setOsmSearchExecuted] = useState(false);
  const [importTargetGroupId, setImportTargetGroupId] = useState<string>("default");

  // OpenStreetMap Routes (Rutas OSM) states
  const [isOsmRoutesOpen, setIsOsmRoutesOpen] = useState(false);
  const [osmRouteRadius, setOsmRouteRadius] = useState(10); // km
  const [osmRouteType, setOsmRouteType] = useState<"hiking" | "bicycle" | "mtb" | "foot">("hiking");
  const [osmRouteLoading, setOsmRouteLoading] = useState(false);
  const [osmRouteResults, setOsmRouteResults] = useState<any[]>([]);
  const [osmRouteSearchDone, setOsmRouteSearchDone] = useState(false);
  const [osmRouteImportingId, setOsmRouteImportingId] = useState<string | null>(null);
  const [groupSearchQueries, setGroupSearchQueries] = useState<Record<string, string>>({});
  const [isRouteEditPanelOpen, setIsRouteEditPanelOpen] = useState(false);

  // Automatically clear OSM POIs from the map when search widget is closed or tab is changed
  React.useEffect(() => {
    if (activeTab !== "waypoints" || !isOsmSearchOpen) {
      if (osmPois && osmPois.length > 0) {
        onSetOsmPois([]);
      }
      setOsmSearchExecuted(false);
    }
  }, [activeTab, isOsmSearchOpen, onSetOsmPois, osmPois]);

  const handleOsmSearch = async () => {
    if (!mapCenter) {
      await customAlert("Coordenadas del mapa no disponibles. Mueve el mapa primero.");
      return;
    }
    setOsmLoading(true);
    setOsmSearchExecuted(true);
    onSetOsmPois([]); // clear existing

    try {
      const [lat, lng] = mapCenter;
      const radiusMeters = osmRadius * 1000;
      
      let overpassFilter = "";
      if (osmCategory === "peak") {
        overpassFilter = `node["natural"="peak"](around:${radiusMeters},${lat},${lng});`;
      } else if (osmCategory === "camp") {
        overpassFilter = `node["tourism"~"camp_site|alpine_hut"](around:${radiusMeters},${lat},${lng});`;
      } else if (osmCategory === "water") {
        overpassFilter = `node["amenity"="drinking_water"](around:${radiusMeters},${lat},${lng});node["natural"="spring"](around:${radiusMeters},${lat},${lng});`;
      } else if (osmCategory === "camera") {
        overpassFilter = `node["tourism"="viewpoint"](around:${radiusMeters},${lat},${lng});`;
      }

      const query = `[out:json][timeout:15];(${overpassFilter});out body;`;
      
      const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://z.overpass-api.de/api/interpreter"
      ];
      
      let data = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          const url = `${endpoint}?data=${encodeURIComponent(query)}`;
          const response = await fetch(url);
          if (response.ok) {
            data = await response.json();
            break; // Success!
          } else {
            console.warn(`OSM endpoint ${endpoint} returned status ${response.status}`);
            lastError = new Error(`Status ${response.status} from ${endpoint}`);
          }
        } catch (err: any) {
          console.warn(`OSM endpoint ${endpoint} failed:`, err);
          lastError = err;
        }
      }
      
      if (!data) {
        throw lastError || new Error("No se pudo obtener datos de ningún servidor de OpenStreetMap.");
      }

      if (data && data.elements) {
        const mappedPois = data.elements.map((el: any) => {
          const name = el.tags?.name || el.tags?.ref || `Punto OSM (${el.id})`;
          const elevation = el.tags?.ele ? parseFloat(el.tags.ele) : undefined;
          
          let icon = "mountain";
          let color = "#f59e0b"; // default orange
          if (osmCategory === "camp") {
            icon = "camp";
            color = "#3b82f6";
          } else if (osmCategory === "water") {
            icon = "water";
            color = "#06b6d4";
          } else if (osmCategory === "camera") {
            icon = "camera";
            color = "#ec4899";
          }

          return {
            id: `osm-${el.id}`,
            name,
            lat: el.lat,
            lng: el.lon,
            icon,
            color,
            elevation,
            note: el.tags?.description || `Elemento descargado de OpenStreetMap. ID: ${el.id}`,
          };
        });
        
        onSetOsmPois(mappedPois);
      }
    } catch (err) {
      console.error("OSM POI search failed:", err);
      await customAlert("Error al buscar en OpenStreetMap: " + (err as Error).message);
    } finally {
      setOsmLoading(false);
    }
  };

  const handleOsmRouteSearch = async () => {
    if (!mapCenter) {
      await customAlert("Coordenadas del mapa no disponibles. Mueve el mapa primero.");
      return;
    }
    setOsmRouteLoading(true);
    setOsmRouteSearchDone(false);
    setOsmRouteResults([]);

    const [lat, lng] = mapCenter;
    const radiusMeters = osmRouteRadius * 1000;
    const query = `[out:json][timeout:20];relation["route"="${osmRouteType}"](around:${radiusMeters},${lat},${lng});out tags center 30;`;

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter",
    ];

    try {
      let data = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`);
          if (res.ok) { data = await res.json(); break; }
        } catch { /* try next */ }
      }
      if (!data) throw new Error("No se pudo conectar con Overpass API");
      setOsmRouteResults(data.elements || []);
    } catch (err) {
      await customAlert("Error al buscar rutas OSM: " + (err as Error).message);
    } finally {
      setOsmRouteLoading(false);
      setOsmRouteSearchDone(true);
    }
  };

  const handleOsmRouteImport = async (rel: any) => {
    if (osmRouteImportingId) return;
    setOsmRouteImportingId(String(rel.id));
    const query = `[out:json][timeout:30];relation(${rel.id});(._;>;);out geom;`;
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ];
    try {
      let data = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`);
          if (res.ok) { data = await res.json(); break; }
        } catch { /* try next */ }
      }
      if (!data) throw new Error("No se pudo obtener la geometría");

      // Collect ordered way geometry from the relation
      const relElement = data.elements.find((e: any) => e.type === "relation" && e.id === rel.id);
      const wayIds: number[] = (relElement?.members || [])
        .filter((m: any) => m.type === "way")
        .map((m: any) => m.ref);

      const wayMap: Record<number, any> = {};
      data.elements.forEach((e: any) => { if (e.type === "way") wayMap[e.id] = e; });

      const points: { lat: number; lng: number }[] = [];
      for (const wid of wayIds) {
        const way = wayMap[wid];
        if (!way?.geometry) continue;
        way.geometry.forEach((pt: any) => points.push({ lat: pt.lat, lng: pt.lon }));
      }

      if (points.length === 0) throw new Error("La ruta no tiene geometría disponible");

      const name = rel.tags?.name || rel.tags?.["name:es"] || `Ruta OSM ${rel.id}`;
      onImportRoute(name, points, []);
      if (points[0]) onFlyToCoords(points[0].lat, points[0].lng);
    } catch (err) {
      await customAlert("Error al importar ruta: " + (err as Error).message);
    } finally {
      setOsmRouteImportingId(null);
    }
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsedData = JSON.parse(text);
        
        let importedCount = 0;
        let createdGroupName = "";

        // 1. Helper function to convert UTM Zone 30N coordinates to Lat/Lng
        const convertUtm30NToLatLng = (x: number, y: number) => {
          const a = 6378137.0; // semi-major axis
          const f = 1 / 298.257223563; // flattening
          const b = a * (1 - f); // semi-minor axis
          const e2 = (a*a - b*b) / (a*a); // eccentricity squared
          const ePrime2 = (a*a - b*b) / (b*b); // second eccentricity squared
          const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
          const k0 = 0.9996; // scale factor
          const falseEasting = 500000;
          const falseNorthing = 0;
          
          const xDelta = x - falseEasting;
          const yDelta = y - falseNorthing;
          const centralMeridian = -3 * Math.PI / 180; // Zone 30 is centered at 3°W (-3)
          
          // Meridional arc distance M = yDelta / k0
          const M = yDelta / k0;
          const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));
          
          const phi1Rad = mu + (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu) 
                          + (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu)
                          + (151*e1*e1*e1/96) * Math.sin(6*mu)
                          + (1097*e1*e1*e1*e1/512) * Math.sin(8*mu);
          
          const n1 = a / Math.sqrt(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad));
          const r1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
          const d = xDelta / (n1 * k0);
          
          const lat = phi1Rad - (n1 * Math.tan(phi1Rad) / r1) * (
            d*d/2 - (5 + 3*Math.tan(phi1Rad)*Math.tan(phi1Rad) + 10*n1/r1 - 4*(n1/r1)*(n1/r1) - 9*ePrime2)*Math.pow(d, 4)/24
            + (61 + 90*Math.tan(phi1Rad)*Math.tan(phi1Rad) + 298*ePrime2 + 45*Math.pow(Math.tan(phi1Rad), 4) - 252*ePrime2*ePrime2 - 3*ePrime2*ePrime2)*Math.pow(d, 6)/720
          );
          
          const lng = centralMeridian + (
            d - (1 + 2*Math.tan(phi1Rad)*Math.tan(phi1Rad) + ePrime2)*d*d*d/6
            + (5 - 2*ePrime2 + 28*Math.tan(phi1Rad)*Math.tan(phi1Rad) - 3*ePrime2*ePrime2 + 8*Math.pow(Math.tan(phi1Rad), 4) + 24*ePrime2*ePrime2)*Math.pow(d, 5)/120
          ) / Math.cos(phi1Rad);
          
          return {
            lat: lat * 180 / Math.PI,
            lng: lng * 180 / Math.PI
          };
        };

        // 2. Format Detection & Normalization
        let wptsToImport: any[] = [];
        let targetGroupId = "default";

        // Case 1: Overpass API JSON Format (copyright/elements structure)
        if (parsedData && parsedData.elements && Array.isArray(parsedData.elements)) {
          createdGroupName = file.name.replace(".json", "") || "Overpass Import";
          
          const newGroupId = `group-${Date.now()}`;
          await onAddWaypointGroup({
            id: newGroupId,
            name: createdGroupName,
            description: `Importado de OpenStreetMap (${parsedData.elements.length} nodos)`,
            color: "#3b82f6",
            visible: true,
          });
          targetGroupId = newGroupId;

          parsedData.elements.forEach((el: any) => {
            if (el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number") {
              const name = el.tags?.name || el.tags?.["name:es"] || el.tags?.["name:eu"] || `POI #${el.id}`;
              const ele = el.tags?.ele;
              const natural = el.tags?.natural;
              const amenity = el.tags?.amenity;
              const tourism = el.tags?.tourism;

              let icon = "info";
              if (natural === "peak") icon = "mountain";
              else if (amenity === "shelter" || tourism === "camp_site") icon = "camp";
              else if (amenity === "drinking_water") icon = "water";

              wptsToImport.push({
                name,
                lat: el.lat,
                lng: el.lon,
                icon,
                note: `Altitud: ${ele ? `${ele}m` : "No disponible"} - OSM ID: ${el.id}`,
                color: "#3b82f6",
                groupId: targetGroupId,
                completed: false,
                image: el.tags?.image || (el.tags?.wikimedia_commons ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(el.tags.wikimedia_commons.replace("File:", ""))}` : undefined),
                link: el.tags?.website || (el.tags?.wikipedia ? `https://es.wikipedia.org/wiki/${encodeURIComponent(el.tags.wikipedia.split(":")[1] || el.tags.wikipedia)}` : undefined),
              });
            }
          });
        }
        // Case 2: SUMMIT GPS Challenge Export Package
        else if (parsedData && typeof parsedData === "object" && !Array.isArray(parsedData) && parsedData.name && Array.isArray(parsedData.waypoints)) {
          createdGroupName = parsedData.name;
          const newGroupId = `group-${Date.now()}`;
          await onAddWaypointGroup({
            id: newGroupId,
            name: parsedData.name,
            description: parsedData.description || "Reto importado",
            color: parsedData.color || "#10b981",
            visible: true,
            image: parsedData.image,
          });
          targetGroupId = newGroupId;

          parsedData.waypoints.forEach((item: any) => {
            wptsToImport.push({
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              icon: item.icon || "mountain",
              note: item.note || "",
              color: item.color || parsedData.color || "#10b981",
              groupId: targetGroupId,
              completed: !!item.completed,
              image: item.image,
              link: item.link,
            });
          });
        }
        // Case 3: Flat Array of Objects (Traditional list / 600 Gailurrak UTM list)
        else if (Array.isArray(parsedData)) {
          const firstItem = parsedData[0];
          const isGailurrakUtm = firstItem && firstItem.utm_etrs89;

          createdGroupName = file.name.replace(".json", "");
          const newGroupId = `group-${Date.now()}`;
          await onAddWaypointGroup({
            id: newGroupId,
            name: createdGroupName,
            description: isGailurrakUtm 
              ? `Reto de ${parsedData.length} cimas importadas con coordenadas UTM ETRS89.`
              : `Importación de lista con ${parsedData.length} marcas.`,
            color: "#eab308",
            visible: true,
          });
          targetGroupId = newGroupId;

          parsedData.forEach((item: any) => {
            const name = item.nombre || item.name;
            if (!name) return;

            let lat = item.lat;
            let lng = item.lng || item.lon;

            let utmString = item.utm_etrs89 || item.utm_ed50 || item.utm;
            // Prioritize calculating coordinates from UTM if available, to ensure maximum accuracy
            // and correct any historical deviation stored in standard decimal lat/lng fields.
            if (utmString) {
              const regex = /X\s*([0-9\.]+)\s+Y\s*([0-9\.]+)/i;
              const cleanStr = utmString.replace(/\./g, "");
              const match = cleanStr.match(regex);
              if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                const isEd50 = !!item.utm_ed50 || utmString.toLowerCase().includes("ed50");
                const converted = convertUtm30NToLatLng(x, y);
                if (converted && !isNaN(converted.lat) && !isNaN(converted.lng)) {
                  lat = converted.lat;
                  lng = converted.lng;
                  
                  if (isEd50) {
                    // Apply Spain ED50 to WGS84 Datum Shift (approximate localized translation)
                    lat = lat - 0.00122;
                    lng = lng - 0.00155;
                  }
                }
              }
            }

            if (typeof lat === "number" && typeof lng === "number") {
              const note = item.altitud 
                ? `Altitud: ${item.altitud}m - Territorio: ${item.territorio || "N/D"}`
                : item.note || "";

              wptsToImport.push({
                name,
                lat,
                lng,
                icon: item.icon || "mountain",
                note,
                color: item.color || "#eab308",
                groupId: targetGroupId,
                completed: !!item.completed,
                image: item.image,
                link: item.link,
              });
            }
          });
        } else {
          throw new Error("Formato JSON no soportado. Debe ser un reto exportado, una lista de marcas o una respuesta de Overpass API.");
        }

        if (onAddMultipleWaypoints) {
          onAddMultipleWaypoints(wptsToImport, createdGroupName);
          importedCount = wptsToImport.length;
        } else {
          wptsToImport.forEach((wpt) => {
            onAddWaypoint(wpt);
            importedCount++;
          });
        }

        await customAlert(`¡Importación exitosa! Se ha creado el reto "${createdGroupName}" y se han añadido ${importedCount} marcas a Summit GPS.`);
        
        if (wptsToImport.length > 0) {
          onFlyToCoords(wptsToImport[0].lat, wptsToImport[0].lng);
        }
      } catch (err) {
        console.error("JSON Import failed:", err);
        await customAlert("Error al importar el archivo JSON: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  


  // Unified Import handler supporting GPX, KML, GeoJSON, and FIT!
  const handleGpxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'fit') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = parseFIT(buffer);
          onImportRoute(file.name.replace(/\.[^/.]+$/, ""), parsed.points, parsed.waypoints);
          if (parsed.points.length > 0) {
            onFlyToCoords(parsed.points[0].lat, parsed.points[0].lng);
          }
        } catch (err) {
          await customAlert("Error al importar archivo Garmin FIT: " + (err as Error).message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          let parsedRoute = { routeName: file.name.replace(/\.[^/.]+$/, ""), routePoints: [] as any[], waypoints: [] as any[] };

          if (extension === 'kml') {
            const parsed = parseKML(text);
            parsedRoute = { routeName: parsed.trackName, routePoints: parsed.points, waypoints: parsed.waypoints };
          } else if (extension === 'geojson' || extension === 'json') {
            try {
              const parsed = parseGeoJSON(text);
              parsedRoute = { routeName: parsed.trackName, routePoints: parsed.points, waypoints: parsed.waypoints };
            } catch (err) {
              throw new Error("El archivo JSON no cumple con el estándar GeoJSON.");
            }
          } else {
            const parsed = parseGPX(text);
            parsedRoute = parsed;
          }

          onImportRoute(parsedRoute.routeName, parsedRoute.routePoints, parsedRoute.waypoints);
          
          if (parsedRoute.routePoints.length > 0) {
            onFlyToCoords(parsedRoute.routePoints[0].lat, parsedRoute.routePoints[0].lng);
          } else if (parsedRoute.waypoints.length > 0) {
            onFlyToCoords(parsedRoute.waypoints[0].lat, parsedRoute.waypoints[0].lng);
          }
        } catch (err) {
          await customAlert("Error al importar el archivo: " + (err as Error).message);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  // GPX Export (Exports the currently active track)
  const handleGpxExport = async () => {
    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack) {
      await customAlert("Por favor, selecciona un track activo de la biblioteca para exportar.");
      return;
    }

    if (activeTrack.points.length === 0 && activeTrack.waypoints.length === 0) {
      await customAlert("No hay ruta ni waypoints en el track activo para exportar.");
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
  };

  const handleKmlExport = async () => {
    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack) {
      await customAlert("Por favor, selecciona un track activo de la biblioteca para exportar.");
      return;
    }

    if (activeTrack.points.length === 0 && activeTrack.waypoints.length === 0) {
      await customAlert("No hay ruta ni waypoints en el track activo para exportar.");
      return;
    }

    const kmlString = exportToKML(activeTrack);
    const blob = new Blob([kmlString], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTrack.name.replace(/\s+/g, "_") || "ruta_summit"}.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGeoJsonExport = async () => {
    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack) {
      await customAlert("Por favor, selecciona un track activo de la biblioteca para exportar.");
      return;
    }

    if (activeTrack.points.length === 0 && activeTrack.waypoints.length === 0) {
      await customAlert("No hay ruta ni waypoints en el track activo para exportar.");
      return;
    }

    const geojsonString = exportToGeoJSON(activeTrack);
    const blob = new Blob([geojsonString], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTrack.name.replace(/\s+/g, "_") || "ruta_summit"}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Cycle track color
  const handleCycleColor = (id: string, currentColor: string) => {
    const idx = DEFAULT_TRACK_COLORS.indexOf(currentColor);
    const nextColor = DEFAULT_TRACK_COLORS[(idx + 1) % DEFAULT_TRACK_COLORS.length];
    onSetTrackColor(id, nextColor);
  };

  // Checkbox toggle for Merge selection
  const handleToggleMergeSelect = (id: string) => {
    setSelectedMergeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Merge selected tracks
  const handleMergeSelected = async () => {
    if (selectedMergeIds.length < 2) {
      await customAlert("Por favor, selecciona al menos 2 tracks de la biblioteca para unirlos.");
      return;
    }
    const name = await customPrompt("Introduce el nombre de la ruta fusionada:", "Ruta Combinada");
    if (name === null) return; // cancelled
    onMergeTracks(selectedMergeIds, name || undefined);
    setSelectedMergeIds([]); // clear selection
  };

  // Delete selected tracks
  const handleDeleteSelected = async () => {
    if (selectedMergeIds.length === 0) return;
    const confirmMessage = selectedMergeIds.length === 1
      ? `¿Seguro que deseas eliminar la ruta seleccionada de la biblioteca?`
      : `¿Seguro que deseas eliminar las ${selectedMergeIds.length} rutas seleccionadas de la biblioteca?`;
    if (await customConfirm(confirmMessage)) {
      if (onDeleteMultipleTracks) {
        onDeleteMultipleTracks(selectedMergeIds);
      } else {
        selectedMergeIds.forEach((id) => onDeleteTrack(id));
      }
      setSelectedMergeIds([]); // clear selection
    }
  };



  return (
    <div
      className={`relative z-[9999] h-full flex transition-all duration-300 ${
        isCollapsed ? "w-[64px]" : "w-[380px] max-w-[90vw]"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3.5 transform -translate-y-1/2 w-7 h-12 bg-[#0c120f]/90 hover:bg-[#111a15]/95 border border-[#1b3d2b] rounded-r-xl text-emerald-400 flex items-center justify-center shadow-xl z-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {isCollapsed ? (
        /* Sleek Vertical Dock Panel when collapsed */
        <div className="w-[64px] h-full bg-[#0c120f]/95 border-r border-[#1b3d2b] flex flex-col items-center justify-between py-5 text-slate-400 select-none z-10">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Logo */}
            <div className="w-8 h-8 rounded-lg bg-[#0d1a12] border border-emerald-500/20 flex items-center justify-center shadow-md shrink-0">
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Vertical Icons */}
            <div className="flex flex-col gap-4 w-full px-2">
              {[
                { id: "layers" as TabId, label: "Capas", icon: LayersIcon },
                { id: "route" as TabId, label: "Rutas", icon: Route },
                { id: "waypoints" as TabId, label: "Marcas", icon: MapPin },
                { id: "challenges" as TabId, label: "Retos", icon: Trophy },
                { id: "settings" as TabId, label: "Ajustes", icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsCollapsed(false); // Expand when clicking a function icon!
                    }}
                    title={tab.label}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 shadow-md shadow-emerald-400/5 font-bold"
                        : "hover:bg-white/[0.04] hover:text-slate-200 text-slate-500 border border-transparent"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Profile / Guest indicator at bottom of dock */}
          <div className="flex flex-col items-center gap-4">
            {user ? (
              <button
                onClick={onSignOut}
                title={`Cerrar sesión (${user.email})`}
                className="w-10 h-10 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 flex items-center justify-center cursor-pointer transition-all border border-transparent hover:border-red-500/10"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              isSupabaseConfigured && (
                <button
                  onClick={onSignInClick}
                  title="Iniciar Sesión"
                  className="w-10 h-10 rounded-xl bg-amber-500/5 hover:bg-emerald-500/10 text-amber-500 hover:text-emerald-400 flex items-center justify-center cursor-pointer transition-all border border-amber-500/20 hover:border-emerald-500/20 animate-pulse"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        /* Main Sidebar Panel */
        <div className="w-full h-full bg-[#131b17]/95 border-r border-[#1b3d2b] text-slate-100 flex flex-col overflow-hidden backdrop-blur-md">
        {/* Header / Brand — Hero Image */}
        <div className="relative h-[110px] shrink-0 overflow-hidden border-b border-[#1b3d2b]">
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
          />
          {/* dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-[#0c120f]/90" />
          {/* content */}
          <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-4 pt-3">
            <h1 className="text-lg font-black tracking-widest text-white leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              SUMMIT<span className="text-emerald-400">GPS</span>
            </h1>
            <p className="text-[9px] text-slate-300/70 uppercase tracking-[0.2em] font-semibold mt-0.5">
              Outdoor Planner
            </p>
          </div>
        </div>

        {/* User Session Sub-Header Status Panel */}
        {user ? (
          <div className="px-5 py-2.5 bg-[#0a0f0d] border-b border-[#1b3d2b]/60 flex items-center justify-between text-[10px] select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-400 truncate font-semibold" title={user.email}>
                {user.email}
              </span>
            </div>
            <button
              onClick={onSignOut}
              className="text-red-400 hover:text-red-300 font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Cerrar Sesión de SUMMIT GPS"
            >
              <LogOut className="w-3 h-3 shrink-0" />
              Salir
            </button>
          </div>
        ) : (
          <div className="px-5 py-2.5 bg-[#1b231e]/20 border-b border-[#1b3d2b]/60 flex items-center justify-between text-[10px] select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <span className="text-slate-400 font-semibold">👤 Modo Invitado</span>
            </div>
            {isSupabaseConfigured && (
              <button
                onClick={onSignInClick}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-all hover:underline cursor-pointer"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        )}

        {/* Tab Selector */}
        <div className="grid grid-cols-5 border-b border-[#1b3d2b] bg-[#0c120f]/50">
          {[
            { id: "layers" as TabId, label: "Capas", icon: LayersIcon },
            { id: "route" as TabId, label: "Rutas", icon: Route },
            { id: "waypoints" as TabId, label: "Marcas", icon: MapPin },
            { id: "challenges" as TabId, label: "Retos", icon: Trophy },
            { id: "settings" as TabId, label: "Ajustes", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2.5 text-[10px] font-semibold border-b-2 transition-all gap-1 ${
                  isActive
                    ? "border-emerald-400 text-emerald-400 bg-white/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB: ROUTE (MULTIPLES RUTAS) */}
          {activeTab === "route" && (
            <div className="space-y-5 animate-fade-in">
              
              {/* SECTION 1: LIBRARY OF TRACKS IN COLLECTIONS */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Colecciones de Rutas ({routeCollections.length})
                    </h4>
                    {displayTracks.length > 0 && (
                      <button
                        onClick={() => {
                          const allSelected = selectedMergeIds.length === displayTracks.length;
                          if (allSelected) {
                            setSelectedMergeIds([]);
                          } else {
                            setSelectedMergeIds(displayTracks.map((t) => t.id));
                          }
                        }}
                        className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        {selectedMergeIds.length === displayTracks.length ? "Ninguno" : "Todo"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedMergeIds.length >= 2 && (
                      <button
                        onClick={handleMergeSelected}
                        className="text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-blue-500/30 transition-colors"
                      >
                        <Link className="w-3 h-3" />
                        Unir Seleccionados
                      </button>
                    )}
                    {selectedMergeIds.length >= 1 && (
                      <button
                        onClick={handleDeleteSelected}
                        className="text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar Seleccionados
                      </button>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTON TOOLBAR */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setIsCreatingCollection(!isCreatingCollection);
                      if (isOsmRoutesOpen) setIsOsmRoutesOpen(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                      isCreatingCollection
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                        : "bg-[#1c2921] border-[#1b3d2b] text-slate-300 hover:text-amber-400 hover:border-amber-500/25"
                    }`}
                  >
                    📁 Nueva Carpeta
                  </button>
                  <button
                    onClick={() => {
                      setIsOsmRoutesOpen(!isOsmRoutesOpen);
                      if (isCreatingCollection) setIsCreatingCollection(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                      isOsmRoutesOpen
                        ? "bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.15)]"
                        : "bg-[#1c2921] border-[#1b3d2b] text-slate-300 hover:text-sky-400 hover:border-sky-500/25"
                    }`}
                    title="Buscar rutas de senderismo y ciclismo en OpenStreetMap"
                  >
                    🛤️ Rutas OSM
                  </button>
                </div>

                {/* OSM ROUTES SEARCH PANEL */}
                {isOsmRoutesOpen && (
                  <div className="bg-[#0c120f]/80 border border-sky-500/20 rounded-xl p-4 space-y-3.5 shadow-inner animate-fade-in">
                    <div className="flex items-center justify-between border-b border-sky-500/10 pb-2">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                        🛤️ Rutas OSM cercanas
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOsmRoutesOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                        <select
                          value={osmRouteType}
                          onChange={(e) => setOsmRouteType(e.target.value as any)}
                          className="w-full bg-[#050807] border border-sky-500/20 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
                        >
                          <option value="hiking" className="bg-[#0c120f]">🥾 Senderismo</option>
                          <option value="foot" className="bg-[#0c120f]">🚶 A pie</option>
                          <option value="bicycle" className="bg-[#0c120f]">🚴 Bicicleta</option>
                          <option value="mtb" className="bg-[#0c120f]">🚵 MTB</option>
                        </select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Radio: {osmRouteRadius} km</label>
                        <input
                          type="range"
                          min={2}
                          max={50}
                          value={osmRouteRadius}
                          onChange={(e) => setOsmRouteRadius(Number(e.target.value))}
                          className="w-full h-2 accent-sky-400 cursor-pointer mt-2"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleOsmRouteSearch}
                      disabled={osmRouteLoading}
                      className="w-full py-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold hover:bg-sky-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {osmRouteLoading ? (
                        <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Buscando...</>
                      ) : "🔍 Buscar Rutas"}
                    </button>

                    {osmRouteSearchDone && osmRouteResults.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-2">
                        No se encontraron rutas. Prueba ampliar el radio o cambiar el tipo.
                      </p>
                    )}

                    {osmRouteResults.length > 0 && (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                        {osmRouteResults.map((rel) => {
                          const name = rel.tags?.name || rel.tags?.["name:es"] || `Ruta OSM ${rel.id}`;
                          const network = rel.tags?.network || "";
                          const distance = rel.tags?.distance || rel.tags?.["osmc:symbol"] || "";
                          const center = rel.center;
                          const isImporting = osmRouteImportingId === String(rel.id);
                          return (
                            <div
                              key={rel.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-[#131b17]/60 border border-sky-500/10 hover:border-sky-500/30 transition-all group"
                            >
                              <button
                                type="button"
                                onClick={() => center && onFlyToCoords(center.lat, center.lon)}
                                className="flex-1 text-left min-w-0"
                                disabled={!center}
                              >
                                <p className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors truncate">{name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {network && <span className="mr-1.5">{network}</span>}
                                  {distance && <span>📏 {distance}</span>}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOsmRouteImport(rel)}
                                disabled={!!osmRouteImportingId}
                                className="shrink-0 w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                title="Añadir ruta a mis rutas"
                              >
                                {isImporting ? (
                                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                ) : (
                                  <Plus className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* COLLECTION CREATOR/EDITOR FORM */}
                {isCreatingCollection && (
                  <div className="bg-[#0c120f]/80 border border-[#1b3d2b] rounded-xl p-4 space-y-3.5 shadow-inner animate-fade-in">
                    <div className="flex items-center justify-between border-b border-[#1b3d2b]/20 pb-2">
                      <span className="text-xs font-bold text-emerald-400">
                        {editingCollectionId ? "Editar Colección" : "Crear Colección"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCollection(false);
                          setEditingCollectionId(null);
                          setNewCollectionName("");
                          setNewCollectionDesc("");
                          setNewCollectionColor("#10b981");
                          setNewCollectionImage("https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80");
                        }}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Collection Name */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Nombre de la Colección
                      </label>
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Ej. Pirineos 2026, Rutas del Domingo..."
                        className="w-full bg-[#050807] border border-[#1b3d2b]/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                        required
                      />
                    </div>

                    {/* Collection Description */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Descripción de la Colección
                      </label>
                      <textarea
                        value={newCollectionDesc}
                        onChange={(e) => setNewCollectionDesc(e.target.value)}
                        placeholder="Ej. Rutas trazadas para el viaje de verano..."
                        rows={2}
                        className="w-full bg-[#050807] border border-[#1b3d2b]/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Collection Color Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Color de Identificación
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: "#10b981", name: "Esmeralda" },
                          { value: "#3b82f6", name: "Azul" },
                          { value: "#ef4444", name: "Rojo" },
                          { value: "#f59e0b", name: "Ámbar" },
                          { value: "#8b5cf6", name: "Violeta" },
                          { value: "#ec4899", name: "Rosa" },
                        ].map((c) => {
                          const isSelected = newCollectionColor === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setNewCollectionColor(c.value)}
                              title={c.name}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                                isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0c120f]" : ""
                              }`}
                              style={{ backgroundColor: c.value }}
                            >
                              {isSelected && (
                                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Collection Cover Catalog Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Imagen de Portada (Paisaje)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                        {LANDSCAPE_IMAGES.map((img) => {
                          const isSelected = newCollectionImage === img.url;
                          return (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => setNewCollectionImage(img.url)}
                              title={img.name}
                              className={`relative h-10 rounded-lg overflow-hidden border transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
                                isSelected ? "border-emerald-400 ring-2 ring-emerald-400/40" : "border-white/5"
                              }`}
                            >
                              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition-colors" />
                              <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[7px] leading-tight text-center truncate font-bold text-white bg-black/50 rounded py-0.5 font-sans">
                                {img.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Action */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newCollectionName.trim()) {
                          await customAlert("Por favor, introduce un nombre para la colección.");
                          return;
                        }
                        if (editingCollectionId) {
                          onUpdateRouteCollection(editingCollectionId, {
                            name: newCollectionName.trim(),
                            description: newCollectionDesc.trim(),
                            color: newCollectionColor,
                            image: newCollectionImage,
                          });
                        } else {
                          onAddRouteCollection({
                            name: newCollectionName.trim(),
                            description: newCollectionDesc.trim(),
                            color: newCollectionColor,
                            visible: true,
                            image: newCollectionImage,
                          });
                        }
                        setNewCollectionName("");
                        setNewCollectionDesc("");
                        setNewCollectionColor("#10b981");
                        setNewCollectionImage("https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80");
                        setEditingCollectionId(null);
                        setIsCreatingCollection(false);
                      }}
                      className="w-full py-2 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-400/10 cursor-pointer"
                    >
                      {editingCollectionId ? "Guardar Cambios" : "Guardar Colección"}
                    </button>
                  </div>
                )}

                {/* BUSCADOR DE BIBLIOTECA */}
                <div className="relative flex items-center mb-4 bg-[#0a0f0d]/80 border border-[#1b3d2b]/40 rounded-xl overflow-hidden focus-within:border-emerald-500/50 transition-all px-3 py-2 gap-2">
                  <Search className="w-3.5 h-3.5 text-emerald-500/80" />
                  <input
                    type="text"
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    placeholder="Buscar rutas, marcas o áreas..."
                    className="bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none w-full font-medium"
                  />
                  {librarySearchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setLibrarySearchQuery("")} 
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* ACCORDION COLLECTIONS LIST */}
                <div className="space-y-3.5">
                  {routeCollections
                    .filter((collection) => {
                      if (!librarySearchQuery.trim()) return true;
                      
                      const q = librarySearchQuery.toLowerCase();
                      const nameMatch = collection.name.toLowerCase().includes(q) || (collection.description && collection.description.toLowerCase().includes(q));
                      if (nameMatch) return true;

                      // Check if any element inside matches
                      const hasTrack = displayTracks.some(t => 
                        (collection.id === "default" ? (!t.collectionId || t.collectionId === "default") : t.collectionId === collection.id) &&
                        t.name.toLowerCase().includes(q)
                      );
                      if (hasTrack) return true;

                      const hasWpt = waypoints.some(w => 
                        (collection.id === "default" ? (!w.groupId || w.groupId === "default") : w.groupId === collection.id) &&
                        (w.name.toLowerCase().includes(q) || (w.note && w.note.toLowerCase().includes(q)))
                      );
                      if (hasWpt) return true;

                      const hasArea = areas.some(a => 
                        (collection.id === "default" ? (!a.collectionId || a.collectionId === "default") : a.collectionId === collection.id) &&
                        a.name.toLowerCase().includes(q)
                      );
                      if (hasArea) return true;

                      return false;
                    })
                    .map((collection) => {
                      // Filter tracks belonging to this collection
                      const collectionTracks = displayTracks.filter((t) => {
                        if (collection.id === "default") {
                          return !t.collectionId || t.collectionId === "default";
                        }
                        return t.collectionId === collection.id;
                      });

                      // Filter waypoints belonging to this collection
                      const collectionWaypoints = waypoints.filter((w) => {
                        if (collection.id === "default") {
                          return !w.groupId || w.groupId === "default";
                        }
                        return w.groupId === collection.id;
                      });

                      // Filter areas belonging to this collection
                      const collectionAreas = areas.filter((a) => {
                        if (collection.id === "default") {
                          return !a.collectionId || a.collectionId === "default";
                        }
                        return a.collectionId === collection.id;
                      });

                      // Apply search filter locally to items if search query is active
                      const filteredTracks = !librarySearchQuery.trim() 
                        ? collectionTracks 
                        : collectionTracks.filter(t => t.name.toLowerCase().includes(librarySearchQuery.toLowerCase()));

                      const filteredWaypoints = !librarySearchQuery.trim() 
                        ? collectionWaypoints 
                        : collectionWaypoints.filter(w => w.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) || (w.note && w.note.toLowerCase().includes(librarySearchQuery.toLowerCase())));

                      const filteredAreas = !librarySearchQuery.trim() 
                        ? collectionAreas 
                        : collectionAreas.filter(a => a.name.toLowerCase().includes(librarySearchQuery.toLowerCase()));

                      // Automatically expand collection if search matches items inside it
                      const isExpanded = expandedCollectionId === collection.id || (librarySearchQuery.trim() !== "" && (filteredTracks.length > 0 || filteredWaypoints.length > 0 || filteredAreas.length > 0));
                      
                      const totalTracksCount = collectionTracks.length;
                      


                      return (
                        <div
                          key={collection.id}
                          className="relative border border-[#1b3d2b]/40 rounded-xl overflow-hidden bg-[#1c2921]/45 hover:bg-[#1c2921]/55 transition-all duration-300 shadow-md"
                        >
                          {/* Accordion Header */}
                          <div
                            onClick={() => setExpandedCollectionId(isExpanded ? null : collection.id)}
                            className="relative flex items-center justify-between p-3.5 transition-colors cursor-pointer gap-2.5 min-h-[58px]"
                            style={{ borderLeft: `4px solid ${collection.color}` }}
                          >
                            {/* Full-height Left Fading Cover Image */}
                            {collection.image && (
                              <div className="absolute inset-y-0 left-0 w-36 overflow-hidden pointer-events-none select-none">
                                <img
                                  src={collection.image}
                                  alt=""
                                  className="w-full h-full object-cover opacity-25"
                                />
                                {/* Sleek fade out gradient mask towards the interior (right) */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c2921]/85 to-[#1c2921]" />
                              </div>
                            )}

                            {/* Text and Info Content */}
                            <div className="relative z-10 flex-1 min-w-0 pr-1 pl-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-100 truncate shadow-sm">
                                  {collection.name}
                                </span>
                              </div>
                              
                              {/* Short Metrics */}
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-semibold uppercase tracking-wider select-none">
                                <span>
                                  {totalTracksCount} {totalTracksCount === 1 ? "ruta" : "rutas"}
                                </span>
                                {collectionWaypoints.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{collectionWaypoints.length} {collectionWaypoints.length === 1 ? "marca" : "marcas"}</span>
                                  </>
                                )}
                                {collectionAreas.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{collectionAreas.length} {collectionAreas.length === 1 ? "área" : "áreas"}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Visibility, Edit & Delete icons */}
                            <div className="relative z-10 flex items-center gap-2 shrink-0 pl-2 border-l border-white/5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleRouteCollectionVisibility(collection.id);
                                }}
                                className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
                                title={collection.visible ? "Ocultar contenido en el mapa" : "Mostrar contenido en el mapa"}
                              >
                                {collection.visible ? (
                                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                                )}
                              </button>

                              {collection.id !== "default" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCollectionId(collection.id);
                                      setNewCollectionName(collection.name);
                                      setNewCollectionDesc(collection.description);
                                      setNewCollectionColor(collection.color);
                                      setNewCollectionImage(collection.image || "https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=400&q=80");
                                      setIsCreatingCollection(true);
                                    }}
                                    className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
                                    title="Editar Carpeta"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (await customConfirm(`¿Seguro que deseas eliminar la carpeta "${collection.name}"? Los elementos se conservarán y se moverán a la raíz.`)) {
                                        onDeleteRouteCollection(collection.id);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                                    title="Eliminar Carpeta (Conserva los elementos)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Accordion Content: Unified elements lists */}
                          {isExpanded && (
                            <div className="border-t border-[#1b3d2b]/25 bg-[#0a0f0d]/60 p-3 space-y-4 animate-slide-in-top">
                              {collection.description && (
                                <p className="text-[10px] text-slate-400 px-2.5 py-1.5 bg-black/10 rounded-lg italic">
                                  {collection.description}
                                </p>
                              )}

                              {/* CATEGORY 1: ROUTES (TRACKS) */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider select-none px-1">
                                  <span className="flex items-center gap-1.5">
                                    <Route className="w-3 h-3 text-emerald-500" />
                                    Rutas ({filteredTracks.length})
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {filteredTracks.length === 0 ? (
                                    <p className="text-[9.5px] text-slate-600 italic px-2">No hay rutas en esta carpeta.</p>
                                  ) : (
                                    filteredTracks.map((track) => {
                                      const isActive = track.id === activeTrackId;
                                      const isCheckedForMerge = selectedMergeIds.includes(track.id);
                                      return (
                                        <div
                                          key={track.id}
                                          className={`flex items-center justify-between p-2 rounded-lg border text-[11px] transition-all ${
                                            isActive
                                              ? "bg-emerald-500/[0.04] border-emerald-400/35"
                                              : "bg-[#0c120f] border-white/5 hover:border-white/10"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <input
                                              type="checkbox"
                                              checked={isCheckedForMerge}
                                              onChange={() => handleToggleMergeSelect(track.id)}
                                              title="Seleccionar para unir"
                                              className="w-3 h-3 accent-emerald-400 bg-black rounded border-[#1b3d2b] cursor-pointer"
                                            />
                                            <button
                                              onClick={() => handleCycleColor(track.id, track.color)}
                                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20 transition-transform active:scale-95 cursor-pointer"
                                              style={{ backgroundColor: track.color }}
                                              title="Cambiar color de ruta"
                                            />
                                            <button
                                              onClick={() => onToggleTrackVisibility(track.id)}
                                              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                              title={track.visible ? "Ocultar en mapa" : "Mostrar en mapa"}
                                            >
                                              {track.visible ? (
                                                <Eye className="w-3 h-3 text-emerald-400" />
                                              ) : (
                                                <EyeOff className="w-3 h-3 text-slate-600" />
                                              )}
                                            </button>
                                            <span
                                              onClick={() => setActiveTrackId(track.id)}
                                              className={`truncate cursor-pointer hover:underline ${
                                                isActive ? "font-bold text-emerald-300" : "text-slate-300"
                                              }`}
                                            >
                                              {track.name}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              onClick={() => {
                                                setActiveTrackId(track.id);
                                                setIsRouteEditPanelOpen(true);
                                                if (track.points.length > 0) {
                                                  onFlyToCoords(track.points[0].lat, track.points[0].lng);
                                                }
                                              }}
                                              className={`p-1 rounded transition-colors cursor-pointer ${
                                                isActive && isRouteEditPanelOpen
                                                  ? "bg-emerald-500/10 text-emerald-300"
                                                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                              }`}
                                              title="Editar ruta"
                                            >
                                              <Edit2 className="w-2.5 h-2.5" />
                                            </button>

                                            <button
                                              onClick={async () => {
                                                if (await customConfirm(`¿Seguro que deseas eliminar la ruta "${track.name}"?`)) {
                                                  onDeleteTrack(track.id);
                                                }
                                              }}
                                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                              title="Eliminar de la biblioteca"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* CATEGORY 2: WAYPOINTS (MARCAS) */}
                              <div className="space-y-1.5 border-t border-[#1b3d2b]/15 pt-3">
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider select-none px-1">
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-emerald-500" />
                                    Marcas ({filteredWaypoints.length})
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {filteredWaypoints.length === 0 ? (
                                    <p className="text-[9.5px] text-slate-600 italic px-2">No hay marcas en esta carpeta.</p>
                                  ) : (
                                    filteredWaypoints.map((wpt) => {
                                      const WptIcon = WPT_ICONS[wpt.icon] || MapPin;
                                      const isCompleted = !!wpt.completed;
                                      return (
                                        <div
                                          key={wpt.id}
                                          onClick={() => {
                                            if (isBulkMode) {
                                              setSelectedWptIds((prev) =>
                                                prev.includes(wpt.id)
                                                  ? prev.filter((id) => id !== wpt.id)
                                                  : [...prev, wpt.id]
                                              );
                                            } else {
                                              onFlyToCoords(wpt.lat, wpt.lng);
                                            }
                                          }}
                                          className={`group flex items-start justify-between p-2 rounded-lg border text-[11px] transition-all cursor-pointer ${
                                            isBulkMode && selectedWptIds.includes(wpt.id)
                                              ? "bg-blue-500/10 border-blue-500/40 hover:border-blue-500/50"
                                              : isCompleted
                                              ? "bg-emerald-500/[0.01] border-emerald-500/10 hover:border-emerald-500/20"
                                              : "bg-[#0c120f] border-white/5 hover:border-white/10"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            {isBulkMode && (
                                              <input
                                                type="checkbox"
                                                checked={selectedWptIds.includes(wpt.id)}
                                                onChange={() => {}} // handled by div onClick
                                                className="w-3 h-3 accent-blue-500"
                                              />
                                            )}
                                            <WptIcon className="w-3.5 h-3.5 shrink-0" style={{ color: wpt.color }} />
                                            <span className={`truncate hover:underline text-slate-300 ${isCompleted ? 'line-through opacity-50' : ''}`}>
                                              {wpt.name}
                                            </span>
                                            {wpt.elevation !== undefined && (
                                              <span className="text-[8px] font-extrabold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded shrink-0 select-none">
                                                🏔️ {useImperial ? `${Math.round(wpt.elevation * 3.28084)} ft` : `${wpt.elevation} m`}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEditWaypoint(wpt);
                                              }}
                                              className="text-slate-500 hover:text-emerald-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                              title="Editar marca"
                                            >
                                              <Edit2 className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (await customConfirm(`¿Seguro que deseas eliminar la marca "${wpt.name}"?`)) {
                                                  onDeleteWaypoint(wpt.id);
                                                }
                                              }}
                                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                              title="Eliminar marca"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* CATEGORY 3: AREAS (POLYGONS) */}
                              <div className="space-y-1.5 border-t border-[#1b3d2b]/15 pt-3">
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider select-none px-1">
                                  <span className="flex items-center gap-1.5">
                                    <Hexagon className="w-3 h-3 text-emerald-500" />
                                    Áreas ({filteredAreas.length})
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {filteredAreas.length === 0 ? (
                                    <p className="text-[9.5px] text-slate-600 italic px-2">No hay áreas en esta carpeta.</p>
                                  ) : (
                                    filteredAreas.map((area) => {
                                      const areaLabel = formatArea(area.areaM2, useImperial);
                                      return (
                                        <div
                                          key={area.id}
                                          onClick={() => {
                                            if (area.points.length > 0) {
                                              onFlyToCoords(area.points[0].lat, area.points[0].lng);
                                            }
                                          }}
                                          className="group flex items-start justify-between p-2 rounded-lg border border-white/5 bg-[#0c120f] hover:border-white/10 text-[11px] transition-all cursor-pointer animate-fade-in"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div
                                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10"
                                              style={{ backgroundColor: area.color }}
                                            />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleAreaVisibility(area.id);
                                              }}
                                              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                              title={area.visible ? "Ocultar" : "Mostrar"}
                                            >
                                              {area.visible ? (
                                                <Eye className="w-3 h-3 text-emerald-400" />
                                              ) : (
                                                <EyeOff className="w-3 h-3 text-slate-600" />
                                              )}
                                            </button>
                                            <span className="truncate text-slate-300">
                                              {area.name} <span className="text-[9px] text-slate-500">({areaLabel})</span>
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (await customConfirm(`¿Seguro que deseas eliminar el área "${area.name}"?`)) {
                                                  onDeleteArea(area.id);
                                                }
                                              }}
                                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                              title="Eliminar de la biblioteca"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* ADD NEW ROUTE INSIDE FOLDER */}
                              <div className="border-t border-[#1b3d2b]/15 pt-2.5">
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const name = await customPrompt("Introduce el nombre de la nueva ruta:", "Nueva Ruta");
                                    if (name) onCreateNewTrack(name, collection.id);
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold border border-dashed border-emerald-500/20 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  Nueva Ruta en esta carpeta
                                </button>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
              </div>

              {/* SECTION 2: ROUTE EDIT PANEL (floating, fixed position) */}
              {isRouteEditPanelOpen && activeTrackId && (
                <div
                  className="fixed top-0 h-full w-[340px] bg-[#0b120e] border-l border-[#1b3d2b] shadow-2xl z-[9996] flex flex-col overflow-hidden"
                  style={{ left: isCollapsed ? 64 : 380 }}
                >
                  {/* Panel Header */}
                  <div className="p-4 border-b border-[#1b3d2b] flex items-center justify-between shrink-0 bg-[#080e0a]">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Edit2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-200">Editar Ruta</h3>
                        <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
                          {tracks.find(t => t.id === activeTrackId)?.name ?? 'Sin nombre'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 bg-[#0b100d] border border-[#1b3d2b]/40 rounded-lg p-0.5">
                        <button type="button" onClick={onUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)"
                          className={`p-1 rounded transition-all ${canUndo ? 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer' : 'text-slate-600 opacity-40 cursor-not-allowed'}`}>
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={onRedo} disabled={!canRedo} title="Rehacer (Ctrl+Y)"
                          className={`p-1 rounded transition-all ${canRedo ? 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer' : 'text-slate-600 opacity-40 cursor-not-allowed'}`}>
                          <Redo2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => { setIsRouteEditPanelOpen(false); setIsDrawing(false); setIsEditingRoute(false); setIsSplitting(false); }}
                        className="w-7 h-7 rounded-lg bg-[#111c16] hover:bg-[#182a20] border border-white/5 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">

                  {/* Route Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Renombrar Ruta
                    </label>
                    <input
                      type="text"
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>

                  {/* Collection Selector */}
                  {routeCollections.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Folder className="w-3 h-3" />
                        Colección
                      </label>
                      <select
                        value={tracks.find(t => t.id === activeTrackId)?.collectionId || "default"}
                        onChange={(e) => {
                          if (activeTrackId) {
                            onSetTrackCollection(activeTrackId, e.target.value);
                          }
                        }}
                        className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 transition-colors appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                        }}
                      >
                        {routeCollections.map((col) => (
                          <option key={col.id} value={col.id} style={{ backgroundColor: '#0c120f', color: '#e2e8f0' }}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Drawing Actions */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setIsDrawing(!isDrawing);
                          if (isSplitting) setIsSplitting(false); // turn off split mode
                          if (isEditingRoute) setIsEditingRoute(false); // turn off edit mode
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold transition-all shadow-lg ${
                          isDrawing
                            ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-red-500/5 hover:bg-red-500/25"
                            : "bg-emerald-400 text-[#0c120f] hover:bg-emerald-300 shadow-emerald-400/10"
                        }`}
                      >
                        {loading ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Route className="w-4 h-4" />
                        )}
                        {isDrawing ? "Finalizar Dibujo" : "Dibujar en Ruta"}
                      </button>

                      {/* Split tool button */}
                      {points.length > 3 && (
                        <button
                          onClick={() => {
                            setIsSplitting(!isSplitting);
                            if (isDrawing) setIsDrawing(false); // turn off draw mode
                            if (isEditingRoute) setIsEditingRoute(false); // turn off edit mode
                          }}
                          title="Dividir Track (Split)"
                          className={`px-3.5 border rounded-xl transition-colors flex items-center justify-center ${
                            isSplitting
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-md"
                              : "bg-[#18231e] border-[#1b3d2b] text-slate-300 hover:text-orange-400"
                          }`}
                        >
                          <Scissors className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reverse track button */}
                      {points.length > 1 && (
                        <button
                          onClick={async () => {
                            if (activeTrackId) {
                              onReverseTrack(activeTrackId);
                            }
                          }}
                          title="Invertir Ruta (Reverse Track)"
                          className="px-3.5 border rounded-xl transition-colors flex items-center justify-center bg-[#18231e] border-[#1b3d2b] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 cursor-pointer"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                      )}

                      {/* Ida y Vuelta / Round Trip */}
                      {points.length > 1 && !isDrawing && (
                        <button
                          onClick={() => {
                            if (activeTrackId) {
                              onRoundTripTrack(activeTrackId);
                            }
                          }}
                          title="Ida y Vuelta / Cerrar Bucle (Round Trip)"
                          className="px-3.5 border rounded-xl transition-colors flex items-center justify-center bg-[#18231e] border-[#1b3d2b] text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit Route mode */}
                      {points.length > 0 && !isDrawing && (
                        <button
                          onClick={() => {
                            setIsEditingRoute(!isEditingRoute);
                            if (isSplitting) setIsSplitting(false);
                          }}
                          title={isEditingRoute ? "Finalizar Edición de Ruta" : "Edición Geométrica (Arrastrar/Insertar)"}
                          className={`px-3.5 border rounded-xl transition-colors flex items-center justify-center ${
                            isEditingRoute
                              ? "bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-md"
                              : "bg-[#18231e] border-[#1b3d2b] text-slate-300 hover:text-violet-400"
                          }`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Trim Track Button */}
                      {points.length > 2 && !isDrawing && (
                        <button
                          onClick={() => setShowTrimPanel(!showTrimPanel)}
                          title="Recortar Inicio/Fin (Trim/Crop)"
                          className={`px-3.5 border rounded-xl transition-colors flex items-center justify-center ${
                            showTrimPanel
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-md animate-pulse"
                              : "bg-[#18231e] border-[#1b3d2b] text-slate-300 hover:text-rose-400"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12h10"/><path d="M12 12L3 3"/><path d="M16 12l6 6"/></svg>
                        </button>
                      )}

                      {/* Simplify Track Button */}
                      {points.length > 2 && !isDrawing && applySimplifyTrack && (
                        <button
                          onClick={() => setShowSimplifyPanel(!showSimplifyPanel)}
                          title="Simplificar Puntos (Reducir tamaño GPS)"
                          className={`px-3.5 border rounded-xl transition-colors flex items-center justify-center ${
                            showSimplifyPanel
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md animate-pulse"
                              : "bg-[#18231e] border-[#1b3d2b] text-slate-300 hover:text-amber-400"
                          }`}
                        >
                          <Trees className="w-4 h-4" />
                        </button>
                      )}

                      {/* Clean Area Button */}
                      {points.length > 2 && !isDrawing && setIsCleaningArea && (
                        <button
                          onClick={() => setIsCleaningArea(!isCleaningArea)}
                          title="Limpiar Track por Área (Rectangle Clean)"
                          className={`px-3.5 border rounded-xl transition-colors flex items-center justify-center ${
                            isCleaningArea
                              ? "bg-red-500/20 text-red-300 border-red-500/40 shadow-md animate-pulse"
                              : "bg-[#18231e] border-[#1b3d2b] text-slate-300 hover:text-red-400"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                        </button>
                      )}

                      {points.length > 0 && isDrawing && (
                        <button
                          onClick={onUndoPoint}
                          title="Deshacer último punto"
                          className="px-3.5 bg-[#18231e] border border-[#1b3d2b] rounded-xl text-slate-300 hover:text-emerald-400 transition-colors flex items-center justify-center"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Helper alerts */}
                    {isDrawing && (
                      <p className="text-[10px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-center animate-pulse">
                        🖱️ Haz clic en el mapa para ir agregando puntos de paso a tu ruta.
                      </p>
                    )}

                    {isSplitting && (
                      <p className="text-[10px] text-orange-400/85 bg-orange-500/5 border border-orange-500/10 rounded-lg p-2 text-center animate-pulse">
                        ✂️ Haz clic en cualquier vértice de la línea naranja en el mapa para cortar el track en ese punto.
                      </p>
                    )}

                    {isEditingRoute && (
                      <p className="text-[10px] text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-lg p-2 text-center animate-pulse">
                        📍 Modo Edición Activo: Arrastra los círculos en el mapa para mover vértices. Haz clic en la polilínea para insertar nuevos puntos intermedios.
                      </p>
                    )}

                    {/* Trim/Crop Panel */}
                    {showTrimPanel && points.length > 2 && points[trimStart] && points[trimEnd] && (
                      <div className="bg-[#0b100d] border border-[#1b3d2b]/40 rounded-xl p-3.5 space-y-4 animate-fade-in select-none">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            ✂️ Recortar Inicio/Fin de Ruta
                          </span>
                          <button
                            onClick={() => setShowTrimPanel(false)}
                            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="space-y-3.5">
                          {/* Slider Trim Start */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400">
                              <span>Recortar Inicio:</span>
                              <span className="font-bold text-emerald-400">Punto {trimStart + 1}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(0, trimEnd - 1)}
                              value={trimStart}
                              onChange={(e) => setTrimStart(parseInt(e.target.value))}
                              className="w-full h-1 bg-[#131b17] border border-white/5 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                          </div>

                          {/* Slider Trim End */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400">
                              <span>Recortar Fin:</span>
                              <span className="font-bold text-rose-400">Punto {trimEnd + 1}</span>
                            </div>
                            <input
                              type="range"
                              min={Math.min(points.length - 1, trimStart + 1)}
                              max={points.length - 1}
                              value={trimEnd}
                              onChange={(e) => setTrimEnd(parseInt(e.target.value))}
                              className="w-full h-1 bg-[#131b17] border border-white/5 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                          </div>
                        </div>

                        {/* Trim metrics preview */}
                        <div className="bg-[#131b17]/50 border border-white/5 rounded-lg p-2.5 flex justify-between gap-2 text-[9px] font-mono text-slate-400">
                          <div>
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">Puntos Finales</p>
                            <p className="text-slate-200 font-bold">{trimEnd - trimStart + 1} / {points.length}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">Distancia Recortada</p>
                            <p className="text-rose-400 font-bold">
                              {useImperial 
                                ? `${((points[trimEnd].distance - points[trimStart].distance) * 0.621371).toFixed(2)} mi` 
                                : `${(points[trimEnd].distance - points[trimStart].distance).toFixed(2)} km`}
                            </p>
                          </div>
                        </div>

                        {/* Apply Trim Button */}
                        <button
                          onClick={async () => {
                            if (activeTrackId) {
                              if (await customConfirm(`¿Seguro que deseas recortar la ruta y descartar ${points.length - (trimEnd - trimStart + 1)} puntos?`)) {
                                onTrimTrack(activeTrackId, trimStart, trimEnd);
                                setShowTrimPanel(false);
                              }
                            }
                          }}
                          className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-500/60 rounded-xl text-rose-300 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-rose-500/5 cursor-pointer text-center"
                        >
                          Aplicar Recorte
                        </button>
                      </div>
                    )}

                    {/* Simplify Track Panel */}
                    {showSimplifyPanel && points.length > 2 && (
                      <div className="bg-[#0b100d] border border-[#1b3d2b]/40 rounded-xl p-3.5 space-y-4 animate-fade-in select-none">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Trees className="w-3.5 h-3.5" /> Simplificar Ruta
                          </span>
                          <button
                            onClick={() => setShowSimplifyPanel(false)}
                            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400">
                              <span>Tolerancia (m):</span>
                              <span className="font-bold text-amber-400">{simplifyTolerance}m</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={simplifyTolerance}
                              onChange={(e) => setSimplifyTolerance(parseInt(e.target.value))}
                              className="w-full h-1 bg-[#131b17] border border-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <p className="text-[9px] text-slate-500 pt-1 leading-tight">
                              A mayor valor, más puntos se eliminarán. Usa un valor bajo (1-10m) para mantener la precisión o alto para limpiar rutas erráticas.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            if (activeTrackId && applySimplifyTrack) {
                              if (await customConfirm(`¿Aplicar simplificación con una tolerancia de ${simplifyTolerance}m? Esta acción sobrescribirá los puntos del track.`, "Simplificar Ruta")) {
                                applySimplifyTrack(activeTrackId, simplifyTolerance);
                                setShowSimplifyPanel(false);
                              }
                            }
                          }}
                          className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-500/60 rounded-xl text-amber-300 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-amber-500/5 cursor-pointer text-center"
                        >
                          Aplicar Simplificación
                        </button>
                      </div>
                    )}

                    {/* Area Cleaning Panel (shown when user selects an area) */}
                    {isCleaningArea && cleanBounds && (
                      <div className="bg-[#0b100d] border border-red-500/40 rounded-xl p-3.5 space-y-4 animate-fade-in select-none">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                            🧽 Limpieza de Área
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-400">
                          Selecciona si deseas eliminar los puntos que caen <strong>dentro</strong> o <strong>fuera</strong> del área roja dibujada en el mapa.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={async () => {
                              if (activeTrackId && cleanTrackArea) {
                                if (await customConfirm("¿Estás seguro de eliminar los puntos INTERIORES?", "Limpiar Área")) {
                                  cleanTrackArea(activeTrackId, cleanBounds, false);
                                  if (setCleanBounds) setCleanBounds(null);
                                  if (setIsCleaningArea) setIsCleaningArea(false);
                                }
                              }
                            }}
                            className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-red-300 text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Borrar Interior
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (activeTrackId && cleanTrackArea) {
                                if (await customConfirm("¿Estás seguro de eliminar los puntos EXTERIORES?", "Limpiar Área")) {
                                  cleanTrackArea(activeTrackId, cleanBounds, true);
                                  if (setCleanBounds) setCleanBounds(null);
                                  if (setIsCleaningArea) setIsCleaningArea(false);
                                }
                              }
                            }}
                            className="w-full py-2 bg-[#1c2921] hover:bg-[#25372c] border border-[#1b3d2b] rounded-xl text-slate-300 text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Borrar Exterior
                          </button>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (setCleanBounds) setCleanBounds(null);
                          }}
                          className="w-full py-1.5 bg-transparent hover:bg-white/5 border border-transparent rounded-lg text-slate-500 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Cancelar Selección
                        </button>
                      </div>
                    )}

                    {/* Modo de Enrutamiento */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-200">Modo de Ruta</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { id: 'hike' as RoutingProfile, label: 'Senderismo', emoji: '🥾' },
                          { id: 'cycle' as RoutingProfile, label: 'Ciclismo', emoji: '🚴' },
                          { id: 'drive' as RoutingProfile, label: 'Vehículo', emoji: '🚗' },
                          { id: 'straight' as RoutingProfile, label: 'Línea Recta', emoji: '📏' },
                        ]).map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setRoutingProfile(mode.id)}
                            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all border ${
                              routingProfile === mode.id
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                : 'bg-[#0b100d] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                            }`}
                          >
                            <span className="text-lg">{mode.emoji}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider leading-none">{mode.label}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 text-center">
                        {routingProfile === 'straight' ? 'Línea recta punto a punto sin enrutamiento.' : `Enrutamiento inteligente por ${routingProfile === 'hike' ? 'senderos y caminos de montaña' : routingProfile === 'cycle' ? 'rutas ciclables y pistas' : 'carreteras y pistas para vehículos'}.`}
                      </p>
                    </div>
                  </div>

                  {/* Route metrics display */}
                  {points.length > 0 && (
                    <div className="space-y-4">
                      {/* Modo de Color del Track */}
                      {(() => {
                        const hasHr = points.some(pt => pt.heartRate !== undefined);
                        const hasCad = points.some(pt => pt.cadence !== undefined);
                        const hasPwr = points.some(pt => pt.power !== undefined);
                        const hasSpd = points.some(pt => pt.speed !== undefined);
                        
                        const colorModes = [
                          { id: 'solid', label: 'Sólido', emoji: '🟢' },
                          { id: 'slope', label: 'Pendiente', emoji: '📈' },
                          { id: 'elevation', label: 'Altitud', emoji: '🏔️' },
                        ];
                        if (hasHr) colorModes.push({ id: 'heartRate', label: 'Pulsaciones', emoji: '💓' });
                        if (hasCad) colorModes.push({ id: 'cadence', label: 'Cadencia', emoji: '🔄' });
                        if (hasPwr) colorModes.push({ id: 'power', label: 'Potencia', emoji: '⚡' });
                        if (hasSpd) colorModes.push({ id: 'speed', label: 'Velocidad', emoji: '🚀' });

                        return (
                          <div className="space-y-2 p-3 rounded-xl bg-[#0b100d] border border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              🎨 Modo de Color del Mapa
                            </span>
                            <div className={`grid ${colorModes.length > 3 ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5`}>
                              {colorModes.map((mode) => (
                                <button
                                  key={mode.id}
                                  onClick={() => setTrackColorMode(mode.id as any)}
                                  className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg text-center transition-all border ${
                                    trackColorMode === mode.id
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                      : 'bg-[#0b100d] border-white/5 text-slate-500 hover:text-slate-200 hover:border-white/10'
                                  }`}
                                >
                                  <span className="text-xs">{mode.emoji}</span>
                                  <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none truncate w-full">{mode.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      <StatsPanel
                        distance={distance}
                        ascent={ascent}
                        descent={descent}
                        useImperial={useImperial}
                        points={points}
                        routingProfile={routingProfile}
                      />
                      
                      <button
                        onClick={async () => {
                          if (await customConfirm("¿Seguro que deseas borrar todos los puntos de la ruta activa?")) {
                            onClearRoute();
                          }
                        }}
                        className="w-full py-2 rounded-xl border border-red-500/20 text-red-400 bg-red-500/[0.03] hover:bg-red-500/[0.08] transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        Borrar Trazado Activo
                      </button>
                    </div>
                  )}

                  {/* Multi-Format Export Options */}
                  <div className="pt-3 border-t border-[#1b3d2b]/20 space-y-2 select-none">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block text-center">
                      📤 Exportar Ruta Activa
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={handleGpxExport}
                        disabled={points.length === 0 && waypoints.length === 0}
                        title="Exportar a GPX (Universal)"
                        className="py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0c120f]/60 hover:bg-[#0a0f0d] text-[10px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#0c120f]/60 transition-colors cursor-pointer text-center"
                      >
                        GPX
                      </button>
                      <button
                        onClick={handleKmlExport}
                        disabled={points.length === 0 && waypoints.length === 0}
                        title="Exportar a KML (Google Earth)"
                        className="py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0c120f]/60 hover:bg-[#0a0f0d] text-[10px] font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#0c120f]/60 transition-colors cursor-pointer text-center"
                      >
                        KML
                      </button>
                      <button
                        onClick={handleGeoJsonExport}
                        disabled={points.length === 0 && waypoints.length === 0}
                        title="Exportar a GeoJSON (GIS/Web)"
                        className="py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0c120f]/60 hover:bg-[#0a0f0d] text-[10px] font-bold text-violet-400 hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#0c120f]/60 transition-colors cursor-pointer text-center"
                      >
                        GeoJSON
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Import Upload Widget (Always Visible) */}
              <div className="border-t border-[#1b3d2b]/40 pt-4">
                <label className="w-full py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0c120f] hover:bg-[#0f1612] text-slate-300 hover:text-emerald-400 cursor-pointer transition-all text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Importar GPX / KML / GeoJSON / FIT
                  <input
                    id="gpx-upload-input"
                    type="file"
                    accept=".gpx,.kml,.geojson,.json,.fit"
                    onChange={handleGpxUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* ══════════ AREAS SECTION ══════════ */}
              <div className="border-t border-[#1b3d2b]/40 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Hexagon className="w-3.5 h-3.5 text-emerald-400" />
                    Áreas y Polígonos
                  </span>
                  <button
                    onClick={() => {
                      setIsDrawingArea(!isDrawingArea);
                      if (isDrawing) setIsDrawing(false);
                      if (isSplitting) setIsSplitting(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isDrawingArea
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse'
                        : 'bg-[#0b100d] text-slate-400 border-white/5 hover:text-emerald-300 hover:border-emerald-500/20'
                    }`}
                  >
                    <Hexagon className="w-3 h-3" />
                    {isDrawingArea ? 'Dibujando...' : 'Dibujar Área'}
                  </button>
                </div>

                {isDrawingArea && (
                  <p className="text-[10px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-center animate-pulse">
                    🎯 Haz clic en el mapa para trazar los vértices del polígono. Haz doble clic o clic en el primer punto para cerrar el área.
                  </p>
                )}

                {/* Saved Areas List */}
                {areas.length > 0 && (
                  <div className="space-y-2">
                    {areas.map((area) => {
                      const areaLabel = formatArea(area.areaM2, useImperial);
                      const perimM = calculatePolygonPerimeter(area.points);
                      const perimLabel = useImperial
                        ? perimM * 3.28084 < 5280
                          ? `${Math.round(perimM * 3.28084)} ft`
                          : `${(perimM * 0.000621371).toFixed(2)} mi`
                        : perimM < 1000
                        ? `${Math.round(perimM)} m`
                        : `${(perimM / 1000).toFixed(2)} km`;

                      return (
                        <div
                          key={area.id}
                          className="group bg-[#0c120f]/80 border border-[#1b3d2b]/30 rounded-xl p-3 space-y-2 hover:border-[#1b3d2b]/60 transition-all"
                        >
                          {/* Area Header */}
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/10"
                              style={{ backgroundColor: area.color }}
                            />
                            <input
                              type="text"
                              value={area.name}
                              onChange={(e) => onUpdateArea(area.id, { name: e.target.value })}
                              className="flex-1 bg-transparent text-xs font-semibold text-slate-200 border-none outline-none placeholder-slate-500 focus:text-emerald-300 transition-colors"
                              placeholder="Nombre del área..."
                            />
                            <button
                              onClick={() => onToggleAreaVisibility(area.id)}
                              title={area.visible ? 'Ocultar' : 'Mostrar'}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              {area.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={async () => {
                                if (await customConfirm('¿Eliminar esta área?')) {
                                  onDeleteArea(area.id);
                                }
                              }}
                              title="Eliminar área"
                              className="p-1 rounded-lg text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Collection Assignment Selector */}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <Folder className="w-3.5 h-3.5 shrink-0" />
                            <select
                              value={area.collectionId || "default"}
                              onChange={(e) => onUpdateArea(area.id, { collectionId: e.target.value })}
                              className="flex-1 bg-[#0a0f0d]/80 border border-[#1b3d2b]/40 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-400 transition-colors cursor-pointer"
                            >
                              {routeCollections.map((col) => (
                                <option key={col.id} value={col.id} style={{ backgroundColor: '#0c120f', color: '#e2e8f0' }}>
                                  📁 {col.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Metrics Row */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                            <span title="Área">📐 {areaLabel}</span>
                            <span title="Perímetro">📏 {perimLabel}</span>
                            <span title="Vértices">⬡ {area.points.length}</span>
                          </div>

                          {/* Color Picker Row */}
                          <div className="flex items-center gap-1.5">
                            <Palette className="w-3 h-3 text-slate-500" />
                            {['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'].map((c) => (
                              <button
                                key={c}
                                onClick={() => onUpdateArea(area.id, { color: c })}
                                className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-125 cursor-pointer ${
                                  area.color === c
                                    ? 'border-white/80 shadow-[0_0_6px] scale-110'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: c, boxShadow: area.color === c ? `0 0 6px ${c}` : undefined }}
                              />
                            ))}
                          </div>

                          {/* Center on Map button */}
                          <button
                            onClick={() => {
                              if (area.points.length > 0) {
                                const lat = area.points.reduce((s, p) => s + p.lat, 0) / area.points.length;
                                const lng = area.points.reduce((s, p) => s + p.lng, 0) / area.points.length;
                                onFlyToCoords(lat, lng);
                              }
                            }}
                            className="w-full py-1.5 rounded-lg border border-[#1b3d2b]/30 bg-[#0a0f0d] text-[10px] text-slate-400 hover:text-emerald-300 hover:border-emerald-500/20 transition-all flex items-center justify-center gap-1.5 font-semibold cursor-pointer"
                          >
                            <Compass className="w-3 h-3" />
                            Centrar en Mapa
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {areas.length === 0 && !isDrawingArea && (
                  <p className="text-[10px] text-slate-500 text-center py-2">
                    No hay áreas dibujadas. Usa el botón "Dibujar Área" para trazar un polígono en el mapa.
                  </p>
                )}
              </div>

            </div>
          )}

          {/* TAB: LAYERS */}
          {activeTab === "layers" && (
            <div className="animate-fade-in">
              <LayerSelector
                activeBaseLayer={activeBaseLayer}
                onChangeBaseLayer={onChangeBaseLayer}
                overlayOpacity={overlayOpacity}
                onChangeOverlayOpacity={onChangeOverlayOpacity}
                showContours={showContours}
                onToggleContours={onToggleContours}
                customLayers={customLayers}
                onAddCustomLayer={onAddCustomLayer}
                onDeleteCustomLayer={onDeleteCustomLayer}
                onToggleCustomLayer={onToggleCustomLayer}
                onUpdateCustomLayerOpacity={onUpdateCustomLayerOpacity}
                showSlopeShading={showSlopeShading}
                onToggleSlopeShading={onToggleSlopeShading}
                slopeShadingOpacity={slopeShadingOpacity}
                onChangeSlopeShadingOpacity={onChangeSlopeShadingOpacity}
              />
            </div>
          )}

          {/* TAB: WAYPOINTS (WAYPOINT GROUPS & CHALLENGES) */}
          {(activeTab === "waypoints" || activeTab === "challenges") && (() => {
            const isChallengeMode = activeTab === "challenges";
            return (
            <div className="space-y-4 animate-fade-in flex flex-col h-full overflow-hidden">
              {/* Tab Title & Control Toolbar */}
              <div className="flex flex-col gap-2.5 shrink-0">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {isChallengeMode ? `Grupos de Retos (${waypointGroups.length})` : `Carpetas de Marcas (${waypointGroups.length})`}
                </h4>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setIsCreatingGroup(!isCreatingGroup);
                      if (isOsmSearchOpen) setIsOsmSearchOpen(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                      isCreatingGroup
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                        : "bg-[#1c2921] border-[#1b3d2b] text-slate-300 hover:text-amber-400 hover:border-amber-500/25"
                    }`}
                  >
                    {isChallengeMode ? "🏆 Nuevo Reto" : "📁 Nueva Carpeta"}
                  </button>
                  {!isChallengeMode && (
                  <button
                    onClick={() => {
                      setIsOsmSearchOpen(!isOsmSearchOpen);
                      if (isCreatingGroup) setIsCreatingGroup(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                      isOsmSearchOpen
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                        : "bg-[#1c2921] border-[#1b3d2b] text-slate-300 hover:text-amber-400 hover:border-amber-500/25"
                    }`}
                    title="Buscar cimas, fuentes y campamentos en OpenStreetMap"
                  >
                    🗺️ OSM POIs
                  </button>
                  )}
                </div>
              </div>

              {/* Collapsible Panel Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                {/* 1. OPENSTREETMAP POI SEARCH CONSOLE */}
                {!isChallengeMode && isOsmSearchOpen && (
                  <div className="bg-[#0c120f]/80 border border-amber-500/20 rounded-xl p-4 space-y-3.5 shadow-inner animate-fade-in">
                    <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        🗺️ Encontrar POIs en OSM
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOsmSearchOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Cerrar
                      </button>
                    </div>

                    {/* POI Category */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Tipo de Punto de Interés
                      </label>
                      <select
                        value={osmCategory}
                        onChange={(e) => setOsmCategory(e.target.value)}
                        className="w-full bg-[#050807] border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      >
                        <option value="peak" className="bg-[#0c120f]">🏔️ Cimas y Montañas</option>
                        <option value="camp" className="bg-[#0c120f]">⛺ Refugios y Campamentos</option>
                        <option value="water" className="bg-[#0c120f]">💧 Fuentes y Manantiales</option>
                        <option value="camera" className="bg-[#0c120f]">📸 Miradores e Vistas</option>
                      </select>
                    </div>

                    {/* Search Radius */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Radio de Búsqueda</span>
                        <span className="text-amber-400 font-mono font-bold">{osmRadius} km</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={osmRadius}
                        onChange={(e) => setOsmRadius(parseInt(e.target.value))}
                        className="w-full h-1 bg-[#050807] rounded-lg accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Fetch Trigger */}
                    <button
                      type="button"
                      onClick={handleOsmSearch}
                      disabled={osmLoading}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      {osmLoading ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          Buscando en OSM...
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          Buscar Alrededor del Mapa
                        </>
                      )}
                    </button>

                    {/* OSM Query Results list */}
                    {osmSearchExecuted && !osmLoading && (
                      <div className="border-t border-amber-500/10 pt-3.5 space-y-2">
                        {/* POI Selection Header */}
                        <div className="flex justify-between items-center bg-[#070a08]/30 p-1.5 rounded-lg border border-amber-500/5 select-none text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              Resultados ({osmPois.length})
                            </span>
                            {osmPois.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const allSelected = selectedPoiIds.length === osmPois.length;
                                  if (allSelected) {
                                    onSetSelectedPoiIds([]);
                                  } else {
                                    onSetSelectedPoiIds(osmPois.map((p) => p.id));
                                  }
                                }}
                                className="text-[8px] font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                {selectedPoiIds.length === osmPois.length ? "Ninguno" : "Todo"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dropdown Selector Card for Target Challenge */}
                        {selectedPoiIds.length > 0 && (
                          <div className="flex flex-col gap-1.5 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-xl p-3 shadow-inner animate-fade-in">
                            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                              🎯 Reto o Carpeta Destino:
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={importTargetGroupId}
                                onChange={(e) => setImportTargetGroupId(e.target.value)}
                                className="flex-1 bg-[#050807] border border-[#1b3d2b] rounded-lg px-2 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                              >
                                <option value="default" className="bg-[#0c120f]">📍 Mis Marcadores (Defecto)</option>
                                {waypointGroups.map((g) => (
                                  <option key={g.id} value={g.id} className="bg-[#0c120f]">
                                    🏆 {g.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const poisToImport = osmPois.filter((p) => selectedPoiIds.includes(p.id));
                                  if (onAddMultipleWaypoints && poisToImport.length > 0) {
                                    const selectedGroup = waypointGroups.find(g => g.id === importTargetGroupId);
                                    const targetColor = selectedGroup ? selectedGroup.color : "#3b82f6";
                                    const wptsToImport = poisToImport.map((p) => ({
                                      name: p.name,
                                      lat: p.lat,
                                      lng: p.lng,
                                      icon: p.icon,
                                      note: p.note,
                                      color: targetColor,
                                      groupId: importTargetGroupId,
                                      completed: false,
                                    }));
                                    onAddMultipleWaypoints(wptsToImport);
                                    onSetSelectedPoiIds([]);
                                    customAlert(`¡Importación exitosa! Se han añadido ${wptsToImport.length} marcas a "${selectedGroup ? selectedGroup.name : 'Mis Marcadores'}".`);
                                  }
                                }}
                                className="px-3 py-1.5 text-[10px] font-extrabold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                📥 Importar ({selectedPoiIds.length})
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {osmPois.length === 0 ? (
                          <p className="text-[10px] text-slate-500 text-center py-2 leading-relaxed">
                            No se encontraron puntos en esta zona. Desplaza el mapa e intenta aumentar el radio de búsqueda.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {osmPois.map((poi) => {
                              const isSelected = selectedPoiIds.includes(poi.id);
                              return (
                                <div
                                  key={poi.id}
                                  onClick={() => {
                                    // 1. Center map
                                    onFlyToCoords(poi.lat, poi.lng);
                                    // 2. Toggle checkbox
                                    onSetSelectedPoiIds((prev) =>
                                      prev.includes(poi.id)
                                        ? prev.filter((id) => id !== poi.id)
                                        : [...prev, poi.id]
                                    );
                                  }}
                                  className={`group flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500/50"
                                      : "bg-[#050807]/60 border-white/5 hover:border-amber-500/20"
                                  }`}
                                >
                                  {/* Selection Checkbox on the left */}
                                  <div className="mr-2 shrink-0 select-none">
                                    {isSelected ? (
                                      <div className="w-4 h-4 rounded-full bg-amber-500 border border-amber-500 flex items-center justify-center text-white shadow">
                                        <Check className="w-2.5 h-2.5 stroke-[4]" />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-slate-600 bg-black/40 hover:border-amber-400" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-slate-200 truncate group-hover:text-amber-400 transition-colors">
                                      {poi.name}
                                    </p>
                                    {poi.elevation && (
                                      <p className="text-[8.5px] text-slate-500 font-semibold font-mono">
                                        Altitud: {poi.elevation} m
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddOsmPoi(poi);
                                    }}
                                    className="ml-2 w-5.5 h-5.5 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Importar marca a tus retos"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CHALLENGE CREATOR/EDITOR FORM */}
                {isCreatingGroup && (
                  <div className="bg-[#0c120f]/80 border border-[#1b3d2b] rounded-xl p-4 space-y-3.5 shadow-inner animate-fade-in">
                    <div className="flex items-center justify-between border-b border-[#1b3d2b]/20 pb-2">
                      <span className="text-xs font-bold text-emerald-400">
                        {editingGroupId
                          ? (isChallengeMode ? "Editar Reto" : "Editar Carpeta")
                          : (isChallengeMode ? "Crear Reto" : "Crear Carpeta")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingGroup(false);
                          setEditingGroupId(null);
                          setNewGroupName("");
                          setNewGroupDesc("");
                          setNewGroupColor("#10b981");
                          setNewGroupImage("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80");
                        }}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Group Name */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Nombre del Reto
                      </label>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Ej. Cimas > 1000m, Fuentes, Vistas..."
                        className="w-full bg-[#050807] border border-[#1b3d2b]/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                        required
                      />
                    </div>

                    {/* Group Description */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Descripción y Objetivo
                      </label>
                      <textarea
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        placeholder="Ej. Coronar las 10 cimas más emblemáticas de la región..."
                        rows={2}
                        className="w-full bg-[#050807] border border-[#1b3d2b]/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Group Color Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Color de Identificación
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: "#10b981", name: "Esmeralda" },
                          { value: "#3b82f6", name: "Azul" },
                          { value: "#ef4444", name: "Rojo" },
                          { value: "#f59e0b", name: "Ámbar" },
                          { value: "#8b5cf6", name: "Violeta" },
                          { value: "#ec4899", name: "Rosa" },
                        ].map((c) => {
                          const isSelected = newGroupColor === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setNewGroupColor(c.value)}
                              title={c.name}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                                isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0c120f]" : ""
                              }`}
                              style={{ backgroundColor: c.value }}
                            >
                              {isSelected && (
                                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group Cover Catalog Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Imagen de Portada (Paisaje)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                        {LANDSCAPE_IMAGES.map((img) => {
                          const isSelected = newGroupImage === img.url;
                          return (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => setNewGroupImage(img.url)}
                              title={img.name}
                              className={`relative h-10 rounded-lg overflow-hidden border transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
                                isSelected ? "border-emerald-400 ring-2 ring-emerald-400/40" : "border-white/5"
                              }`}
                            >
                              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition-colors" />
                              <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[7px] leading-tight text-center truncate font-bold text-white bg-black/50 rounded py-0.5 font-sans">
                                {img.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Action */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newGroupName.trim()) {
                          await customAlert("Por favor, introduce un nombre para el grupo.");
                          return;
                        }
                        if (editingGroupId) {
                          onUpdateWaypointGroup(editingGroupId, {
                            name: newGroupName.trim(),
                            description: newGroupDesc.trim(),
                            color: newGroupColor,
                            image: newGroupImage,
                          });
                        } else {
                          onAddWaypointGroup({
                            name: newGroupName.trim(),
                            description: newGroupDesc.trim(),
                            color: newGroupColor,
                            visible: true,
                            image: newGroupImage,
                          });
                        }
                        setNewGroupName("");
                        setNewGroupDesc("");
                        setNewGroupColor("#10b981");
                        setNewGroupImage("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80");
                        setEditingGroupId(null);
                        setIsCreatingGroup(false);
                      }}
                      className="w-full py-2 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-400/10 cursor-pointer"
                    >
                      {editingGroupId ? "Guardar Cambios" : "Guardar Reto / Carpeta"}
                    </button>
                  </div>
                )}

                {/* 3. LIST OF ACCORDION GROUPS */}
                <div className="space-y-3">
                  {waypointGroups.filter(g => !(isChallengeMode && g.id === "default")).map((group) => {
                    const isExpanded = expandedGroupId === group.id;
                    
                    // Filter waypoints belonging to this group
                    const groupWaypoints = waypoints.filter((w) => {
                      if (group.id === "default") {
                        return !w.groupId || w.groupId === "default";
                      }
                      return w.groupId === group.id;
                    });

                    const searchQuery = groupSearchQueries[group.id] || "";
                    const filteredWaypoints = groupWaypoints.filter((w) =>
                      w.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    const totalCount = groupWaypoints.length;
                    const completedCount = groupWaypoints.filter((w) => w.completed).length;
                    const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    const isFullyCompleted = totalCount > 0 && completedCount === totalCount;

                    return (
                      <div
                        key={group.id}
                        className="relative border border-[#1b3d2b]/40 rounded-xl overflow-hidden bg-[#1c2921]/45 hover:bg-[#1c2921]/55 transition-all duration-300 shadow-md"
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                          className="relative flex items-center justify-between p-3.5 transition-colors cursor-pointer gap-2.5 min-h-[58px]"
                          style={{ borderLeft: `4px solid ${group.color}` }}
                        >
                          {/* Full-height Left Fading Cover Image */}
                          {group.image && (
                            <div className="absolute inset-y-0 left-0 w-36 overflow-hidden pointer-events-none select-none">
                              <img
                                src={group.image}
                                alt=""
                                className="w-full h-full object-cover opacity-35"
                              />
                              {/* Sleek fade out gradient mask towards the interior (right) */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c2921]/85 to-[#1c2921]" />
                            </div>
                          )}

                          {/* Text and Info Content */}
                          <div className="relative z-10 flex-1 min-w-0 pr-1 pl-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-100 truncate shadow-sm">
                                {group.name}
                              </span>
                              {isChallengeMode && isFullyCompleted && (
                                <span title="¡Reto completado al 100%!">
                                  <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0 animate-bounce" />
                                </span>
                              )}
                            </div>
                            
                            {/* Short Progress metrics — Retos only */}
                            {isChallengeMode && (
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-semibold uppercase tracking-wider select-none">
                              <span>
                                {completedCount} / {totalCount} marcas
                              </span>
                              <span>•</span>
                              <span className={isFullyCompleted ? "text-yellow-400 animate-pulse font-bold" : "text-emerald-400"}>
                                {completionPercent}%
                              </span>
                            </div>
                            )}
                          </div>

                          {/* Visibility, Edit & Delete icons */}
                          <div className="relative z-10 flex items-center gap-2 shrink-0 pl-2 border-l border-white/5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleWaypointGroupVisibility(group.id);
                              }}
                              className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
                              title={group.visible ? "Ocultar marcas del reto en el mapa" : "Mostrar marcas del reto en el mapa"}
                            >
                              {group.visible ? (
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const challengeData = {
                                  name: group.name,
                                  description: group.description,
                                  color: group.color,
                                  image: group.image,
                                  waypoints: groupWaypoints.map((w) => ({
                                    name: w.name,
                                    lat: w.lat,
                                    lng: w.lng,
                                    icon: w.icon,
                                    note: w.note,
                                    color: w.color,
                                    completed: !!w.completed,
                                    image: w.image,
                                    link: w.link,
                                  })),
                                };

                                const blob = new Blob([JSON.stringify(challengeData, null, 2)], {
                                  type: "application/json",
                                });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `${group.name.replace(/\s+/g, "_")}_reto.json`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                              }}
                              className="text-slate-400 hover:text-blue-400 p-0.5 rounded transition-colors cursor-pointer"
                              title="Exportar reto a archivo JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {group.id !== "default" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroupId(group.id);
                                  setNewGroupName(group.name);
                                  setNewGroupDesc(group.description || "");
                                  setNewGroupColor(group.color);
                                  setNewGroupImage(group.image || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80");
                                  setIsCreatingGroup(true);
                                  if (isOsmSearchOpen) setIsOsmSearchOpen(false);
                                }}
                                className={`p-0.5 rounded transition-colors cursor-pointer ${
                                  editingGroupId === group.id
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : "text-slate-500 hover:text-emerald-400"
                                }`}
                                title="Editar reto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {group.id !== "default" && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (
                                    await customConfirm(
                                      `¿Seguro que deseas eliminar el reto "${group.name}"? Los waypoints asociados no se borrarán, volverán a "Mis Marcadores".`
                                    )
                                  ) {
                                    onDeleteWaypointGroup(group.id);
                                    if (expandedGroupId === group.id) {
                                      setExpandedGroupId(null);
                                    }
                                  }
                                }}
                                className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                                title="Eliminar reto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <div className="p-0.5">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Progress Bar — Retos only */}
                        {isChallengeMode && totalCount > 0 && (
                          <div className="h-1 bg-black/40 w-full relative shrink-0">
                            <div
                              className="h-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              style={{
                                width: `${completionPercent}%`,
                                backgroundColor: group.color,
                              }}
                            />
                          </div>
                        )}

                        {/* Accordion Body */}
                        {isExpanded && (
                          <div className="relative p-3 bg-[#0a0f0d]/40 border-t border-[#1b3d2b]/20 space-y-2.5 overflow-hidden">
                            {/* Blurred Cover Photo Backdrop */}
                            {group.image && (
                              <div
                                className="absolute inset-0 bg-cover bg-center pointer-events-none select-none filter blur-[14px] opacity-[0.06] scale-110"
                                style={{ backgroundImage: `url(${group.image})` }}
                              />
                            )}

                            {/* Relative Container to overlay backdrop */}
                            <div className="relative z-10 space-y-2.5">
                              {/* Group description */}
                              {group.description && (
                                <p className="text-[10px] text-slate-400 leading-relaxed italic bg-[#050807]/40 border-l border-emerald-500/20 pl-2 py-0.5 rounded-r">
                                  {group.description}
                                </p>
                              )}

                              {/* Local Search Input within this Challenge */}
                              {groupWaypoints.length > 0 && (
                                <div className="relative flex items-center animate-fade-in">
                                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                      setGroupSearchQueries((prev) => ({
                                        ...prev,
                                        [group.id]: e.target.value,
                                      }));
                                    }}
                                    placeholder="Buscar marcas en este reto..."
                                    className="w-full bg-[#050807]/60 border border-[#1b3d2b]/60 hover:border-emerald-500/20 focus:border-emerald-400 rounded-lg pl-8 pr-8 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                                  />
                                  {searchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGroupSearchQueries((prev) => ({
                                          ...prev,
                                          [group.id]: "",
                                        }));
                                      }}
                                      className="absolute right-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Waypoints within this group */}
                              {groupWaypoints.length === 0 ? (
                                <div className="py-4 text-center">
                                  <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                                    Sin marcas en este reto. Haz clic derecho en el mapa para añadir un waypoint y asígnalo a este reto.
                                  </p>
                                </div>
                              ) : filteredWaypoints.length === 0 ? (
                                <div className="py-4 text-center animate-fade-in">
                                  <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                                    🔍 No se encontraron marcas que coincidan con "{searchQuery}".
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center bg-[#070a08]/30 px-2.5 py-1.5 rounded-lg border border-white/5 select-none mb-1.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      {searchQuery ? "Resultados" : "Marcas en este reto"} ({filteredWaypoints.length})
                                    </span>
                                    {isBulkMode && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const groupWptIds = filteredWaypoints.map((w) => w.id);
                                          const allSelected = groupWptIds.every((id) => selectedWptIds.includes(id));
                                          
                                          if (allSelected) {
                                            setSelectedWptIds((prev) => prev.filter((id) => !groupWptIds.includes(id)));
                                          } else {
                                            setSelectedWptIds((prev) => {
                                              const union = new Set([...prev, ...groupWptIds]);
                                              return Array.from(union);
                                            });
                                          }
                                        }}
                                        className="text-[8.5px] font-extrabold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded cursor-pointer animate-fade-in"
                                      >
                                        {filteredWaypoints.every((w) => selectedWptIds.includes(w.id)) ? "Ninguno" : "Todo"}
                                      </button>
                                    )}
                                  </div>
                                  {filteredWaypoints.map((wpt) => {
                                    const WptIcon = WPT_ICONS[wpt.icon] || MapPin;
                                    const isCompleted = !!wpt.completed;
                                    return (
                                      <div
                                        key={wpt.id}
                                        onClick={() => {
                                          if (isBulkMode) {
                                            setSelectedWptIds((prev) =>
                                              prev.includes(wpt.id)
                                                ? prev.filter((id) => id !== wpt.id)
                                                : [...prev, wpt.id]
                                            );
                                          } else {
                                            onFlyToCoords(wpt.lat, wpt.lng);
                                          }
                                        }}
                                        className={`group flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                          isBulkMode && selectedWptIds.includes(wpt.id)
                                            ? "bg-blue-500/10 border-blue-500/40 hover:border-blue-500/50"
                                            : (isChallengeMode && isCompleted)
                                            ? "bg-emerald-500/[0.01] border-emerald-500/10 hover:border-emerald-500/20 hover:bg-[#0f1612]/30"
                                            : "bg-[#0b100d]/80 border-white/5 hover:border-emerald-500/10 hover:bg-[#0f1612]/30"
                                        }`}
                                      >
                                        {/* Circular Checkbox for Bulk Selection Mode */}
                                        {isBulkMode && (
                                          <div 
                                            title="Seleccionar para acciones en lote"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedWptIds((prev) =>
                                                prev.includes(wpt.id)
                                                  ? prev.filter((id) => id !== wpt.id)
                                                  : [...prev, wpt.id]
                                              );
                                            }}
                                            className="mr-0.5 mt-0.5 shrink-0 select-none cursor-pointer"
                                          >
                                            {selectedWptIds.includes(wpt.id) ? (
                                              <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-500 flex items-center justify-center text-white shadow">
                                                <Check className="w-2.5 h-2.5 stroke-[4]" />
                                              </div>
                                            ) : (
                                              <div className="w-4 h-4 rounded-full border border-blue-500/30 bg-blue-500/5 hover:border-blue-400 flex items-center justify-center text-transparent hover:text-blue-400/40">
                                                <Check className="w-2.5 h-2.5 stroke-[4]" />
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Custom Checkbox for completed status — Retos only */}
                                        {isChallengeMode && (
                                        <button
                                          type="button"
                                          title="Marcar como Realizado/Visitado"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleWaypointCompleted(wpt.id);
                                          }}
                                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                                            isCompleted
                                              ? "bg-emerald-500 border-emerald-500 text-black hover:bg-emerald-600 animate-fade-in"
                                              : "border-emerald-500/30 bg-emerald-500/5 text-transparent hover:text-emerald-500/40 hover:border-emerald-400"
                                          }`}
                                        >
                                          <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                                        </button>
                                        )}

                                        {/* Mini Category Icon */}
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onFlyToCoords(wpt.lat, wpt.lng);
                                          }}
                                          title="Centrar mapa en este waypoint"
                                          className="w-5 h-5 rounded flex items-center justify-center text-slate-900 shrink-0 mt-0.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                                          style={{ backgroundColor: wpt.color }}
                                        >
                                          <WptIcon className="w-3.5 h-3.5 text-white" />
                                        </div>

                                        {/* Waypoint details */}
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span
                                                className={`text-xs font-bold truncate group-hover:text-emerald-300 transition-colors ${
                                                  (isChallengeMode && isCompleted) ? "line-through text-slate-500" : "text-slate-300"
                                                }`}
                                              >
                                                {wpt.name}
                                              </span>
                                              {wpt.elevation !== undefined && (
                                                <span className="text-[8px] font-extrabold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded shrink-0 select-none">
                                                  🏔️ {useImperial ? `${Math.round(wpt.elevation * 3.28084)} ft` : `${wpt.elevation} m`}
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onEditWaypoint(wpt);
                                                }}
                                                className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                                              >
                                                Editar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (await customConfirm("¿Seguro que deseas eliminar este waypoint?")) {
                                                    onDeleteWaypoint(wpt.id);
                                                  }
                                                }}
                                                className="text-[9px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                                              >
                                                Borrar
                                              </button>
                                            </div>
                                          </div>

                                          {wpt.note && (
                                            <p className="text-[10px] text-slate-500 leading-normal">
                                              {wpt.note}
                                            </p>
                                          )}

                                          {wpt.image && (
                                            <div className="mt-1.5 relative rounded-lg overflow-hidden w-full h-24 border border-white/5 shadow-inner shrink-0 group-hover:border-emerald-500/20 transition-all">
                                              <img src={wpt.image} alt={wpt.name} className="w-full h-full object-cover filter saturate-90 hover:scale-105 transition-all duration-300" />
                                            </div>
                                          )}

                                          {wpt.link && (
                                            <div className="mt-1 flex items-center">
                                              <a
                                                href={wpt.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-all"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                🔗 Más Información
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* ADD NEW MARCA INSIDE THIS FOLDER */}
                              <div className="border-t border-[#1b3d2b]/15 pt-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRequestAddWaypointAtCenter?.(group.id);
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold border border-dashed border-sky-500/20 text-slate-500 hover:text-sky-400 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  {isChallengeMode ? "Nueva Marca en este reto" : "Nueva Marca en esta carpeta"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3.5. FLOATING BULK ACTIONS PANEL */}
              {isBulkMode && (
                <div className="bg-[#18231e] border border-blue-500/30 rounded-xl p-3.5 space-y-2.5 shadow-xl animate-fade-in shrink-0">
                  {selectedWptIds.length === 0 ? (
                    <div className="text-center py-2">
                      <p className="text-[10px] text-blue-300 font-bold flex items-center justify-center gap-1">
                        ☑️ Modo de Selección Activo
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                        Haz clic sobre las marcas en la barra lateral para seleccionarlas y aplicar acciones en lote.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                          Lote: {selectedWptIds.length} marcas seleccionadas
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedWptIds(waypoints.map((w) => w.id))}
                            className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            Marcar todas
                          </button>
                          <span className="text-slate-700 text-[9px] select-none">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedWptIds([])}
                            className="text-[9px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            Desmarcar todas
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {isChallengeMode && (
                        <button
                          type="button"
                          onClick={() => {
                            selectedWptIds.forEach(id => {
                              const wpt = waypoints.find(w => w.id === id);
                              if (wpt && !wpt.completed) onToggleWaypointCompleted(id);
                            });
                            setSelectedWptIds([]);
                          }}
                          className="py-2 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          ✅ Completar
                        </button>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            if (await customConfirm(`¿Seguro que deseas eliminar las ${selectedWptIds.length} marcas seleccionadas?`)) {
                              selectedWptIds.forEach(id => onDeleteWaypoint(id));
                              setSelectedWptIds([]);
                            }
                          }}
                          className="py-2 bg-red-400/10 hover:bg-red-400/20 text-red-400 border border-red-500/20 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-[#1b3d2b]/20">
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] text-slate-400 font-semibold w-14 shrink-0">Mover a:</span>
                          <select
                            onChange={(e) => {
                              const targetGroupId = e.target.value;
                              if (!targetGroupId) return;
                              selectedWptIds.forEach(id => {
                                if (onUpdateWaypoint) {
                                  onUpdateWaypoint(id, { groupId: targetGroupId });
                                }
                              });
                              setSelectedWptIds([]);
                            }}
                            value=""
                            className="flex-1 bg-[#0a0f0d] border border-[#1b3d2b] rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
                          >
                            <option value="" disabled>Seleccionar reto...</option>
                            {waypointGroups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] text-slate-400 font-semibold w-14 shrink-0">Copiar a:</span>
                          <select
                            onChange={(e) => {
                              const targetGroupId = e.target.value;
                              if (!targetGroupId) return;
                              selectedWptIds.forEach(id => {
                                let foundWpt = null;
                                for (const t of tracks) {
                                  const found = t.waypoints.find(w => w.id === id);
                                  if (found) {
                                    foundWpt = found;
                                    break;
                                  }
                                }
                                if (foundWpt) {
                                  onAddWaypoint({
                                    name: foundWpt.name,
                                    lat: foundWpt.lat,
                                    lng: foundWpt.lng,
                                    icon: foundWpt.icon,
                                    note: foundWpt.note,
                                    color: foundWpt.color,
                                    groupId: targetGroupId,
                                    completed: false,
                                    image: foundWpt.image,
                                    link: foundWpt.link,
                                  });
                                }
                              });
                              setSelectedWptIds([]);
                            }}
                            value=""
                            className="flex-1 bg-[#0a0f0d] border border-[#1b3d2b] rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
                          >
                            <option value="" disabled>Seleccionar reto...</option>
                            {waypointGroups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 4. JSON IMPORT WIDGET */}
              <div className="border-t border-[#1b3d2b]/40 pt-3 flex gap-2 shrink-0">
                <label className="w-full py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0c120f] hover:bg-[#0f1612] text-slate-300 hover:text-emerald-400 cursor-pointer transition-all text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Importar Marcas JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            );
          })()}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in text-slate-200">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-sans">Ajustes de la Aplicación</h3>
                <p className="text-[10px] text-slate-500">Configura tus preferencias de visualización y unidades.</p>
              </div>

              {/* Coordinate Format Section */}
              <div className="space-y-3 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/25 shadow-lg">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">Formato de Coordenadas</span>
                </div>
                <div className="space-y-2">
                  {[
                    { id: "dd", label: "Grados Decimales (DD)", desc: "Ej. 43.18705, -2.48745" },
                    { id: "ddm", label: "Grados y Minutos Decimales (DDM)", desc: "Ej. 43° 11.223' N, 2° 29.247' W" },
                    { id: "dms", label: "Grados, Minutos y Segundos (DMS)", desc: "Ej. 43° 11' 13.38\" N, 2° 29' 14.82\" W" },
                    { id: "utm", label: "UTM", desc: "Ej. 30T 541673E 4781745N" },
                    { id: "mgrs", label: "MGRS", desc: "Sistema de Referencia de Red Militar" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => onChangeCoordinateFormat(fmt.id as any)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-0.5 cursor-pointer ${
                        coordinateFormat === fmt.id
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                          : "bg-transparent border-white/5 hover:border-emerald-500/20 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-[11px] font-bold">{fmt.label}</span>
                      <span className="text-[9px] text-slate-500 font-mono leading-none">{fmt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Overlay Section */}
              <div className="space-y-3 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/25 shadow-lg">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">Cuadrícula del Mapa (Grid)</span>
                </div>
                <div className="space-y-2">
                  {[
                    { id: "none", label: "Ninguna", desc: "Sin cuadrícula en el mapa" },
                    { id: "dd", label: "Lat/Lng (Grados Decimales)", desc: "Líneas geográficas de grados decimales" },
                    { id: "dms", label: "Lat/Lng (Grados Minutos Segundos)", desc: "Líneas geográficas formato sexagesimal" },
                    { id: "utm", label: "UTM", desc: "Cuadrícula métrica proyectada UTM" },
                    { id: "mgrs", label: "MGRS", desc: "Cuadrícula militar estandarizada" },
                  ].map((grid) => (
                    <button
                      key={grid.id}
                      onClick={() => onChangeGridOverlay(grid.id as any)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-0.5 cursor-pointer ${
                        gridOverlay === grid.id
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                          : "bg-transparent border-white/5 hover:border-emerald-500/20 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-[11px] font-bold">{grid.label}</span>
                      <span className="text-[9px] text-slate-500 leading-none">{grid.desc}</span>
                    </button>
                  ))}
                </div>

                {/* ON/OFF toggle switch for showing coordinate text labels on the grid lines */}
                {gridOverlay !== "none" && (
                  <div className="pt-3 border-t border-[#1b3d2b]/20 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] font-bold text-slate-300">Mostrar Datos Lat/Lng</span>
                      <span className="text-[9px] text-slate-500 leading-none">Muestra valores en cada línea</span>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleGridLabels}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        showGridLabels ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          showGridLabels ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Distance Units Section */}
              <div className="space-y-3 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/25 shadow-lg">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">Unidades de Medida</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { if (useImperial) onToggleUnits(); }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                      !useImperial
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                        : "bg-transparent border-white/5 hover:border-emerald-500/20 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Métrica (km, m)
                  </button>
                  <button
                    onClick={() => { if (!useImperial) onToggleUnits(); }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                      useImperial
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                        : "bg-transparent border-white/5 hover:border-emerald-500/20 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Imperial (mi, ft)
                  </button>
                </div>
              </div>

              {/* Vista a Pie de Calle / Street View Section */}
              <div className="space-y-3 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/25 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-400 shrink-0 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="4" r="2"/>
                      <path d="M12 6c-1.1 0-2 .9-2 2v5h1v7h2v-7h1V8c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">Vista de Calle (Street View)</span>
                  </div>
                  {/* Indicator Badge */}
                  {isStreetViewActive && (
                    <span className="text-[8px] bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">
                      Activo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Inspecciona carreteras y caminos de montaña en vista panorámica dividida colocando el Pegman amarillo en el mapa.
                </p>
                <button
                  type="button"
                  onClick={onToggleStreetView}
                  className={`w-full py-2.5 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer text-xs font-bold ${
                    isStreetViewActive
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                      : "bg-[#0b100d] border-white/5 hover:border-yellow-500/20 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="4" r="2"/>
                    <path d="M12 6c-1.1 0-2 .9-2 2v5h1v7h2v-7h1V8c0-1.1-.9-2-2-2z"/>
                  </svg>
                  {isStreetViewActive ? "Desactivar Vista de Calle" : "Activar Vista de Calle"}
                </button>
              </div>

              {/* Keyboard Shortcuts Section */}
              <div className="space-y-3 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/25 shadow-lg">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">Accesos Directos</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  SummitGPS soporta atajos de teclado rápidos para agilizar tu flujo de trabajo en la planificación de rutas.
                </p>
                <button
                  type="button"
                  onClick={onToggleShortcutsModal}
                  className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  ⌨️ Mostrar Atajos de Teclado
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
