import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BaseLayerId } from "./LayerSelector";
import type { Track, RoutePoint, Waypoint, WaypointGroup } from "../hooks/useRoutePlanner";
import { Plus, Scissors } from "lucide-react";

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
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Ref maps to manage layers dynamically
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const hillshadeLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesRef = useRef<Record<string, L.Polyline>>({});
  const controlMarkersRef = useRef<L.CircleMarker[]>([]);
  const waypointMarkersRef = useRef<Record<string, L.Marker>>({});
  const osmPoiMarkersRef = useRef<Record<string, L.Marker>>({});
  const hoverIndicatorRef = useRef<L.CircleMarker | null>(null);

  // Box Area Selection states and refs
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const activeRectRef = useRef<L.Rectangle | null>(null);
  const startLatLngRef = useRef<L.LatLng | null>(null);

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
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);
    const newBaseLayer = L.tileLayer(TILE_LAYERS[activeBaseLayer], { maxZoom: 19, zIndex: 1 }).addTo(map);
    tileLayerRef.current = newBaseLayer;
  }, [activeBaseLayer]);

  // Update Hillshade Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hillshadeLayerRef.current) return;

    if (showContours) {
      hillshadeLayerRef.current.setOpacity(overlayOpacity);
      if (!map.hasLayer(hillshadeLayerRef.current)) {
        hillshadeLayerRef.current.addTo(map);
      }
    } else {
      hillshadeLayerRef.current.setOpacity(0);
      if (map.hasLayer(hillshadeLayerRef.current)) {
        map.removeLayer(hillshadeLayerRef.current);
      }
    }
  }, [showContours, overlayOpacity]);

  // Handle map drawing clicks & right clicks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (isDrawing) {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      }
    };

    const onMapRightClick = (e: L.LeafletMouseEvent) => {
      onRightClickMap(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", onMapClick);
    map.on("contextmenu", onMapRightClick);

    return () => {
      map.off("click", onMapClick);
      map.off("contextmenu", onMapRightClick);
    };
  }, [isDrawing, onAddPoint, onRightClickMap]);

  // Render Polylines for ALL visible tracks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentTrackIds = new Set(tracks.filter((t) => t.visible).map((t) => t.id));

    // 1. Clean up polylines for tracks that are no longer visible or deleted
    Object.keys(polylinesRef.current).forEach((id) => {
      if (!currentTrackIds.has(id)) {
        map.removeLayer(polylinesRef.current[id]);
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
      if (existingPoly) {
        existingPoly.setLatLngs(latlngs);
        existingPoly.setStyle(polylineOpts);
      } else {
        const polyline = L.polyline(latlngs, polylineOpts).addTo(map);
        polylinesRef.current[track.id] = polyline;
      }
    });
  }, [tracks, activeTrackId, isDrawing]);

  // Render Active Track Control Points & Splitting Vertices
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old control markers
    controlMarkersRef.current.forEach((marker) => map.removeLayer(marker));
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
        
        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius: isSplitMode ? 7 : isFirst || isLast ? 6 : 4,
          fillColor: colorVal,
          fillOpacity: 1,
          color: isSplitMode ? "#ffffff" : "#ffffff",
          weight: isSplitMode ? 2.5 : 1.5,
          className: isSplitMode ? "animate-pulse cursor-scissors" : "cursor-pointer",
        }).addTo(map);

        // Tooltip for split vertices
        if (isSplitMode) {
          marker.bindTooltip(`
            <div class="px-2 py-1 text-slate-100 text-[10px] bg-orange-600 border border-white/20 rounded-md font-bold shadow-md">
              ✂️ Hacer clic para Dividir aquí
            </div>
          `, { direction: "top", offset: [0, -6] });

          marker.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            if (window.confirm(`¿Seguro que deseas dividir la ruta "${activeTrack.name}" en este punto?`)) {
              onSplitTrackAt(activeTrack.id, idx);
            }
          });
        }

        controlMarkersRef.current.push(marker);
      }
    });

  }, [tracks, activeTrackId, isSplitting, onSplitTrackAt]);

  // Sync Waypoints with selection indicators and customized click behavior
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentWptIds = new Set(waypoints.map((w) => w.id));

    // 1. Remove hidden/deleted waypoint markers
    Object.keys(waypointMarkersRef.current).forEach((id) => {
      if (!currentWptIds.has(id)) {
        map.removeLayer(waypointMarkersRef.current[id]);
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
          onEditWaypoint(wpt);
        }
      };

      if (existingMarker) {
        existingMarker.setLatLng([wpt.lat, wpt.lng]);
        existingMarker.setIcon(customIcon);
        existingMarker.off("click");
        existingMarker.on("click", handleClick);
        existingMarker.setTooltipContent(`
          <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17] border border-[#1b3d2b] rounded-lg shadow-md">
            ${wpt.name} ${isBulkMode && isSelected ? "☑️" : ""}
          </div>
        `);
      } else {
        const marker = L.marker([wpt.lat, wpt.lng], { icon: customIcon })
          .addTo(map)
          .bindTooltip(`
            <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17]/95 border border-[#1b3d2b] rounded-lg shadow-xl">
              ${wpt.name}
            </div>
          `, { direction: "top", offset: [0, -32], opacity: 0.9 })
          .on("click", handleClick);
        
        waypointMarkersRef.current[wpt.id] = marker;
      }
    });

  }, [waypoints, onEditWaypoint, isBulkMode, selectedWptIds, onSetSelectedWptIds]);

  // Leaflet mouse event-based click-and-drag Box Selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isSelectingArea) {
      map.dragging.enable();
      if (activeRectRef.current) {
        map.removeLayer(activeRectRef.current);
        activeRectRef.current = null;
      }
      startLatLngRef.current = null;
      return;
    }

    map.dragging.disable();

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.button !== 0) return; // Only left click
      startLatLngRef.current = e.latlng;
      if (activeRectRef.current) {
        map.removeLayer(activeRectRef.current);
      }
      activeRectRef.current = L.rectangle([[e.latlng.lat, e.latlng.lng], [e.latlng.lat, e.latlng.lng]], {
        color: "#3b82f6",
        weight: 1.5,
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        dashArray: "4, 4",
      }).addTo(map);
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

      if (activeRectRef.current) {
        map.removeLayer(activeRectRef.current);
        activeRectRef.current = null;
      }
      startLatLngRef.current = null;
      setIsSelectingArea(false);
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.dragging.enable();
      if (activeRectRef.current) {
        map.removeLayer(activeRectRef.current);
        activeRectRef.current = null;
      }
    };
  }, [isSelectingArea, waypoints, onSetSelectedWptIds]);

  // Sync Temporary OSM POIs on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentOsmPoiIds = new Set(osmPois.map((p) => p.id));

    // 1. Remove old OSM POI markers that are no longer active
    Object.keys(osmPoiMarkersRef.current).forEach((id) => {
      if (!currentOsmPoiIds.has(id)) {
        map.removeLayer(osmPoiMarkersRef.current[id]);
        delete osmPoiMarkersRef.current[id];
      }
    });

    // 2. Render active OSM POI markers with a distinctive translucid look and click-to-import action
    osmPois.forEach((poi) => {
      const svg = WPT_SVG_PATHS[poi.icon] || WPT_SVG_PATHS.mountain;
      
      const customHtml = `
        <div class="relative w-8 h-8 flex items-center justify-center animate-pulse cursor-pointer">
          <div class="absolute w-8 h-8 rounded-full border border-dashed border-white bg-amber-500/60 hover:bg-amber-500/90 shadow-lg flex items-center justify-center transition-all scale-90 hover:scale-100">
            ${svg}
          </div>
          <div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm font-sans">+</div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "custom-osm-poi-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const existingMarker = osmPoiMarkersRef.current[poi.id];
      if (existingMarker) {
        existingMarker.setLatLng([poi.lat, poi.lng]);
        existingMarker.setIcon(customIcon);
      } else {
        const marker = L.marker([poi.lat, poi.lng], { icon: customIcon })
          .addTo(map)
          .bindTooltip(`
            <div class="px-2 py-1 text-slate-100 text-xs font-semibold bg-amber-950/90 border border-amber-600/40 rounded-lg shadow-xl">
              🗺️ ${poi.name} ${poi.elevation ? `(${poi.elevation}m)` : ""}
              <p class="text-[9px] text-slate-300 font-bold mt-0.5">Clic para Importar</p>
            </div>
          `, { direction: "top", offset: [0, -16], opacity: 0.9 })
          .on("click", () => {
            onAddOsmPoi(poi);
          });

        osmPoiMarkersRef.current[poi.id] = marker;
      }
    });

  }, [osmPois, onAddOsmPoi]);

  // Sync Hover Marker (Synchronized Elevation Chart Hover Indicator)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hoverIndicatorRef.current) {
      map.removeLayer(hoverIndicatorRef.current);
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
      }).addTo(map);

      indicator.bindTooltip(`
        <div class="px-2 py-1 text-slate-100 text-[10px] font-bold bg-[#131b17] border border-orange-500/30 rounded-lg shadow-md">
          Alt: ${Math.round(hoverPoint.elevation)}m | Dist: ${hoverPoint.distance.toFixed(2)}km
        </div>
      `, { permanent: true, direction: "top", offset: [0, -10] }).openTooltip();

      hoverIndicatorRef.current = indicator;
    }
  }, [hoverPoint]);

  // Handle flying to specific coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToCoords) return;

    map.flyTo(flyToCoords, 14, {
      animate: true,
      duration: 1.5,
    });
  }, [flyToCoords]);

  return (
    <div className={`relative w-full h-full bg-[#0a0e0c] overflow-hidden ${isDrawing || isSelectingArea ? "leaflet-crosshair" : isSplitting ? "leaflet-scissors" : ""}`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Drawing overlay badge */}
      {isDrawing && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[2000] bg-emerald-500/90 border border-emerald-400/30 text-[#0c120f] font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xl backdrop-blur-sm animate-pulse pointer-events-none">
          <Plus className="w-4 h-4 animate-spin-slow" />
          Modo Dibujo Activo: Haz clic en el mapa
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
