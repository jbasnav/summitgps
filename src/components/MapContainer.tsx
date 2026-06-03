import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BaseLayerId, CustomLayer } from "./LayerSelector";
import type { Track, RoutePoint, Waypoint, WaypointGroup, Area } from "../hooks/useRoutePlanner";
import { Plus, Scissors } from "lucide-react";
import { useCustomDialog } from "./CustomDialog";
import { getIconSvg } from "../utils/iconLibrary";
import { 
  formatCoordinatesByFormat, 
  convertLatLngToUtm, 
  convertUtmToLatLng, 
  formatArea, 
  calculatePolygonPerimeter,
  calculateSlope,
  getColorForSlope,
  getColorForElevation,
  getColorForHeartRate,
  getColorForCadence,
  getColorForPower,
  getColorForSpeed
} from "../utils/geoUtils";

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
  isCleaningArea: boolean;
  onSetCleanBounds: (bounds: { north: number; south: number; east: number; west: number } | null) => void;

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
  isRouteEditPanelOpen?: boolean;
  isEditingRoute: boolean;
  onUpdateRoutePoint: (trackId: string, index: number, lat: number, lng: number) => void;
  onInsertIntermediatePoint: (trackId: string, lat: number, lng: number) => void;

  // Dynamic statistics & selection props
  trackColorMode: "solid" | "slope" | "elevation" | "heartRate" | "cadence" | "power" | "speed";
  selectedRange: [number, number] | null;
  selectedSplitNumber?: number | null;
  isStreetViewActive: boolean;
  streetViewCoords: { lat: number; lng: number } | null;
  onStreetViewCoordsChange: (lat: number, lng: number) => void;
  customLayers?: CustomLayer[];
  showSlopeShading?: boolean;
  slopeShadingOpacity?: number;
  onToggleUnits?: () => void;
  coordinateFormat?: "dd" | "ddm" | "dms" | "utm" | "mgrs";
  highlightedWptId?: string | null;
}

// Map Tile Providers
const TILE_LAYERS: Record<string, string> = {
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  opentopo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  cyclosm: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
  wanderreitkarte: "https://www.wanderreitkarte.de/topo/{z}/{x}/{y}.png",
  "tf-outdoors": "https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={tf_key}",
  "tf-transport": "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey={tf_key}",
  "tf-cycle": "https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={tf_key}",
};

function resolveTileUrl(id: string): string {
  const url = TILE_LAYERS[id] || TILE_LAYERS.osm;
  const tfKey = localStorage.getItem('summit_thunderforest_key') || '';
  return url.replace('{tf_key}', tfKey);
}

const HILLSHADE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}";



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
  isCleaningArea,
  onSetCleanBounds,
  isDrawingArea,
  areas,
  onAreaComplete,
  useImperial,
  onMapReady,
  onUpdateWaypoint,
  isRouteEditPanelOpen = false,
  isEditingRoute,
  onUpdateRoutePoint,
  onInsertIntermediatePoint,
  trackColorMode,
  selectedRange,
  selectedSplitNumber,
  isStreetViewActive,
  streetViewCoords,
  onStreetViewCoordsChange,
  customLayers = [],
  showSlopeShading = false,
  slopeShadingOpacity = 0.6,
  onToggleUnits,
  coordinateFormat = "dd",
  highlightedWptId = null,
}: MapContainerProps) {
  const { customConfirm } = useCustomDialog();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  
  // Ref maps to manage layers dynamically
  const tileLayerRef = useRef<L.TileLayer | L.TileLayer.WMS | null>(null);
  const hillshadeLayerRef = useRef<L.TileLayer | null>(null);
  const slopeShadingLayerRef = useRef<L.TileLayer.WMS | null>(null);
  const customLayersRef = useRef<Record<string, L.TileLayer | L.TileLayer.WMS>>({});
  const polylinesRef = useRef<Record<string, L.Layer>>({});
  const highlightPolyRef = useRef<L.Polyline | null>(null);
  const splitHighlightRef = useRef<L.Polyline | null>(null);
  const controlMarkersRef = useRef<L.CircleMarker[]>([]);
  const waypointMarkersRef = useRef<Record<string, L.Marker>>({});
  const osmPoiMarkersRef = useRef<Record<string, L.Marker>>({});
  const hoverIndicatorRef = useRef<L.CircleMarker | null>(null);
  const markedLocationMarkerRef = useRef<L.Marker | null>(null);
  const pegmanMarkerRef = useRef<L.Marker | null>(null);
  const gridGroupRef = useRef<L.LayerGroup | null>(null);

  // Box Area Selection refs (isSelectingArea state is now a prop)
  const activeRectRef = useRef<L.Rectangle | null>(null);
  const startLatLngRef = useRef<L.LatLng | null>(null);

  // Box Cleaning Area refs
  const cleanRectRef = useRef<L.Rectangle | null>(null);
  const cleanStartLatLngRef = useRef<L.LatLng | null>(null);

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
    if (activeBaseLayer !== "none") {
      const customBase = customLayers.find(l => l.isBase && l.id === activeBaseLayer);
      let baseLayer: L.TileLayer | L.TileLayer.WMS;
      if (customBase) {
        if (customBase.type === "wms") {
          baseLayer = L.tileLayer.wms(customBase.url, {
            layers: customBase.wmsLayers || "",
            format: "image/png",
            transparent: true,
            maxZoom: 19,
            zIndex: 1,
            attribution: customBase.attribution,
          });
        } else {
          baseLayer = L.tileLayer(customBase.url, { maxZoom: 19, zIndex: 1, attribution: customBase.attribution });
        }
      } else {
        const url = resolveTileUrl(activeBaseLayer);
        baseLayer = L.tileLayer(url, { maxZoom: 19, zIndex: 1 });
      }
      baseLayer.addTo(map);
      tileLayerRef.current = baseLayer;
    }

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

  // Update Base Layer (supporting custom base layers)
  useEffect(() => {
    if (!mapInstance) return; // tileLayerRef.current may be null when coming from "none" — that's fine

    if (tileLayerRef.current) {
      mapInstance.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (activeBaseLayer !== "none") {
      const customBase = customLayers.find(l => l.isBase && l.id === activeBaseLayer);
      let newBaseLayer: L.TileLayer | L.TileLayer.WMS;
      if (customBase) {
        if (customBase.type === "wms") {
          newBaseLayer = L.tileLayer.wms(customBase.url, {
            layers: customBase.wmsLayers || "",
            format: "image/png",
            transparent: true,
            maxZoom: 19,
            zIndex: 1,
            attribution: customBase.attribution,
          });
        } else {
          newBaseLayer = L.tileLayer(customBase.url, { maxZoom: 19, zIndex: 1, attribution: customBase.attribution });
        }
      } else {
        const url = resolveTileUrl(activeBaseLayer);
        newBaseLayer = L.tileLayer(url, { maxZoom: 19, zIndex: 1 });
      }
      newBaseLayer.addTo(mapInstance);
      tileLayerRef.current = newBaseLayer;
    }
  }, [mapInstance, activeBaseLayer, customLayers]);

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

  // Update Custom Overlays
  useEffect(() => {
    if (!mapInstance) return;

    const currentOverlays = customLayers.filter(l => !l.isBase);
    const currentOverlayIds = new Set(currentOverlays.filter(l => l.visible).map(l => l.id));

    // Remove overlays that are no longer visible or deleted
    Object.keys(customLayersRef.current).forEach((id) => {
      if (!currentOverlayIds.has(id)) {
        mapInstance.removeLayer(customLayersRef.current[id]);
        delete customLayersRef.current[id];
      }
    });

    // Add or update visible overlays
    currentOverlays.forEach((layer) => {
      if (!layer.visible) return;

      let mapLayer = customLayersRef.current[layer.id];
      if (mapLayer) {
        // Update opacity
        mapLayer.setOpacity(layer.opacity);
      } else {
        // Create new overlay layer
        if (layer.type === "wms") {
          mapLayer = L.tileLayer.wms(layer.url, {
            layers: layer.wmsLayers || "",
            format: "image/png",
            transparent: true,
            maxZoom: 19,
            zIndex: 6,
            opacity: layer.opacity,
            attribution: layer.attribution,
          });
        } else {
          mapLayer = L.tileLayer(layer.url, {
            maxZoom: 19,
            zIndex: 6,
            opacity: layer.opacity,
            attribution: layer.attribution,
          });
        }
        mapLayer.addTo(mapInstance);
        customLayersRef.current[layer.id] = mapLayer;
      }
    });
  }, [mapInstance, customLayers]);

  // Update Slope Angle Shading (IGN España WMS)
  useEffect(() => {
    if (!mapInstance) return;

    if (showSlopeShading) {
      if (slopeShadingLayerRef.current) {
        slopeShadingLayerRef.current.setOpacity(slopeShadingOpacity);
        if (!mapInstance.hasLayer(slopeShadingLayerRef.current)) {
          slopeShadingLayerRef.current.addTo(mapInstance);
        }
      } else {
        const slopeLayer = L.tileLayer.wms("https://wms-pendientes.idee.es/pendientes", {
          layers: "pendientes",
          format: "image/png",
          transparent: true,
          maxZoom: 19,
          zIndex: 8,
          opacity: slopeShadingOpacity,
          attribution: 'Modelo de Pendientes MDP05 &copy; Instituto Geográfico Nacional de España',
        });
        slopeLayer.addTo(mapInstance);
        slopeShadingLayerRef.current = slopeLayer;
      }
    } else {
      if (slopeShadingLayerRef.current) {
        slopeShadingLayerRef.current.setOpacity(0);
        if (mapInstance.hasLayer(slopeShadingLayerRef.current)) {
          mapInstance.removeLayer(slopeShadingLayerRef.current);
        }
      }
    }
  }, [mapInstance, showSlopeShading, slopeShadingOpacity]);

  // Handle map drawing clicks & right clicks
  useEffect(() => {
    if (!mapInstance) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (isStreetViewActive) {
        onStreetViewCoordsChange(e.latlng.lat, e.latlng.lng);
      } else if (isDrawing) {
        mapInstance.getContainer().style.cursor = "crosshair";
        onAddPoint(e.latlng.lat, e.latlng.lng);
      } else if (!isSplitting && !isSelectingArea && !isCleaningArea && !isBulkMode && !isDrawingArea && !isEditingRoute) {
        mapInstance.getContainer().style.cursor = "crosshair";
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
  }, [mapInstance, isDrawing, isSplitting, isSelectingArea, isCleaningArea, isBulkMode, isDrawingArea, isEditingRoute, onAddPoint, onSetMarkedLocation, onRightClickMap, isStreetViewActive, onStreetViewCoordsChange]);

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

      const handlePolylineClick = (e: L.LeafletMouseEvent) => {
        if (isEditingRoute && isActive) {
          L.DomEvent.stopPropagation(e);
          onInsertIntermediatePoint(track.id, e.latlng.lat, e.latlng.lng);
        }
      };

      const existingPoly = polylinesRef.current[track.id];

      // Always clean up existing polyline/group before recreating to prevent overlaps and mode mixing
      if (existingPoly) {
        mapInstance.removeLayer(existingPoly);
        delete polylinesRef.current[track.id];
      }

      const isBiometricMode = trackColorMode === "heartRate" || trackColorMode === "cadence" || trackColorMode === "power" || trackColorMode === "speed";
      const isDynamicMode = isActive && (trackColorMode === "slope" || trackColorMode === "elevation" || isBiometricMode) && track.points.length > 1;

      if (isDynamicMode) {
        let minElev = Infinity;
        let maxElev = -Infinity;
        if (trackColorMode === "elevation") {
          track.points.forEach((p) => {
            if (p.elevation < minElev) minElev = p.elevation;
            if (p.elevation > maxElev) maxElev = p.elevation;
          });
          if (minElev === Infinity) { minElev = 0; maxElev = 1; }
        }

        const group = L.featureGroup().addTo(mapInstance);
        
        for (let i = 1; i < track.points.length; i++) {
          const p1 = track.points[i - 1];
          const p2 = track.points[i];
          
          let segmentColor = track.color;
          if (trackColorMode === "slope") {
            const slope = calculateSlope(p1, p2);
            segmentColor = getColorForSlope(slope);
          } else if (trackColorMode === "elevation") {
            const avgElev = (p1.elevation + p2.elevation) / 2;
            segmentColor = getColorForElevation(avgElev, minElev, maxElev);
          } else if (trackColorMode === "heartRate" && p1.heartRate !== undefined) {
            segmentColor = getColorForHeartRate(p1.heartRate);
          } else if (trackColorMode === "cadence" && p1.cadence !== undefined) {
            segmentColor = getColorForCadence(p1.cadence);
          } else if (trackColorMode === "power" && p1.power !== undefined) {
            segmentColor = getColorForPower(p1.power);
          } else if (trackColorMode === "speed" && p1.speed !== undefined) {
            segmentColor = getColorForSpeed(p1.speed);
          }

          const segmentOpts = {
            color: segmentColor,
            weight: isActive ? 5 : 3.5,
            opacity: isActive ? 0.95 : 0.7,
            lineCap: "round" as const,
            lineJoin: "round" as const,
            dashArray: isActive && isDrawing ? "6, 6" : undefined,
          };

          L.polyline([L.latLng(p1.lat, p1.lng), L.latLng(p2.lat, p2.lng)], segmentOpts).addTo(group);
        }

        group.on("click", handlePolylineClick);
        polylinesRef.current[track.id] = group;
      } else {
        const polyline = L.polyline(latlngs, polylineOpts)
          .addTo(mapInstance)
          .on("click", handlePolylineClick);
        polylinesRef.current[track.id] = polyline;
      }
    });
  }, [mapInstance, tracks, activeTrackId, isDrawing, isEditingRoute, onInsertIntermediatePoint, trackColorMode]);

  // Render Brushing Selection Highlight and handle auto-zoom
  useEffect(() => {
    if (!mapInstance) return;

    if (highlightPolyRef.current) {
      mapInstance.removeLayer(highlightPolyRef.current);
      highlightPolyRef.current = null;
    }

    if (selectedRange === null || !activeTrackId) return;

    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack || activeTrack.points.length === 0 || !activeTrack.visible) return;

    const [startIdx, endIdx] = selectedRange;
    const selectedPoints = activeTrack.points.slice(startIdx, endIdx + 1);
    if (selectedPoints.length < 2) return;

    const latlngs = selectedPoints.map((p) => L.latLng(p.lat, p.lng));

    const highlightPoly = L.polyline(latlngs, {
      color: "#06b6d4", // Beautiful glowing cyan
      weight: 8,
      opacity: 0.85,
      lineCap: "round" as const,
      lineJoin: "round" as const,
      className: "animate-pulse",
    }).addTo(mapInstance);

    highlightPolyRef.current = highlightPoly;

    // Auto-zoom to selected segment
    try {
      const bounds = L.latLngBounds(latlngs);
      mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } catch (e) {
      console.error("Failed to fit bounds for selected range:", e);
    }

    return () => {
      if (highlightPolyRef.current && mapInstance) {
        mapInstance.removeLayer(highlightPolyRef.current);
        highlightPolyRef.current = null;
      }
    };
  }, [mapInstance, selectedRange, activeTrackId, tracks]);

  // Render Split Highlight (km/mile segment selected in SplitsTable)
  useEffect(() => {
    if (!mapInstance) return;

    // Remove existing split highlight
    if (splitHighlightRef.current) {
      mapInstance.removeLayer(splitHighlightRef.current);
      splitHighlightRef.current = null;
    }

    if (selectedSplitNumber == null || !activeTrackId) return;

    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack || activeTrack.points.length < 2) return;

    // Each split is 1 unit (km or mile). Convert back to km for comparison.
    const unitFactor = useImperial ? 0.621371 : 1.0;
    const startDistKm = (selectedSplitNumber - 1) / unitFactor;
    const endDistKm = selectedSplitNumber / unitFactor;

    // Filter points that belong to this split segment
    const segmentPoints = activeTrack.points.filter(
      (p) => p.distance >= startDistKm - 0.001 && p.distance <= endDistKm + 0.001
    );

    if (segmentPoints.length < 2) return;

    const latlngs = segmentPoints.map((p) => L.latLng(p.lat, p.lng));

    splitHighlightRef.current = L.polyline(latlngs, {
      color: "#f59e0b",
      weight: 7,
      opacity: 0.9,
      lineCap: "round" as const,
      lineJoin: "round" as const,
    }).addTo(mapInstance);

    splitHighlightRef.current.bringToFront();

    // Fly to the segment
    try {
      const bounds = L.latLngBounds(latlngs);
      mapInstance.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } catch {
      // ignore
    }

    return () => {
      if (splitHighlightRef.current && mapInstance) {
        mapInstance.removeLayer(splitHighlightRef.current);
        splitHighlightRef.current = null;
      }
    };
  }, [mapInstance, selectedSplitNumber, activeTrackId, tracks, useImperial]);

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
      const isHighlighted = highlightedWptId === wpt.id;
      const svg = getIconSvg(wpt.icon, "w-4 h-4 text-white");
      const markerColor = wpt.color || "#10b981";

      const customHtml = `
        <div class="relative flex items-center justify-center animate-bounce-short" style="width:${isHighlighted ? 40 : 32}px;height:${isHighlighted ? 40 : 32}px">
          ${
            isBulkMode && isSelected
              ? `<div class="absolute w-10 h-10 rounded-full border border-blue-400 bg-blue-500/25 animate-ping opacity-75"></div>
                 <div class="absolute w-9 h-9 rounded-full border-2 border-blue-400 bg-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>`
              : isHighlighted
              ? `<div class="absolute rounded-full animate-ping opacity-60" style="width:48px;height:48px;background:${markerColor}33;border:2px solid ${markerColor}"></div>
                 <div class="absolute rounded-full" style="width:44px;height:44px;box-shadow:0 0 16px 4px ${markerColor}99;border:2px solid ${markerColor};background:${markerColor}22"></div>`
              : ""
          }
          <div class="absolute rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all duration-300" style="width:${isHighlighted ? 36 : 32}px;height:${isHighlighted ? 36 : 32}px;background-color:${
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

      const elevStr = wpt.elevation !== undefined
        ? useImperial
          ? ` · 🏔️ ${Math.round(wpt.elevation * 3.28084)} ft`
          : ` · 🏔️ ${wpt.elevation} m`
        : "";

      if (existingMarker) {
        existingMarker.setLatLng([wpt.lat, wpt.lng]);
        existingMarker.setIcon(customIcon);
        existingMarker.off("click");
        existingMarker.on("click", handleClick);

        // Update draggable status dynamically — only allow drag in editing mode
        if (isEditingRoute && !isBulkMode) {
          existingMarker.dragging?.enable();
        } else {
          existingMarker.dragging?.disable();
        }

        // Re-attach dragend listener to prevent duplication
        existingMarker.off("dragend");
        if (isEditingRoute && !isBulkMode) {
          existingMarker.on("dragend", async (e: any) => {
            const newLatLng = e.target.getLatLng();
            const confirmed = await customConfirm(`¿Mover "${wpt.name}" a la nueva posición?`);
            if (confirmed) {
              onUpdateWaypoint(wpt.id, {
                lat: newLatLng.lat,
                lng: newLatLng.lng,
              });
            } else {
              // Revert marker to original position
              e.target.setLatLng([wpt.lat, wpt.lng]);
            }
          });
        }

        existingMarker.setTooltipContent(`
          <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17] border border-[#1b3d2b] rounded-lg shadow-md">
            ${wpt.name}${elevStr} ${isBulkMode && isSelected ? "☑️" : ""}
          </div>
        `);
      } else {
        const marker = L.marker([wpt.lat, wpt.lng], { 
          icon: customIcon,
          draggable: isEditingRoute && !isBulkMode
        })
          .addTo(mapInstance)
          .bindTooltip(`
            <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17]/95 border border-[#1b3d2b] rounded-lg shadow-xl">
              ${wpt.name}${elevStr}
            </div>
          `, { direction: "top", offset: [0, -32], opacity: 0.9 })
          .on("click", handleClick);

        if (isEditingRoute && !isBulkMode) {
          marker.on("dragend", async (e: any) => {
            const newLatLng = e.target.getLatLng();
            const confirmed = await customConfirm(`¿Mover "${wpt.name}" a la nueva posición?`);
            if (confirmed) {
              onUpdateWaypoint(wpt.id, {
                lat: newLatLng.lat,
                lng: newLatLng.lng,
              });
            } else {
              // Revert marker to original position
              e.target.setLatLng([wpt.lat, wpt.lng]);
            }
          });
        }
        
        waypointMarkersRef.current[wpt.id] = marker;
      }
    });

  }, [mapInstance, waypoints, onEditWaypoint, isBulkMode, selectedWptIds, onSetSelectedWptIds, onUpdateWaypoint, highlightedWptId, isEditingRoute]);

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

  // Box Cleaning Area selection
  useEffect(() => {
    if (!mapInstance) return;

    if (!isCleaningArea) {
      if (cleanRectRef.current) {
        mapInstance.removeLayer(cleanRectRef.current);
        cleanRectRef.current = null;
      }
      cleanStartLatLngRef.current = null;
      return;
    }

    mapInstance.dragging.disable();

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.button !== 0) return; // Only left click
      cleanStartLatLngRef.current = e.latlng;
      if (cleanRectRef.current) {
        mapInstance.removeLayer(cleanRectRef.current);
      }
      cleanRectRef.current = L.rectangle([[e.latlng.lat, e.latlng.lng], [e.latlng.lat, e.latlng.lng]], {
        color: "#ef4444",
        weight: 1.5,
        fillColor: "#ef4444",
        fillOpacity: 0.15,
        dashArray: "4, 4",
      }).addTo(mapInstance);
      L.DomEvent.stopPropagation(e.originalEvent);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!cleanStartLatLngRef.current || !cleanRectRef.current) return;
      cleanRectRef.current.setBounds(L.latLngBounds(cleanStartLatLngRef.current, e.latlng));
    };

    const onMouseUp = () => {
      if (!cleanStartLatLngRef.current || !cleanRectRef.current) return;

      const bounds = cleanRectRef.current.getBounds();
      onSetCleanBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
      
      // Leave the rectangle on map until user chooses action
      cleanStartLatLngRef.current = null;
    };

    mapInstance.on("mousedown", onMouseDown);
    mapInstance.on("mousemove", onMouseMove);
    mapInstance.on("mouseup", onMouseUp);

    return () => {
      mapInstance.off("mousedown", onMouseDown);
      mapInstance.off("mousemove", onMouseMove);
      mapInstance.off("mouseup", onMouseUp);
      mapInstance.dragging.enable();
    };
  }, [mapInstance, isCleaningArea, onSetCleanBounds]);

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
      const svg = getIconSvg(poi.icon, "w-4 h-4 text-white");
      
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

  // Sync Pegman Marker for Street View
  useEffect(() => {
    if (!mapInstance) return;

    if (pegmanMarkerRef.current) {
      mapInstance.removeLayer(pegmanMarkerRef.current);
      pegmanMarkerRef.current = null;
    }

    if (isStreetViewActive && streetViewCoords) {
      const pegmanHtml = `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-emerald-500/25 border border-emerald-500/40 animate-ping pointer-events-none"></div>
          <div class="absolute w-6 h-6 rounded-full bg-yellow-400 border border-black/40 shadow-lg flex items-center justify-center z-10 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-grab">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-[#0c120f] fill-[#0c120f]" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="4" r="2"/>
              <path d="M12 6c-1.1 0-2 .9-2 2v5h1v7h2v-7h1V8c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
        </div>
      `;

      const pegmanIcon = L.divIcon({
        html: pegmanHtml,
        className: "pegman-marker-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([streetViewCoords.lat, streetViewCoords.lng], {
        icon: pegmanIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(mapInstance);

      marker.on("dragend", (event: any) => {
        const newLatLng = event.target.getLatLng();
        onStreetViewCoordsChange(newLatLng.lat, newLatLng.lng);
      });

      pegmanMarkerRef.current = marker;
    }

    return () => {
      if (pegmanMarkerRef.current && mapInstance) {
        mapInstance.removeLayer(pegmanMarkerRef.current);
        pegmanMarkerRef.current = null;
      }
    };
  }, [mapInstance, isStreetViewActive, streetViewCoords, onStreetViewCoordsChange]);

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

    // Add extra padding to the left when the Route Edit panel is open (380px wide + 50px normal padding = 430px)
    const leftPadding = isRouteEditPanelOpen ? 430 : 50;

    mapInstance.fitBounds(bounds, {
      paddingTopLeft: [leftPadding, 50],
      paddingBottomRight: [50, 50],
      maxZoom: 16,
      animate: true,
      duration: 1.2,
    });
  }, [mapInstance, activeTrackId, isRouteEditPanelOpen]);


  return (
    <div className={`relative w-full h-full bg-[#0a0e0c] overflow-hidden ${isDrawing || isSelectingArea || isCleaningArea || isDrawingArea ? "leaflet-crosshair" : isSplitting ? "leaflet-scissors" : ""}`}>
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

      {/* Map Info Bar — bottom center: units toggle + coordinate system */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-0 rounded-lg overflow-hidden shadow-lg border border-[#1b3d2b]/60 select-none pointer-events-auto">
        <button
          type="button"
          onClick={onToggleUnits}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c120f]/85 hover:bg-emerald-500/10 text-[10px] font-bold text-slate-300 hover:text-emerald-400 transition-colors border-r border-[#1b3d2b]/60 backdrop-blur-sm cursor-pointer"
          title="Cambiar unidades"
        >
          {useImperial ? "mi / ft" : "km / m"}
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c120f]/85 text-[10px] font-semibold text-slate-400 backdrop-blur-sm border-r border-[#1b3d2b]/60">
          {coordinateFormat === "utm"
            ? "UTM · WGS 84"
            : coordinateFormat === "mgrs"
            ? "MGRS · WGS 84"
            : coordinateFormat === "dms"
            ? "DMS · WGS 84"
            : coordinateFormat === "ddm"
            ? "DDM · WGS 84"
            : "WGS 84 · EPSG:4326"}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c120f]/85 text-[10px] font-semibold text-slate-500 backdrop-blur-sm">
          {activeBaseLayer === "none"
            ? "Sin mapa base"
            : activeBaseLayer === "osm"
            ? "OpenStreetMap"
            : activeBaseLayer === "opentopo"
            ? "OpenTopoMap"
            : activeBaseLayer === "satellite"
            ? "Satélite · Esri"
            : activeBaseLayer === "terrain"
            ? "Esri World Topo"
            : activeBaseLayer === "cyclosm"
            ? "CyclOSM"
            : activeBaseLayer === "wanderreitkarte"
            ? "WanderReitkarte"
            : activeBaseLayer === "tf-outdoors"
            ? "TF Outdoors"
            : activeBaseLayer === "tf-transport"
            ? "TF Transport"
            : activeBaseLayer === "tf-cycle"
            ? "TF Cycle"
            : activeBaseLayer}
        </div>
      </div>
    </div>
  );
}
