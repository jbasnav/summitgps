import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BaseLayerId } from "./LayerSelector";
import type { Track, RoutePoint, Waypoint, WaypointGroup, Area } from "../hooks/useRoutePlanner";
import { Plus, Scissors } from "lucide-react";
import { useCustomDialog } from "./CustomDialog";
import { formatCoordinatesByFormat, convertLatLngToUtm, convertUtmToLatLng, formatArea, calculatePolygonPerimeter } from "../utils/geoUtils";

interface MapContainerProps {
  tracks: Track[];
  activeTrackId: string | null;
  isDrawing: boolean;
  isSplitting: boolean;
  activeBaseLayer: BaseLayerId;
  overlayOpacity: number;
  showContours: boolean;
  hoverPoint: RoutePoint | null;
  flyToCoords: [number, number] | null;
  onAddPoint: (lat: number, lng: number) => void;
  onRightClickMap: (lat: number, lng: number) => void;
  onEditWaypoint: (wpt: Waypoint) => void;
  onUpdateWaypoint: (id: string, fields: Partial<Waypoint>) => void;
  onSplitTrackAt: (trackId: string, index: number) => void;
  waypointGroups: WaypointGroup[];
  onMapMove?: (lat: number, lng: number) => void;
  osmPois: any[];
  onAddOsmPoi: (poi: any) => void;

  // Bulk selection props
  isBulkMode: boolean;
  selectedWptIds: string[];
  onSetSelectedWptIds: React.Dispatch<React.SetStateAction<string[]>>;
  waypoints: Waypoint[];
  selectedPoiIds: string[];
  onSetSelectedPoiIds: React.Dispatch<React.SetStateAction<string[]>>;
  isSelectingArea: boolean;
  setIsSelectingArea: React.Dispatch<React.SetStateAction<boolean>>;

  // Grid and Location Click settings
  gridOverlay: "none" | "dd" | "dms" | "utm" | "mgrs";
  showGridLabels: boolean;
  markedLocation: { lat: number; lng: number } | null;
  onSetMarkedLocation: (loc: { lat: number; lng: number } | null) => void;

  // Area drawing and measurement props
  isDrawingArea: boolean;
  areas: Area[];
  onAreaComplete: (points: { lat: number; lng: number }[], color: string) => void;
  useImperial: boolean;
  onMapReady?: (map: L.Map) => void;
  isEditingRoute: boolean;
  onUpdateRoutePoint: (trackId: string, index: number, lat: number, lng: number) => void;
  onInsertIntermediatePoint: (trackId: string, lat: number, lng: number) => void;
}

// Map Tile Providers
const TILE_LAYERS = {
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  opentopo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
};

const HILLSHADE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}";

const WPT_SVG_PATHS: Record<string, string> = {
  mountain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`,
  camp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M19 22H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/><path d="m12 7-6 6h12l-6-6z"/></svg>`,
  camera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  danger: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  water: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>`,
  trophy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6c0 3.31-2.69 6-6 6S6 11.31 6 8a6 6 0 0 1 6-6z"/></svg>`,
  forest: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 22v-3"/><path d="M5 19h14a2 2 0 0 0 1.66-3.11l-3.32-5.4A2 2 0 0 0 15.66 9.6H14.4c.5-1.2.2-2.7-.8-3.7l-1-1-1 1c-1 1-1.3 2.5-.8 3.7h-1.26a2 2 0 0 0-1.68.89l-3.32 5.4A2 2 0 0 0 5 19z"/></svg>`,
  lake: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M2 6c.6.5 1.2 1 2.5 1C6 7 7 6 9 6s3 1 4.5 1c1.5 0 2.5-1 4.5-1s3 1 4 1"/><path d="M2 12c.6.5 1.2 1 2.5 1C6 13 7 12 9 12s3 1 4.5 1c1.5 0 2.5-1 4.5-1s3 1 4 1"/><path d="M2 18c.6.5 1.2 1 2.5 1C6 19 7 18 9 18s3 1 4.5 1c1.5 0 2.5-1 4.5-1s3 1 4 1"/></svg>`,
  fire: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  binoculars: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M8 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M16 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><path d="M9 12h6"/><path d="M12 12V8"/><path d="M5 8h14"/></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  car: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4 1L1 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="15" cy="17" r="2"/><path d="M13 17H9"/><path d="M5 17H4"/><path d="M17 17h2"/></svg>`,
  favorite: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
};

export function MapContainer({
  tracks,
  activeTrackId,
  isDrawing,
  isSplitting,
  activeBaseLayer,
  overlayOpacity,
  showContours,
  hoverPoint,
  flyToCoords,
  onAddPoint,
  onRightClickMap,
  onEditWaypoint,
  onSplitTrackAt,
  // waypointGroups is kept in Props but not destructured here to avoid unused variable warning
  onMapMove,
  osmPois,
  onAddOsmPoi,
  isBulkMode,
  selectedWptIds,
  onSetSelectedWptIds,
  waypoints,
  selectedPoiIds,
  onSetSelectedPoiIds,
  gridOverlay,
  showGridLabels,
  markedLocation,
  onSetMarkedLocation,
  isSelectingArea,
  setIsSelectingArea,
  isDrawingArea,
  areas,
  onAreaComplete,
  useImperial,
  onMapReady,
  onUpdateWaypoint,
  isEditingRoute,
  onUpdateRoutePoint,
  onInsertIntermediatePoint,
}: MapContainerProps) {
  const { customConfirm } = useCustomDialog();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  
  // Ref maps to manage layers dynamically
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const hillshadeLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesRef = useRef<Record<string, L.Polyline>>({});
  const controlMarkersRef = useRef<L.CircleMarker[]>([]);
  const waypointMarkersRef = useRef<Record<string, L.Marker>>({});
  const osmPoiMarkersRef = useRef<Record<string, L.Marker>>({});
  const hoverIndicatorRef = useRef<L.CircleMarker | null>(null);
  const markedLocationMarkerRef = useRef<L.Marker | null>(null);
  const gridGroupRef = useRef<L.LayerGroup | null>(null);

  // Box Area Selection refs (isSelectingArea state is now a prop)
  const activeRectRef = useRef<L.Rectangle | null>(null);
  const startLatLngRef = useRef<L.LatLng | null>(null);

  // Area drawing refs
  const areaPolygonRef = useRef<L.Polygon | null>(null);
  const areaVertexMarkersRef = useRef<L.CircleMarker[]>([]);
  const areaPointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const areaLayersRef = useRef<Record<string, L.Polygon>>({});
  const areaLabelMarkersRef = useRef<Record<string, L.Marker>>({});

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [43.1906, -4.8322],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Initial base layer (low zIndex so it stays underneath overlays)
    const baseLayer = L.tileLayer(TILE_LAYERS[activeBaseLayer], { maxZoom: 19, zIndex: 1 }).addTo(map);
    tileLayerRef.current = baseLayer;

    // Hillshading overlay layer (high zIndex so it always stays on top of base layers)
    const hillshadeLayer = L.tileLayer(HILLSHADE_URL, {
      maxZoom: 19,
      opacity: showContours ? overlayOpacity : 0,
      zIndex: 10,
    }).addTo(map);
    hillshadeLayerRef.current = hillshadeLayer;

    mapRef.current = map;
    setMapInstance(map);

    if (onMapReady) {
      onMapReady(map);
    }

    // Report initial coordinates
    if (onMapMove) {
      onMapMove(43.1906, -4.8322);
    }

    // Report center shifts on drag/zoom
    map.on("moveend", () => {
      const center = map.getCenter();
      if (onMapMove) {
        onMapMove(center.lat, center.lng);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update Base Layer
  useEffect(() => {
    if (!mapInstance || !tileLayerRef.current) return;

    mapInstance.removeLayer(tileLayerRef.current);
    const newBaseLayer = L.tileLayer(TILE_LAYERS[activeBaseLayer], { maxZoom: 19, zIndex: 1 }).addTo(mapInstance);
    tileLayerRef.current = newBaseLayer;
  }, [mapInstance, activeBaseLayer]);

  // Update Hillshade Overlay
  useEffect(() => {
    if (!mapInstance || !hillshadeLayerRef.current) return;

    if (showContours) {
      hillshadeLayerRef.current.setOpacity(overlayOpacity);
      if (!mapInstance.hasLayer(hillshadeLayerRef.current)) {
        hillshadeLayerRef.current.addTo(mapInstance);
      }
    } else {
      hillshadeLayerRef.current.setOpacity(0);
      if (mapInstance.hasLayer(hillshadeLayerRef.current)) {
        mapInstance.removeLayer(hillshadeLayerRef.current);
      }
    }
  }, [mapInstance, showContours, overlayOpacity]);

  // Handle map drawing clicks & right clicks
  useEffect(() => {
    if (!mapInstance) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (isDrawing) {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      } else if (!isSplitting && !isSelectingArea && !isBulkMode && !isDrawingArea && !isEditingRoute) {
        onSetMarkedLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    const onMapRightClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingArea) {
        onRightClickMap(e.latlng.lat, e.latlng.lng);
      }
    };

    mapInstance.on("click", onMapClick);
    mapInstance.on("contextmenu", onMapRightClick);

    return () => {
      mapInstance.off("click", onMapClick);
      mapInstance.off("contextmenu", onMapRightClick);
    };
  }, [mapInstance, isDrawing, isSplitting, isSelectingArea, isBulkMode, isDrawingArea, isEditingRoute, onAddPoint, onSetMarkedLocation, onRightClickMap]);

  // Render Polylines for ALL visible tracks
  useEffect(() => {
    if (!mapInstance) return;

    const currentTrackIds = new Set(tracks.filter((t) => t.visible).map((t) => t.id));

    // 1. Clean up polylines for tracks that are no longer visible or deleted
    Object.keys(polylinesRef.current).forEach((id) => {
      if (!currentTrackIds.has(id)) {
        mapInstance.removeLayer(polylinesRef.current[id]);
        delete polylinesRef.current[id];
      }
    });

    // 2. Draw or update polylines for visible tracks
    tracks.forEach((track) => {
      if (!track.visible || track.points.length === 0) return;

      const latlngs = track.points.map((p) => L.latLng(p.lat, p.lng));
      const isActive = track.id === activeTrackId;
      const polylineOpts = {
        color: track.color,
        weight: isActive ? 5 : 3.5,
        opacity: isActive ? 0.9 : 0.65,
        lineCap: "round" as const,
        lineJoin: "round" as const,
        dashArray: isActive && isDrawing ? "6, 6" : undefined, // Dashed line while drawing!
      };

      const existingPoly = polylinesRef.current[track.id];
      const handlePolylineClick = (e: L.LeafletMouseEvent) => {
        if (isEditingRoute && isActive) {
          L.DomEvent.stopPropagation(e);
          onInsertIntermediatePoint(track.id, e.latlng.lat, e.latlng.lng);
        }
      };

      if (existingPoly) {
        existingPoly.setLatLngs(latlngs);
        existingPoly.setStyle(polylineOpts);
        existingPoly.off("click");
        existingPoly.on("click", handlePolylineClick);
      } else {
        const polyline = L.polyline(latlngs, polylineOpts)
          .addTo(mapInstance)
          .on("click", handlePolylineClick);
        polylinesRef.current[track.id] = polyline;
      }
    });
  }, [mapInstance, tracks, activeTrackId, isDrawing, isEditingRoute, onInsertIntermediatePoint]);

  // Render Active Track Control Points & Splitting Vertices
  useEffect(() => {
    if (!mapInstance) return;

    // Clear old control markers
    controlMarkersRef.current.forEach((marker) => mapInstance.removeLayer(marker));
    controlMarkersRef.current = [];

    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack || activeTrack.points.length === 0 || !activeTrack.visible) return;

    const points = activeTrack.points;

    points.forEach((pt, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === points.length - 1;

      // Draw markers on vertices to enable interactive manipulation
      if (isFirst || isLast || points.length < 15 || idx % 2 === 0 || isSplitting) {
        // Splitting markers are bigger and highlighted
        const isSplitMode = isSplitting && idx > 0 && idx < points.length - 1;
        const colorVal = isFirst ? "#3b82f6" : isLast ? "#ef4444" : isSplitMode ? "#f97316" : activeTrack.color;
        
        let marker: L.Layer;
        const isDraggable = isEditingRoute && !isDrawing && !isSplitting;

        if (isDraggable) {
          const customDotIcon = L.divIcon({
            html: `<div style="width: ${isFirst || isLast ? '12px' : '10px'}; height: ${isFirst || isLast ? '12px' : '10px'}; border-radius: 50%; background-color: ${colorVal}; border: 1.8px solid #ffffff; box-shadow: 0 0 6px rgba(0,0,0,0.6);"></div>`,
            className: "custom-control-dot cursor-move",
            iconSize: isFirst || isLast ? [12, 12] : [10, 10],
            iconAnchor: isFirst || isLast ? [6, 6] : [5, 5],
          });
          
          const dragMarker = L.marker([pt.lat, pt.lng], {
            icon: customDotIcon,
            draggable: true,
          }).addTo(mapInstance);

          dragMarker.on("dragend", (e: any) => {
            const newLatLng = e.target.getLatLng();
            onUpdateRoutePoint(activeTrack.id, idx, newLatLng.lat, newLatLng.lng);
          });

          dragMarker.bindTooltip(`
            <div class="px-1.5 py-0.5 text-slate-200 text-[9px] bg-[#0c120f] border border-[#1b3d2b] rounded shadow-md">
              📍 Vértice ${idx + 1} (Arrastra para mover)
            </div>
          `, { direction: "top", offset: [0, -6] });

          marker = dragMarker;
        } else {
          const circle = L.circleMarker([pt.lat, pt.lng], {
            radius: isSplitMode ? 7 : isFirst || isLast ? 6 : 4,
            fillColor: colorVal,
            fillOpacity: 1,
            color: isSplitMode ? "#ffffff" : "#ffffff",
            weight: isSplitMode ? 2.5 : 1.5,
            className: isSplitMode ? "animate-pulse cursor-scissors" : "cursor-pointer",
          }).addTo(mapInstance);

          // Tooltip for split vertices
          if (isSplitMode) {
            circle.bindTooltip(`
              <div class="px-2 py-1 text-slate-100 text-[10px] bg-orange-600 border border-white/20 rounded-md font-bold shadow-md">
                ✂️ Hacer clic para Dividir aquí
              </div>
            `, { direction: "top", offset: [0, -6] });

            circle.on("click", async (e) => {
              L.DomEvent.stopPropagation(e);
              if (await customConfirm(`¿Seguro que deseas dividir la ruta "${activeTrack.name}" en este punto?`)) {
                onSplitTrackAt(activeTrack.id, idx);
              }
            });
          }
          marker = circle;
        }

        controlMarkersRef.current.push(marker as any);
      }
    });

  }, [tracks, activeTrackId, isSplitting, onSplitTrackAt, isEditingRoute, isDrawing, onUpdateRoutePoint, mapInstance]);

  // Sync Waypoints with selection indicators and customized click behavior
  useEffect(() => {
    if (!mapInstance) return;

    const currentWptIds = new Set(waypoints.map((w) => w.id));

    // 1. Remove hidden/deleted waypoint markers
    Object.keys(waypointMarkersRef.current).forEach((id) => {
      if (!currentWptIds.has(id)) {
        mapInstance.removeLayer(waypointMarkersRef.current[id]);
        delete waypointMarkersRef.current[id];
      }
    });

    // 2. Render visible waypoint markers
    waypoints.forEach((wpt) => {
      const isSelected = selectedWptIds.includes(wpt.id);
      const svg = WPT_SVG_PATHS[wpt.icon] || WPT_SVG_PATHS.mountain;
      const markerColor = wpt.color || "#10b981";
      
      const customHtml = `
        <div class="relative w-8 h-8 flex items-center justify-center animate-bounce-short">
          ${
            isBulkMode && isSelected
              ? `<div class="absolute w-10 h-10 rounded-full border border-blue-400 bg-blue-500/25 animate-ping opacity-75"></div>
                 <div class="absolute w-9 h-9 rounded-full border-2 border-blue-400 bg-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>`
              : ""
          }
          <div class="absolute w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all duration-300" style="background-color: ${
            isBulkMode && isSelected ? "#3b82f6" : markerColor
          }">
            ${
              isBulkMode && isSelected
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><polyline points="20 6 9 17 4 12"/></svg>`
                : svg
            }
          </div>
          <div class="absolute -bottom-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] transition-colors duration-300" style="border-t-color: ${
            isBulkMode && isSelected ? "#3b82f6" : markerColor
          }"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "custom-div-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const existingMarker = waypointMarkersRef.current[wpt.id];
      
      const handleClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (isBulkMode) {
          onSetSelectedWptIds((prev) =>
            prev.includes(wpt.id) ? prev.filter((id) => id !== wpt.id) : [...prev, wpt.id]
          );
        } else {
          mapInstance.setView([wpt.lat, wpt.lng], Math.max(mapInstance.getZoom() || 14, 14), {
            animate: true,
          });
        }
      };

      if (existingMarker) {
        existingMarker.setLatLng([wpt.lat, wpt.lng]);
        existingMarker.setIcon(customIcon);
        existingMarker.off("click");
        existingMarker.on("click", handleClick);

        // Update draggable status dynamically
        if (!isBulkMode) {
          existingMarker.dragging?.enable();
        } else {
          existingMarker.dragging?.disable();
        }

        // Re-attach dragend listener to prevent duplication
        existingMarker.off("dragend");
        if (!isBulkMode) {
          existingMarker.on("dragend", (e: any) => {
            const newLatLng = e.target.getLatLng();
            onUpdateWaypoint(wpt.id, {
              lat: newLatLng.lat,
              lng: newLatLng.lng,
            });
          });
        }

        existingMarker.setTooltipContent(`
          <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17] border border-[#1b3d2b] rounded-lg shadow-md">
            ${wpt.name} ${isBulkMode && isSelected ? "☑️" : ""}
          </div>
        `);
      } else {
        const marker = L.marker([wpt.lat, wpt.lng], { 
          icon: customIcon,
          draggable: !isBulkMode
        })
          .addTo(mapInstance)
          .bindTooltip(`
            <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17]/95 border border-[#1b3d2b] rounded-lg shadow-xl">
              ${wpt.name}
            </div>
          `, { direction: "top", offset: [0, -32], opacity: 0.9 })
          .on("click", handleClick);

        if (!isBulkMode) {
          marker.on("dragend", (e: any) => {
            const newLatLng = e.target.getLatLng();
            onUpdateWaypoint(wpt.id, {
              lat: newLatLng.lat,
              lng: newLatLng.lng,
            });
          });
        }
        
        waypointMarkersRef.current[wpt.id] = marker;
      }
    });

  }, [mapInstance, waypoints, onEditWaypoint, isBulkMode, selectedWptIds, onSetSelectedWptIds, onUpdateWaypoint]);

  // Leaflet mouse event-based click-and-drag Box Selection
  useEffect(() => {
    if (!mapInstance) return;

    if (!isSelectingArea) {
      mapInstance.dragging.enable();
      if (activeRectRef.current) {
        mapInstance.removeLayer(activeRectRef.current);
        activeRectRef.current = null;
      }
      startLatLngRef.current = null;
      return;
    }

    mapInstance.dragging.disable();

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.button !== 0) return; // Only left click
      startLatLngRef.current = e.latlng;
      if (activeRectRef.current) {
        mapInstance.removeLayer(activeRectRef.current);
      }
      activeRectRef.current = L.rectangle([[e.latlng.lat, e.latlng.lng], [e.latlng.lat, e.latlng.lng]], {
        color: "#3b82f6",
        weight: 1.5,
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        dashArray: "4, 4",
      }).addTo(mapInstance);
      L.DomEvent.stopPropagation(e.originalEvent);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!startLatLngRef.current || !activeRectRef.current) return;
      activeRectRef.current.setBounds(L.latLngBounds(startLatLngRef.current, e.latlng));
    };

    const onMouseUp = () => {
      if (!startLatLngRef.current || !activeRectRef.current) return;

      const bounds = activeRectRef.current.getBounds();
      const newlySelectedIds: string[] = [];

      waypoints.forEach((wpt) => {
        const wptLatLng = L.latLng(wpt.lat, wpt.lng);
        if (bounds.contains(wptLatLng)) {
          newlySelectedIds.push(wpt.id);
        }
      });

      if (newlySelectedIds.length > 0) {
        onSetSelectedWptIds((prev) => {
          const union = new Set([...prev, ...newlySelectedIds]);
          return Array.from(union);
        });
      }

      // Also select OSM POIs inside the dragged area
      const newlySelectedPoiIds: string[] = [];
      osmPois.forEach((poi) => {
        const poiLatLng = L.latLng(poi.lat, poi.lng);
        if (bounds.contains(poiLatLng)) {
          newlySelectedPoiIds.push(poi.id);
        }
      });

      if (newlySelectedPoiIds.length > 0) {
        onSetSelectedPoiIds((prev) => {
          const union = new Set([...prev, ...newlySelectedPoiIds]);
          return Array.from(union);
        });
      }

      if (activeRectRef.current) {
        mapInstance.removeLayer(activeRectRef.current);
        activeRectRef.current = null;
      }
      startLatLngRef.current = null;
      setIsSelectingArea(false);
    };

    mapInstance.on("mousedown", onMouseDown);
    mapInstance.on("mousemove", onMouseMove);
    mapInstance.on("mouseup", onMouseUp);

    return () => {
      mapInstance.off("mousedown", onMouseDown);
      mapInstance.off("mousemove", onMouseMove);
      mapInstance.off("mouseup", onMouseUp);
      mapInstance.dragging.enable();
      if (activeRectRef.current) {
        mapInstance.removeLayer(activeRectRef.current);
        activeRectRef.current = null;
      }
    };
  }, [mapInstance, isSelectingArea, waypoints, onSetSelectedWptIds, osmPois, onSetSelectedPoiIds]);

  // Area Drawing Mode: click to add vertices, double-click to close
  useEffect(() => {
    if (!mapInstance) return;

    const cleanup = () => {
      if (areaPolygonRef.current) {
        mapInstance.removeLayer(areaPolygonRef.current);
        areaPolygonRef.current = null;
      }
      areaVertexMarkersRef.current.forEach((m) => mapInstance.removeLayer(m));
      areaVertexMarkersRef.current = [];
      areaPointsRef.current = [];
    };

    if (!isDrawingArea) {
      cleanup();
      return;
    }

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingArea) return;
      const pts = areaPointsRef.current;

      // If clicking near the first vertex (distance < 20px), close the polygon
      if (pts.length >= 3) {
        const firstPt = mapInstance.latLngToContainerPoint(L.latLng(pts[0].lat, pts[0].lng));
        const clickPt = e.containerPoint;
        const dx = firstPt.x - clickPt.x;
        const dy = firstPt.y - clickPt.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          // Close the polygon
          const finalPoints = [...pts];
          onAreaComplete(finalPoints, "#10b981");
          cleanup();
          return;
        }
      }

      // Add a new vertex
      const newPt = { lat: e.latlng.lat, lng: e.latlng.lng };
      areaPointsRef.current = [...pts, newPt];
      const updatedPts = areaPointsRef.current;

      // Update or create the live polygon preview
      const latlngs = updatedPts.map((p) => L.latLng(p.lat, p.lng));
      if (areaPolygonRef.current) {
        areaPolygonRef.current.setLatLngs(latlngs);
      } else {
        areaPolygonRef.current = L.polygon(latlngs, {
          color: "#10b981",
          weight: 2,
          opacity: 0.9,
          fillColor: "#10b981",
          fillOpacity: 0.15,
          dashArray: "6, 5",
        }).addTo(mapInstance);
      }

      // Add a vertex circle marker
      const isFirst = updatedPts.length === 1;
      const vm = L.circleMarker([newPt.lat, newPt.lng], {
        radius: isFirst ? 7 : 4,
        fillColor: isFirst ? "#ffffff" : "#10b981",
        fillOpacity: 1,
        color: "#10b981",
        weight: 2,
        className: isFirst ? "animate-pulse" : "",
      }).addTo(mapInstance);

      if (isFirst) {
        vm.bindTooltip(
          '<div class="text-[9px] font-bold text-emerald-300 bg-[#131b17]/95 px-2 py-0.5 rounded border border-emerald-500/30">Clic aquí para cerrar</div>',
          { permanent: false, direction: "top" }
        );
      }
      areaVertexMarkersRef.current.push(vm);
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      const pts = areaPointsRef.current;
      if (pts.length >= 3) {
        onAreaComplete([...pts], "#10b981");
        cleanup();
      }
    };

    mapInstance.on("click", onMapClick);
    mapInstance.on("dblclick", onDblClick);

    return () => {
      mapInstance.off("click", onMapClick);
      mapInstance.off("dblclick", onDblClick);
      cleanup();
    };
  }, [mapInstance, isDrawingArea, onAreaComplete]);

  // Render saved Area polygons on the map
  useEffect(() => {
    if (!mapInstance) return;

    // Remove stale layers
    const currentAreaIds = new Set(areas.filter((a) => a.visible).map((a) => a.id));
    Object.keys(areaLayersRef.current).forEach((id) => {
      if (!currentAreaIds.has(id)) {
        mapInstance.removeLayer(areaLayersRef.current[id]);
        delete areaLayersRef.current[id];
      }
    });
    Object.keys(areaLabelMarkersRef.current).forEach((id) => {
      if (!currentAreaIds.has(id)) {
        mapInstance.removeLayer(areaLabelMarkersRef.current[id]);
        delete areaLabelMarkersRef.current[id];
      }
    });

    areas.forEach((area) => {
      if (!area.visible || area.points.length < 3) return;

      const latlngs = area.points.map((p) => L.latLng(p.lat, p.lng));

      const existing = areaLayersRef.current[area.id];
      if (existing) {
        existing.setLatLngs(latlngs);
        existing.setStyle({ color: area.color, fillColor: area.color });
      } else {
        const polygon = L.polygon(latlngs, {
          color: area.color,
          weight: 2.5,
          opacity: 0.85,
          fillColor: area.color,
          fillOpacity: 0.12,
        }).addTo(mapInstance);
        areaLayersRef.current[area.id] = polygon;
      }

      // Area label marker at centroid
      const centroidLat = area.points.reduce((s, p) => s + p.lat, 0) / area.points.length;
      const centroidLng = area.points.reduce((s, p) => s + p.lng, 0) / area.points.length;

      const areaLabel = formatArea(area.areaM2, useImperial);
      
      const perimM = calculatePolygonPerimeter(area.points);
      const perimLabel = useImperial
        ? perimM * 3.28084 < 5280
          ? `${Math.round(perimM * 3.28084)} ft`
          : `${(perimM * 0.000621371).toFixed(2)} mi`
        : perimM < 1000
        ? `${Math.round(perimM)} m`
        : `${(perimM / 1000).toFixed(2)} km`;

      const labelHtml = `<div class="text-[9px] font-bold text-white px-2 py-1 rounded-lg shadow-lg text-center" style="background:${area.color}dd; border: 1px solid ${area.color}; pointer-events: none; white-space: nowrap;">
        <div>${area.name}</div>
        <div class="font-mono text-[8px] opacity-90">${areaLabel} · ${perimLabel}</div>
      </div>`;

      const labelIcon = L.divIcon({
        html: labelHtml,
        className: "area-label-icon",
        iconSize: undefined,
        iconAnchor: undefined,
      });

      const existingLabel = areaLabelMarkersRef.current[area.id];
      if (existingLabel) {
        existingLabel.setLatLng([centroidLat, centroidLng]);
        existingLabel.setIcon(labelIcon);
      } else {
        const labelMarker = L.marker([centroidLat, centroidLng], {
          icon: labelIcon,
          interactive: false,
          zIndexOffset: -100,
        }).addTo(mapInstance);
        areaLabelMarkersRef.current[area.id] = labelMarker;
      }
    });
  }, [mapInstance, areas, useImperial]);

  // Area layers cleanup on mapInstance reset
  useEffect(() => {
    return () => {
      Object.keys(areaLayersRef.current).forEach((id) => {
        if (mapInstance) mapInstance.removeLayer(areaLayersRef.current[id]);
      });
      Object.keys(areaLabelMarkersRef.current).forEach((id) => {
        if (mapInstance) mapInstance.removeLayer(areaLabelMarkersRef.current[id]);
      });
      areaLayersRef.current = {};
      areaLabelMarkersRef.current = {};
    };
  }, [mapInstance]);

  // Sync Temporary OSM POIs on the map
  useEffect(() => {
    if (!mapInstance) return;

    const currentOsmPoiIds = new Set(osmPois.map((p) => p.id));

    // 1. Remove old OSM POI markers that are no longer active
    Object.keys(osmPoiMarkersRef.current).forEach((id) => {
      if (!currentOsmPoiIds.has(id)) {
        mapInstance.removeLayer(osmPoiMarkersRef.current[id]);
        delete osmPoiMarkersRef.current[id];
      }
    });

    // 2. Render active OSM POI markers with a distinctive translucid look and click-to-import action
    osmPois.forEach((poi) => {
      const isSelected = selectedPoiIds.includes(poi.id);
      const svg = WPT_SVG_PATHS[poi.icon] || WPT_SVG_PATHS.mountain;
      
      const customHtml = `
        <div class="relative w-8 h-8 flex items-center justify-center animate-pulse cursor-pointer">
          ${
            isSelected
              ? `<div class="absolute w-10 h-10 rounded-full border border-blue-400 bg-blue-500/25 animate-ping opacity-75"></div>
                 <div class="absolute w-9 h-9 rounded-full border-2 border-blue-400 bg-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                 <div class="absolute w-8 h-8 rounded-full border-2 border-white bg-blue-600 shadow-lg flex items-center justify-center transition-all">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><polyline points="20 6 9 17 4 12"/></svg>
                 </div>
                 <div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border border-white flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm font-sans">✓</div>`
              : `<div class="absolute w-8 h-8 rounded-full border border-dashed border-white bg-amber-500/60 hover:bg-amber-500/90 shadow-lg flex items-center justify-center transition-all scale-90 hover:scale-100">
                   ${svg}
                 </div>
                 <div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm font-sans">+</div>`
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "custom-osm-poi-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const handleClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        // 1. Center map
        mapInstance.setView([poi.lat, poi.lng], Math.max(mapInstance.getZoom() || 14, 14), {
          animate: true,
        });
        // 2. Toggle selection
        onSetSelectedPoiIds((prev) =>
          prev.includes(poi.id) ? prev.filter((id) => id !== poi.id) : [...prev, poi.id]
        );
      };

      const existingMarker = osmPoiMarkersRef.current[poi.id];
      if (existingMarker) {
        existingMarker.setLatLng([poi.lat, poi.lng]);
        existingMarker.setIcon(customIcon);
        existingMarker.off("click");
        existingMarker.on("click", handleClick);
        existingMarker.setTooltipContent(`
          <div class="px-2 py-1 text-slate-100 text-xs font-semibold bg-[#131b17]/95 border border-[#1b3d2b] rounded-lg shadow-xl">
            🗺️ ${poi.name} ${poi.elevation ? `(${poi.elevation}m)` : ""} ${isSelected ? "☑️" : ""}
            <p class="text-[9px] text-slate-300 font-bold mt-0.5">${isSelected ? "Seleccionado (Clic para deseleccionar)" : "Clic para Seleccionar"}</p>
          </div>
        `);
      } else {
        const marker = L.marker([poi.lat, poi.lng], { icon: customIcon })
          .addTo(mapInstance)
          .bindTooltip(`
            <div class="px-2 py-1 text-slate-100 text-xs font-semibold bg-[#131b17]/95 border border-[#1b3d2b] rounded-lg shadow-xl">
              🗺️ ${poi.name} ${poi.elevation ? `(${poi.elevation}m)` : ""} ${isSelected ? "☑️" : ""}
              <p class="text-[9px] text-slate-300 font-bold mt-0.5">${isSelected ? "Seleccionado (Clic para deseleccionar)" : "Clic para Seleccionar"}</p>
            </div>
          `, { direction: "top", offset: [0, -16], opacity: 0.9 })
          .on("click", handleClick);

        osmPoiMarkersRef.current[poi.id] = marker;
      }
    });

  }, [mapInstance, osmPois, onAddOsmPoi, selectedPoiIds, onSetSelectedPoiIds]);

  // Sync Hover Marker (Synchronized Elevation Chart Hover Indicator)
  useEffect(() => {
    if (!mapInstance) return;

    if (hoverIndicatorRef.current) {
      mapInstance.removeLayer(hoverIndicatorRef.current);
      hoverIndicatorRef.current = null;
    }

    if (hoverPoint) {
      const indicator = L.circleMarker([hoverPoint.lat, hoverPoint.lng], {
        radius: 8,
        fillColor: "#f97316",
        fillOpacity: 0.8,
        color: "#ffffff",
        weight: 2,
        className: "animate-ping-slow",
      }).addTo(mapInstance);

      indicator.bindTooltip(`
        <div class="px-2 py-1 text-slate-100 text-[10px] font-bold bg-[#131b17] border border-orange-500/30 rounded-lg shadow-md">
          Alt: ${Math.round(hoverPoint.elevation)}m | Dist: ${hoverPoint.distance.toFixed(2)}km
        </div>
      `, { permanent: true, direction: "top", offset: [0, -10] }).openTooltip();

      hoverIndicatorRef.current = indicator;
    }
  }, [mapInstance, hoverPoint]);

  // Sync Marked Location Marker
  useEffect(() => {
    if (!mapInstance) return;

    if (markedLocationMarkerRef.current) {
      mapInstance.removeLayer(markedLocationMarkerRef.current);
      markedLocationMarkerRef.current = null;
    }

    if (markedLocation) {
      // Create a gorgeous orange pin marker with a pulsing ring!
      const customHtml = `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-orange-500/35 border border-orange-400 animate-ping opacity-75"></div>
          <div class="absolute w-6 h-6 rounded-full border-2 border-white bg-orange-500 shadow-lg flex items-center justify-center transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-white">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "marked-location-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 24],
      });

      const marker = L.marker([markedLocation.lat, markedLocation.lng], { icon: customIcon }).addTo(mapInstance);
      markedLocationMarkerRef.current = marker;
    }
  }, [mapInstance, markedLocation]);

  // Sync Grid Overlay
  useEffect(() => {
    if (!mapInstance) return;

    if (!gridGroupRef.current) {
      gridGroupRef.current = L.layerGroup().addTo(mapInstance);
    }

    const gridGroup = gridGroupRef.current;

    // Create a custom high index overlay pane for the grid to render ABOVE base tile layers but BELOW markers
    if (!mapInstance.getPane("gridPane")) {
      const pane = mapInstance.createPane("gridPane");
      pane.style.zIndex = "450"; // Above overlayPane (400) but below markerPane (600)
      pane.style.pointerEvents = "none";
    }

    const drawGrid = () => {
      gridGroup.clearLayers();
      if (!gridOverlay || gridOverlay === "none") return;

      const bounds = mapInstance.getBounds();
      const zoom = mapInstance.getZoom();

      const west = bounds.getWest();
      const east = bounds.getEast();
      const south = bounds.getSouth();
      const north = bounds.getNorth();

      // Check if zoom is too small to avoid browser lag
      if (zoom < 4) return;

      if (gridOverlay === "dd" || gridOverlay === "dms") {
        // Geographical Grid: degrees
        let step = 1.0;
        if (zoom >= 17) step = 0.001;
        else if (zoom >= 15) step = 0.005;
        else if (zoom >= 13) step = 0.02;
        else if (zoom >= 11) step = 0.1;
        else if (zoom >= 9) step = 0.5;
        else if (zoom >= 7) step = 1.0;
        else if (zoom >= 5) step = 2.0;
        else step = 5.0;

        const startLng = Math.floor(west / step) * step;
        const endLng = Math.ceil(east / step) * step;
        const startLat = Math.floor(south / step) * step;
        const endLat = Math.ceil(north / step) * step;

        // Draw Longitude Lines (Vertical)
        for (let lng = startLng; lng <= endLng; lng += step) {
          const points = [
            L.latLng(south, lng),
            L.latLng(north, lng)
          ];
          L.polyline(points, {
            color: "#3b82f6", // Intense Electric Blue hex
            opacity: 0.65,     // Set opacity explicitly
            weight: 1.4,
            dashArray: "3, 6",
            interactive: false,
            pane: "gridPane",
          }).addTo(gridGroup);

          // Draw a label if enabled
          if (showGridLabels) {
            const latMid = (south + north) / 2;
            const labelText = gridOverlay === "dd" 
              ? `${lng.toFixed(4)}°` 
              : formatCoordinatesByFormat(latMid, lng, "dms").split(", ")[1];

            const labelIcon = L.divIcon({
              className: "grid-label",
              html: `<div class="text-[9px] font-sans font-bold text-blue-600/90 tracking-wider whitespace-nowrap select-none" style="text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff;">${labelText}</div>`,
              iconSize: [60, 18],
              iconAnchor: [30, 9],
            });
            L.marker([latMid, lng], { icon: labelIcon, interactive: false, pane: "gridPane" }).addTo(gridGroup);
          }
        }

        // Draw Latitude Lines (Horizontal)
        for (let lat = startLat; lat <= endLat; lat += step) {
          if (lat < -85 || lat > 85) continue;
          
          const points = [
            L.latLng(lat, west),
            L.latLng(lat, east)
          ];
          L.polyline(points, {
            color: "#3b82f6", // Intense Electric Blue hex
            opacity: 0.65,
            weight: 1.4,
            dashArray: "3, 6",
            interactive: false,
            pane: "gridPane",
          }).addTo(gridGroup);

          // Draw a label if enabled
          if (showGridLabels) {
            const lngMid = (west + east) / 2;
            const labelText = gridOverlay === "dd"
              ? `${lat.toFixed(4)}°`
              : formatCoordinatesByFormat(lat, lngMid, "dms").split(", ")[0];

            const labelIcon = L.divIcon({
              className: "grid-label",
              html: `<div class="text-[9px] font-sans font-bold text-blue-600/90 tracking-wider whitespace-nowrap select-none" style="text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff;">${labelText}</div>`,
              iconSize: [60, 18],
              iconAnchor: [30, 9],
            });
            L.marker([lat, lngMid], { icon: labelIcon, interactive: false, pane: "gridPane" }).addTo(gridGroup);
          }
        }
      } else if (gridOverlay === "utm" || gridOverlay === "mgrs") {
        // Projected Grid: UTM or MGRS based on meters
        const center = mapInstance.getCenter();
        const centerZone = Math.floor((center.lng + 180) / 6) + 1;
        const southernHemisphere = center.lat < 0;

        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        
        const swUtmStr = convertLatLngToUtm(sw.lat, sw.lng);
        
        const parseUtmStr = (utmStr: string) => {
          const match = utmStr.match(/(\d+)[A-Z]\s+(\d+)E\s+(\d+)N/);
          if (match) {
            return {
              zone: parseInt(match[1], 10),
              easting: parseInt(match[2], 10),
              northing: parseInt(match[3], 10),
            };
          }
          return null;
        };

        const swUtm = parseUtmStr(swUtmStr);
        const neUtm = parseUtmStr(convertLatLngToUtm(ne.lat, ne.lng));

        if (swUtm && neUtm) {
          let minEasting = Math.min(swUtm.easting, neUtm.easting);
          let maxEasting = Math.max(swUtm.easting, neUtm.easting);
          let minNorthing = Math.min(swUtm.northing, neUtm.northing);
          let maxNorthing = Math.max(swUtm.northing, neUtm.northing);

          minEasting = Math.floor(minEasting / 100000) * 100000 - 200000;
          maxEasting = Math.ceil(maxEasting / 100000) * 100000 + 200000;
          minNorthing = Math.floor(minNorthing / 100000) * 100000 - 200000;
          maxNorthing = Math.ceil(maxNorthing / 100000) * 100000 + 200000;

          let step = 100000;
          if (zoom >= 17) step = 100;
          else if (zoom >= 15) step = 500;
          else if (zoom >= 13) step = 1000;
          else if (zoom >= 11) step = 5000;
          else if (zoom >= 9) step = 20000;
          else if (zoom >= 7) step = 50000;
          else step = 100000;

          const startE = Math.floor(minEasting / step) * step;
          const endE = Math.ceil(maxEasting / step) * step;
          const startN = Math.floor(minNorthing / step) * step;
          const endN = Math.ceil(maxNorthing / step) * step;

          // Helper to format clean MGRS cell quadrant designation
          const formatMGRSCellLabel = (latVal: number, lngVal: number, stepVal: number): string => {
            const fullMgrs = formatCoordinatesByFormat(latVal, lngVal, "mgrs"); // e.g. "30TXN 28510 79240"
            const parts = fullMgrs.split(" ");
            if (parts.length < 3) return fullMgrs;
            
            const block = parts[0]; // e.g. "30TXN"
            const eastingPart = parts[1]; // e.g. "28510"
            const northingPart = parts[2]; // e.g. "79240"
            
            let numDigits = 0;
            if (stepVal <= 100) numDigits = 4;
            else if (stepVal <= 1000) numDigits = 3;
            else if (stepVal <= 10000) numDigits = 2;
            else if (stepVal <= 50000) numDigits = 1;
            
            const eStr = eastingPart.substring(0, numDigits);
            const nStr = northingPart.substring(0, numDigits);
            
            return `${block}${eStr}${nStr}`;
          };

          // Vertical Lines (Constant Easting)
          for (let easting = startE; easting <= endE; easting += step) {
            const pathLatLngs: L.LatLng[] = [];
            const numSamples = 5;
            for (let i = 0; i <= numSamples; i++) {
              const northingVal = startN + (i / numSamples) * (endN - startN);
              try {
                const [lat, lng] = convertUtmToLatLng(easting, northingVal, centerZone, southernHemisphere);
                if (!isNaN(lat) && !isNaN(lng) && lat >= -85 && lat <= 85 && lng >= -180 && lng <= 180) {
                  pathLatLngs.push(L.latLng(lat, lng));
                }
              } catch (e) {
                // Ignore
              }
            }

            if (pathLatLngs.length >= 2) {
              L.polyline(pathLatLngs, {
                color: "#3b82f6", // Intense Electric Blue hex
                opacity: 0.65,
                weight: 1.4,
                dashArray: "3, 6",
                interactive: false,
                pane: "gridPane",
              }).addTo(gridGroup);
            }
          }

          // Horizontal Lines (Constant Northing)
          for (let northing = startN; northing <= endN; northing += step) {
            const pathLatLngs: L.LatLng[] = [];
            const numSamples = 5;
            for (let i = 0; i <= numSamples; i++) {
              const eastingVal = startE + (i / numSamples) * (endE - startE);
              try {
                const [lat, lng] = convertUtmToLatLng(eastingVal, northing, centerZone, southernHemisphere);
                if (!isNaN(lat) && !isNaN(lng) && lat >= -85 && lat <= 85 && lng >= -180 && lng <= 180) {
                  pathLatLngs.push(L.latLng(lat, lng));
                }
              } catch (e) {
                // Ignore
              }
            }

            if (pathLatLngs.length >= 2) {
              L.polyline(pathLatLngs, {
                color: "#3b82f6", // Intense Electric Blue hex
                opacity: 0.65,
                weight: 1.4,
                dashArray: "3, 6",
                interactive: false,
                pane: "gridPane",
              }).addTo(gridGroup);
            }
          }

          // Center Quadrant/Cell Labels (Inside each Grid Box)
          if (showGridLabels) {
            for (let easting = startE; easting < endE; easting += step) {
              for (let northing = startN; northing < endN; northing += step) {
                const cellCenterE = easting + step / 2;
                const cellCenterN = northing + step / 2;

                try {
                  const [lat, lng] = convertUtmToLatLng(cellCenterE, cellCenterN, centerZone, southernHemisphere);
                  if (!isNaN(lat) && !isNaN(lng) && lat >= -85 && lat <= 85 && lng >= -180 && lng <= 180) {
                    const cellLatLng = L.latLng(lat, lng);
                    if (bounds.contains(cellLatLng)) {
                      let labelText = "";
                      if (gridOverlay === "utm") {
                        labelText = `${Math.round(easting)}E\n${Math.round(northing)}N`;
                      } else {
                        labelText = formatMGRSCellLabel(lat, lng, step);
                      }

                      const labelIcon = L.divIcon({
                        className: "grid-label",
                        html: `<div class="text-[9px] font-sans font-bold text-blue-600/90 tracking-wider whitespace-nowrap select-none text-center" style="text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 3px #fff; line-height: 1.1;">${labelText.replace('\n', '<br/>')}</div>`,
                        iconSize: [80, 24],
                        iconAnchor: [40, 12],
                      });
                      L.marker(cellLatLng, { icon: labelIcon, interactive: false, pane: "gridPane" }).addTo(gridGroup);
                    }
                  }
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
        }
      }
    };

    drawGrid();

    mapInstance.on("moveend", drawGrid);
    mapInstance.on("zoomend", drawGrid);

    return () => {
      mapInstance.off("moveend", drawGrid);
      mapInstance.off("zoomend", drawGrid);
      gridGroup.clearLayers();
    };
  }, [mapInstance, gridOverlay, showGridLabels]);

  // Handle flying to specific coordinates
  useEffect(() => {
    if (!mapInstance || !flyToCoords) return;

    mapInstance.flyTo(flyToCoords, 14, {
      animate: true,
      duration: 1.5,
    });
  }, [mapInstance, flyToCoords]);

  // Centrar y encuadrar el mapa en la ruta activa seleccionada
  useEffect(() => {
    if (!mapInstance || !activeTrackId) return;

    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack || activeTrack.points.length === 0 || !activeTrack.visible) return;

    const latlngs = activeTrack.points.map((p) => L.latLng(p.lat, p.lng));
    const bounds = L.latLngBounds(latlngs);
    mapInstance.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
      animate: true,
      duration: 1.2,
    });
  }, [mapInstance, activeTrackId]);


  return (
    <div className={`relative w-full h-full bg-[#0a0e0c] overflow-hidden ${isDrawing || isSelectingArea || isDrawingArea ? "leaflet-crosshair" : isSplitting ? "leaflet-scissors" : ""}`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Drawing overlay badge */}
      {isDrawing && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[2000] bg-emerald-500/90 border border-emerald-400/30 text-[#0c120f] font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xl backdrop-blur-sm animate-pulse pointer-events-none">
          <Plus className="w-4 h-4 animate-spin-slow" />
          Modo Dibujo Activo: Haz clic en el mapa
        </div>
      )}

      {/* Map Area Drawing overlay badge */}
      {isDrawingArea && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[2000] bg-emerald-500/90 border border-emerald-400/30 text-[#0c120f] font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xl backdrop-blur-sm animate-pulse pointer-events-none">
          <Plus className="w-4 h-4" />
          Modo Área Activo: Clic en el mapa y doble clic (o clic en inicio) para cerrar
        </div>
      )}

      {/* Map Splitting overlay badge */}
      {isSplitting && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[2000] bg-orange-500/90 border border-orange-400/30 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xl backdrop-blur-sm animate-pulse pointer-events-none">
          <Scissors className="w-4 h-4" />
          Modo División Activo: Haz clic en un vértice naranja para cortar
        </div>
      )}

      {/* Floating Bulk Selection Control Widget */}
      {isBulkMode && (
        <div className="absolute top-4 right-4 z-[2000] flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-[#131b17]/90 border border-blue-500/30 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-56 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#1b3d2b]/40 pb-1.5">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                ☑️ Selección en Lote
              </span>
              <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.5 rounded-full border border-blue-500/30">
                {selectedWptIds.length}
              </span>
            </div>
            
            <p className="text-[9.5px] text-slate-400 leading-tight">
              Haz clic en marcas o activa la herramienta para seleccionar un área del mapa.
            </p>

            <button
              type="button"
              onClick={() => setIsSelectingArea((prev) => !prev)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                isSelectingArea
                  ? "bg-blue-500/25 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse"
                  : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 4" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
              {isSelectingArea ? "Arrastra en el mapa..." : "Selección por Área"}
            </button>

            {selectedWptIds.length > 0 && (
              <button
                type="button"
                onClick={() => onSetSelectedWptIds([])}
                className="w-full py-1 text-center text-[10px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-5 left-5 z-[2000] pointer-events-none opacity-30 select-none hidden sm:block">
        <h2 className="text-xl font-black text-emerald-400 tracking-widest font-mono">SUMMIT MAPS</h2>
        <p className="text-[9px] text-slate-500 tracking-wider">TOPOGRAPHIC PLANNING SUITE</p>
      </div>
    </div>
  );
}
