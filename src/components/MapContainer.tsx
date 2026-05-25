import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BaseLayerId } from "./LayerSelector";
import { Plus } from "lucide-react";

interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
}

interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  note: string;
  color: string;
}

interface MapContainerProps {
  points: RoutePoint[];
  waypoints: Waypoint[];
  isDrawing: boolean;
  activeBaseLayer: BaseLayerId;
  overlayOpacity: number;
  showContours: boolean;
  hoverPoint: RoutePoint | null;
  flyToCoords: [number, number] | null;
  onAddPoint: (lat: number, lng: number) => void;
  onRightClickMap: (lat: number, lng: number) => void;
  onEditWaypoint: (wpt: Waypoint) => void;
}

// Map Tile Providers
const TILE_LAYERS = {
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  opentopo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
};

// Overlay: Esri World Hillshade (highly detailed shading of slopes)
const HILLSHADE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}";

// Icons SVGs for Waypoints (renders inside divIcon)
const WPT_SVG_PATHS: Record<string, string> = {
  mountain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`,
  camp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M19 22H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/><path d="m12 7-6 6h12l-6-6z"/></svg>`,
  camera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  danger: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  water: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>`,
};

export function MapContainer({
  points,
  waypoints,
  isDrawing,
  activeBaseLayer,
  overlayOpacity,
  showContours,
  hoverPoint,
  flyToCoords,
  onAddPoint,
  onRightClickMap,
  onEditWaypoint,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Ref maps to handle updating overlays, route line, markers
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const hillshadeLayerRef = useRef<L.TileLayer | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const controlMarkersRef = useRef<L.CircleMarker[]>([]);
  const waypointMarkersRef = useRef<Record<string, L.Marker>>({});
  const hoverIndicatorRef = useRef<L.CircleMarker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map Instance (Centered on Picos de Europa, Spain as default mountain view)
    const map = L.map(mapContainerRef.current, {
      center: [43.1906, -4.8322],
      zoom: 13,
      zoomControl: false, // Will add custom positioned zoom control
      attributionControl: false,
    });
    
    // Add Zoom Control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Set OSM as initial tile layer
    const baseLayer = L.tileLayer(TILE_LAYERS[activeBaseLayer], {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = baseLayer;

    // Add Hillshading overlay layer (hidden initially)
    const hillshadeLayer = L.tileLayer(HILLSHADE_URL, {
      maxZoom: 19,
      opacity: showContours ? overlayOpacity : 0,
    }).addTo(map);
    hillshadeLayerRef.current = hillshadeLayer;

    mapRef.current = map;

    // Clean up
    return () => {
      map.remove();
    };
  }, []);

  // Update Base Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;

    // Smoothly transition base layers
    map.removeLayer(tileLayerRef.current);
    const newBaseLayer = L.tileLayer(TILE_LAYERS[activeBaseLayer], {
      maxZoom: 19,
    }).addTo(map);
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

  // Handle drawing clicks & right clicks on Map
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

  // Redraw Route Polyline and Control Points
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old route line
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    // Clear old control point circle markers
    controlMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    controlMarkersRef.current = [];

    if (points.length === 0) return;

    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));

    // Draw main route line
    const polyline = L.polyline(latlngs, {
      color: "#10b981", // Emerald
      weight: 4,
      opacity: 0.85,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    routeLineRef.current = polyline;

    // Draw control markers at click vertices (first and last points are special)
    points.forEach((pt, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === points.length - 1;

      // Draw markers on vertices to make it look premium
      if (isFirst || isLast || points.length < 15 || idx % 3 === 0) {
        const circleMarker = L.circleMarker([pt.lat, pt.lng], {
          radius: isFirst || isLast ? 6 : 4,
          fillColor: isFirst ? "#3b82f6" : isLast ? "#ef4444" : "#10b981",
          fillOpacity: 1,
          color: "#ffffff",
          weight: 1.5,
        }).addTo(map);
        
        controlMarkersRef.current.push(circleMarker);
      }
    });

  }, [points]);

  // Sync Waypoint Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove deleted markers
    const currentWptIds = new Set(waypoints.map((w) => w.id));
    Object.keys(waypointMarkersRef.current).forEach((id) => {
      if (!currentWptIds.has(id)) {
        map.removeLayer(waypointMarkersRef.current[id]);
        delete waypointMarkersRef.current[id];
      }
    });

    // Add or Update markers
    waypoints.forEach((wpt) => {
      const svg = WPT_SVG_PATHS[wpt.icon] || WPT_SVG_PATHS.mountain;
      const customHtml = `
        <div class="relative w-8 h-8 flex items-center justify-center animate-bounce-short">
          <div class="absolute w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${wpt.color}">
            ${svg}
          </div>
          <div class="absolute -bottom-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px]" style="border-t-color: ${wpt.color}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "custom-div-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 32], // Anchor point is at the bottom-center of the icon
      });

      const existingMarker = waypointMarkersRef.current[wpt.id];
      if (existingMarker) {
        // Update position and icon
        existingMarker.setLatLng([wpt.lat, wpt.lng]);
        existingMarker.setIcon(customIcon);
        // Update tooltip
        existingMarker.setTooltipContent(`
          <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17] border border-[#1b3d2b] rounded-lg">
            ${wpt.name}
          </div>
        `);
      } else {
        // Create new marker
        const marker = L.marker([wpt.lat, wpt.lng], { icon: customIcon })
          .addTo(map)
          .bindTooltip(`
            <div class="px-2 py-1 text-slate-200 text-xs font-semibold bg-[#131b17]/95 border border-[#1b3d2b] rounded-lg shadow-xl">
              ${wpt.name}
            </div>
          `, { direction: "top", offset: [0, -32], opacity: 0.9 })
          .on("click", () => {
            onEditWaypoint(wpt);
          });
        
        waypointMarkersRef.current[wpt.id] = marker;
      }
    });

  }, [waypoints, onEditWaypoint]);

  // Sync Hover Marker (Synchronized Elevation Chart Hover Indicator)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hoverIndicatorRef.current) {
      map.removeLayer(hoverIndicatorRef.current);
      hoverIndicatorRef.current = null;
    }

    if (hoverPoint) {
      // Draw an awesome glowing indicator circle
      const indicator = L.circleMarker([hoverPoint.lat, hoverPoint.lng], {
        radius: 8,
        fillColor: "#f97316", // Amber / Orange glow
        fillOpacity: 0.8,
        color: "#ffffff",
        weight: 2,
        className: "animate-ping-slow",
      }).addTo(map);

      // Add a tooltip showing elevation and distance dynamically
      indicator.bindTooltip(`
        <div class="px-2 py-1 text-slate-100 text-[10px] font-bold bg-[#131b17] border border-orange-500/30 rounded-lg shadow-md">
          Alt: ${Math.round(hoverPoint.elevation)}m | Dist: ${hoverPoint.distance.toFixed(2)}km
        </div>
      `, { permanent: true, direction: "top", offset: [0, -10] }).openTooltip();

      hoverIndicatorRef.current = indicator;
    }
  }, [hoverPoint]);

  // Handle flying/panning to specific coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToCoords) return;

    map.flyTo(flyToCoords, 14, {
      animate: true,
      duration: 1.5,
    });
  }, [flyToCoords]);

  return (
    <div className="relative w-full h-full bg-[#0a0e0c] overflow-hidden">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Drawing overlay badge */}
      {isDrawing && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[2000] bg-emerald-500/90 border border-emerald-400/30 text-[#0c120f] font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xl backdrop-blur-sm animate-pulse pointer-events-none">
          <Plus className="w-4 h-4 animate-spin-slow" />
          Modo Edición Activo: Haz Clic en el Mapa
        </div>
      )}
      
      {/* Compass rose or watermarked label (adds premium aesthetic) */}
      <div className="absolute bottom-5 left-5 z-[2000] pointer-events-none opacity-30 select-none hidden sm:block">
        <h2 className="text-xl font-black text-emerald-400 tracking-widest font-mono">SUMMIT MAPS</h2>
        <p className="text-[9px] text-slate-500 tracking-wider">TOPOGRAPHIC PLANNING SUITE</p>
      </div>
    </div>
  );
}
