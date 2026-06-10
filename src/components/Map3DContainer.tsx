import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Waypoint, RoutePoint } from "../hooks/useRoutePlanner";

interface Track {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  points: RoutePoint[];
  waypoints: Waypoint[];
}

interface Map3DContainerProps {
  tracks: Track[];
  activeTrackId: string | null;
  waypoints: Waypoint[];
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;
  // Public WMS layers
  showProtectedAreas: boolean;
  showCaminoSantiago: boolean;
  showSpainByBike: boolean;
  showMountainRefuges: boolean;
}

const TERRAIN_SOURCE_ID = "terrain-dem";
const TRACK_SOURCE_ID   = "active-track";
const WPT_SOURCE_ID     = "waypoints-geojson";

// Fully inline style — no external URL needed, works immediately without network fetch
const MAPLIBRE_BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "osm-background", type: "raster", source: "osm-tiles" },
  ],
};

const WMS_LAYERS: Record<string, { url: string; layers: string; label: string }> = {
  protectedAreas: {
    url: "https://wms.mapama.gob.es/sig/Biodiversidad/ENP/wms.aspx",
    layers: "PS.ProtectedSite",
    label: "Lugares Protegidos (INSPIRE)",
  },
  caminoSantiago: {
    url: "https://www.ign.es/wms-inspire/camino-santiago",
    layers: "Camino.de.Santiago",
    label: "Caminos de Santiago (IGN)",
  },
  spainByBike: {
    url: "https://wms-spainbybike.idee.es/spainbybike",
    layers: "etapas,centros_btt,puertos_pto",
    label: "Spain by Bike / BTT",
  },
};

function buildWmsTileUrl(baseUrl: string, layers: string): string {
  return (
    `${baseUrl}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
    `&LAYERS=${encodeURIComponent(layers)}&STYLES=&FORMAT=image%2Fpng` +
    `&TRANSPARENT=true&WIDTH=256&HEIGHT=256` +
    `&BBOX={bbox-epsg-3857}&SRS=EPSG%3A3857`
  );
}

export function Map3DContainer({
  tracks,
  activeTrackId,
  waypoints,
  mapCenter,
  mapZoom,
  showProtectedAreas,
  showCaminoSantiago,
  showSpainByBike,
  showMountainRefuges,
}: Map3DContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const flyAnimRef   = useRef<number | null>(null);
  const [mapReady, setMapReady]       = useState(false);
  const [isFlying, setIsFlying]       = useState(false);
  const [refugesData, setRefugesData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [exaggeration, setExaggeration] = useState(1.5);

  const activeTrack = tracks.find((t) => t.id === activeTrackId && t.visible);
  const center = mapCenter;

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAPLIBRE_BASE_STYLE,
      center: mapCenter ? [mapCenter.lng, mapCenter.lat] : [-3.7, 40.4],
      zoom: Math.max(mapZoom - 1, 6),
      pitch: 55,
      bearing: -10,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      // Add terrain DEM source + activate terrain
      map.addSource(TERRAIN_SOURCE_ID, {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium" as const,
        maxzoom: 15,
      });
      map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.5 });

      // Track source & layers
      map.addSource(TRACK_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "track-line-shadow",
        type: "line",
        source: TRACK_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#000", "line-width": 6, "line-opacity": 0.25, "line-blur": 3 },
      });
      map.addLayer({
        id: "track-line",
        type: "line",
        source: TRACK_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.95 },
      });

      // Waypoints source & circle layer (no symbol/text to avoid font dependency issues)
      map.addSource(WPT_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "waypoints-circle",
        type: "circle",
        source: WPT_SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.95,
        },
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      if (flyAnimRef.current) cancelAnimationFrame(flyAnimRef.current);
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update terrain exaggeration ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration });
  }, [exaggeration, mapReady]);

  // ── Update track GeoJSON ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const src = map.getSource(TRACK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = tracks
      .filter((t) => t.visible && t.points.length > 1)
      .map((t) => ({
        type: "Feature",
        properties: { color: t.color || "#10b981" },
        geometry: {
          type: "LineString",
          coordinates: t.points.map((p) => [p.lng, p.lat, p.elevation ?? 0]),
        },
      }));

    src.setData({ type: "FeatureCollection", features });
  }, [tracks, mapReady]);

  // ── Update waypoints GeoJSON ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const src = map.getSource(WPT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features: GeoJSON.Feature<GeoJSON.Point>[] = waypoints.map((w) => ({
      type: "Feature",
      properties: { name: w.name, color: w.color || "#10b981" },
      geometry: { type: "Point", coordinates: [w.lng, w.lat] },
    }));

    src.setData({ type: "FeatureCollection", features });
  }, [waypoints, mapReady]);

  // ── WMS layers helper ─────────────────────────────────────────────────────
  const toggleWmsLayer = useCallback((key: string, visible: boolean) => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const srcId   = `wms-${key}`;
    const layerId = `wms-layer-${key}`;

    if (visible) {
      if (!map.getSource(srcId)) {
        const cfg = WMS_LAYERS[key];
        map.addSource(srcId, {
          type: "raster",
          tiles: [buildWmsTileUrl(cfg.url, cfg.layers)],
          tileSize: 256,
        });
        map.addLayer({ id: layerId, type: "raster", source: srcId, paint: { "raster-opacity": 0.7 } });
      } else {
        map.setLayoutProperty(layerId, "visibility", "visible");
      }
    } else {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "none");
      }
    }
  }, [mapReady]);

  useEffect(() => { toggleWmsLayer("protectedAreas", showProtectedAreas); }, [showProtectedAreas, toggleWmsLayer]);
  useEffect(() => { toggleWmsLayer("caminoSantiago", showCaminoSantiago); }, [showCaminoSantiago, toggleWmsLayer]);
  useEffect(() => { toggleWmsLayer("spainByBike",    showSpainByBike);    }, [showSpainByBike,    toggleWmsLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const layerId = "refuges-layer";

    if (!showMountainRefuges) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", "none");
      return;
    }

    const bbox   = map.getBounds();
    const query  =
      `[out:json][timeout:20];` +
      `(node["tourism"="alpine_hut"](${bbox.getSouth()},${bbox.getWest()},${bbox.getNorth()},${bbox.getEast()});` +
      `node["tourism"="wilderness_hut"](${bbox.getSouth()},${bbox.getWest()},${bbox.getNorth()},${bbox.getEast()});` +
      `node["amenity"="shelter"](${bbox.getSouth()},${bbox.getWest()},${bbox.getNorth()},${bbox.getEast()}););` +
      `out body;`;

    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        const fc: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: (data.elements || []).map((el: any) => ({
            type: "Feature",
            properties: { name: el.tags?.name || el.tags?.["name:es"] || "Refugio", type: el.tags?.tourism || el.tags?.amenity },
            geometry: { type: "Point", coordinates: [el.lon, el.lat] },
          })),
        };
        setRefugesData(fc);
      })
      .catch(() => {});
  }, [showMountainRefuges, mapReady, center]);

  // Render refuges GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !showMountainRefuges || !refugesData) return;
    const srcId   = "refuges-geojson";
    const layerId = "refuges-layer";
    const labelId = "refuges-label";

    if (!map.getSource(srcId)) {
      map.addSource(srcId, { type: "geojson", data: refugesData });
      map.addLayer({
        id: layerId,
        type: "circle",
        source: srcId,
        paint: { "circle-radius": 6, "circle-color": "#f59e0b", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff" },
      });
      map.addLayer({
        id: labelId,
        type: "symbol",
        source: srcId,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: { "text-color": "#f59e0b", "text-halo-color": "#0c120f", "text-halo-width": 1.5 },
      });
    } else {
      (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(refugesData);
      map.setLayoutProperty(layerId, "visibility", "visible");
    }
  }, [refugesData, showMountainRefuges, mapReady]);

  // ── Camera fly along route ────────────────────────────────────────────────
  const startFly = useCallback(() => {
    const map = mapRef.current;
    if (!map || !activeTrack || activeTrack.points.length < 2) return;

    setIsFlying(true);
    const pts   = activeTrack.points;
    let   index = 0;

    const step = () => {
      if (!mapRef.current || index >= pts.length - 1) {
        setIsFlying(false);
        return;
      }
      const cur  = pts[index];
      const next = pts[Math.min(index + 1, pts.length - 1)];
      const bear = Math.atan2(next.lng - cur.lng, next.lat - cur.lat) * (180 / Math.PI);

      mapRef.current.easeTo({
        center: [cur.lng, cur.lat],
        bearing: bear,
        pitch: 70,
        zoom: 14.5,
        duration: 150,
        easing: (t) => t,
      });

      index += Math.max(1, Math.floor(pts.length / 200));
      flyAnimRef.current = requestAnimationFrame(step);
    };

    flyAnimRef.current = requestAnimationFrame(step);
  }, [activeTrack]);

  const stopFly = useCallback(() => {
    if (flyAnimRef.current) {
      cancelAnimationFrame(flyAnimRef.current);
      flyAnimRef.current = null;
    }
    setIsFlying(false);
  }, []);

  // ── Fly to active track on first render ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !activeTrack || activeTrack.points.length < 2) return;

    const lngs = activeTrack.points.map((p) => p.lng);
    const lats = activeTrack.points.map((p) => p.lat);
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];

    map.fitBounds([sw, ne], { padding: 60, pitch: 55, bearing: -10, duration: 1200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);


  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[4000] flex items-center gap-2 pointer-events-auto">
        {activeTrack && activeTrack.points.length > 1 && (
          <button
            onClick={isFlying ? stopFly : startFly}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl border transition-all ${
              isFlying
                ? "bg-red-500/90 border-red-400 text-white"
                : "bg-emerald-500/90 border-emerald-400 text-black"
            }`}
          >
            {isFlying ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                Detener Vuelo
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Volar Ruta
              </>
            )}
          </button>
        )}

        {/* Terrain exaggeration slider */}
        <div className="flex items-center gap-2 bg-[#131b17]/90 border border-[#1b3d2b] rounded-xl px-3 py-2 shadow-xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap">Relieve</span>
          <input
            type="range" min="0.5" max="4" step="0.1"
            value={exaggeration}
            onChange={(e) => setExaggeration(parseFloat(e.target.value))}
            className="w-20 accent-emerald-400"
          />
          <span className="text-[10px] font-mono text-slate-300 w-6">{exaggeration.toFixed(1)}x</span>
        </div>
      </div>

      {/* Active WMS badges */}
      <div className="absolute top-3 left-3 z-[4000] flex flex-col gap-1 pointer-events-none">
        {showProtectedAreas && <span className="text-[9px] bg-green-700/80 text-white px-2 py-0.5 rounded-full font-semibold">🌿 Lugares Protegidos</span>}
        {showCaminoSantiago && <span className="text-[9px] bg-amber-700/80 text-white px-2 py-0.5 rounded-full font-semibold">⛩️ Caminos de Santiago</span>}
        {showSpainByBike    && <span className="text-[9px] bg-blue-700/80 text-white px-2 py-0.5 rounded-full font-semibold">🚴 Spain by Bike</span>}
        {showMountainRefuges && <span className="text-[9px] bg-orange-700/80 text-white px-2 py-0.5 rounded-full font-semibold">🏕️ Refugios</span>}
      </div>
    </div>
  );
}
