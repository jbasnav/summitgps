import { useState } from "react";
import { X, Layers, Info, Compass, Globe, Mountain, Sliders } from "lucide-react";

interface BaseLayer {
  id: string;
  name: string;
  desc: string;
  thumbnail: string;
}

interface FloatingLayerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  activeBaseLayer: string;
  onChangeBaseLayer: (id: string) => void;
  
  // Overlays (Superposiciones)
  showPersonalHeatmap: boolean;
  onTogglePersonalHeatmap: () => void;
  showCommunityHeatmap: boolean;
  onToggleCommunityHeatmap: () => void;
  showTerrainLimits: boolean;
  onToggleTerrainLimits: () => void;

  // Hillshade & Slope Shading (Fase 13 / Seguridad y Relieve)
  showContours: boolean;
  onToggleContours: () => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (opacity: number) => void;
  showSlopeShading: boolean;
  onToggleSlopeShading: () => void;
  slopeShadingOpacity: number;
  onChangeSlopeShadingOpacity: (opacity: number) => void;

  // Extras
  showDistanceMarkers: boolean;
  onToggleDistanceMarkers: () => void;
  showWaypoints: boolean;
  onToggleWaypoints: () => void;
  showCommunityWaypoints: boolean;
  onToggleCommunityWaypoints: () => void;
  showNearbyTrails: boolean;
  onToggleNearbyTrails: () => void;
  showHikingTrails: boolean;
  onToggleHikingTrails: () => void;
  showCyclingTrails: boolean;
  onToggleCyclingTrails: () => void;
  showMtbTrails: boolean;
  onToggleMtbTrails: () => void;

  isPlusUser: boolean;
  onOpenPlusModal: () => void;
}

export function FloatingLayerSelector({
  isOpen,
  onClose,
  activeBaseLayer,
  onChangeBaseLayer,
  showPersonalHeatmap,
  onTogglePersonalHeatmap,
  showCommunityHeatmap,
  onToggleCommunityHeatmap,
  showTerrainLimits,
  onToggleTerrainLimits,
  showContours,
  onToggleContours,
  overlayOpacity,
  onChangeOverlayOpacity,
  showSlopeShading,
  onToggleSlopeShading,
  slopeShadingOpacity,
  onChangeSlopeShadingOpacity,
  showDistanceMarkers,
  onToggleDistanceMarkers,
  showWaypoints,
  onToggleWaypoints,
  showCommunityWaypoints,
  onToggleCommunityWaypoints,
  showNearbyTrails,
  onToggleNearbyTrails,
  showHikingTrails,
  onToggleHikingTrails,
  showCyclingTrails,
  onToggleCyclingTrails,
  showMtbTrails,
  onToggleMtbTrails,
  isPlusUser,
  onOpenPlusModal,
}: FloatingLayerSelectorProps) {
  const [activeTab, setActiveTab] = useState<"base" | "overlays" | "extras">("base");

  if (!isOpen) return null;

  const BASE_LAYERS_LIST: BaseLayer[] = [
    {
      id: "opentopo",
      name: "AllTrails Topo",
      desc: "Amplio mapa de la ruta y del terreno.",
      thumbnail: "https://a.tile.opentopomap.org/12/2079/1431.png",
    },
    {
      id: "satellite",
      name: "Satélite",
      desc: "Imágenes detalladas por satélite.",
      thumbnail: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1431/2079.jpg",
    },
    {
      id: "terrain",
      name: "Terreno",
      desc: "Mapa topográfico con relieve y curvas.",
      thumbnail: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/12/1431/2079.jpg",
    },
    {
      id: "osm",
      name: "Carretera (OSM)",
      desc: "Calles, edificios y rutas estándar.",
      thumbnail: "https://a.tile.openstreetmap.org/12/2079/1431.png",
    },
    {
      id: "cyclosm",
      name: "OpenCycleMap (OCM)",
      desc: "Mapa del mundo con rutas ciclistas y MTB.",
      thumbnail: "https://c.tile-cyclosm.openstreetmap.fr/cyclosm/12/2079/1431.png",
    },
    {
      id: "wanderreitkarte",
      name: "Servicio Geológico (USGS)",
      desc: "Mapa histórico y de senderos.",
      thumbnail: "https://a.tile.opentopomap.org/12/2079/1432.png",
    },
  ];

  return (
    <div className="absolute right-16 top-4 z-[5000] w-[320px] md:w-[350px] bg-[#131b17]/97 border border-[#1b3d2b] rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col pointer-events-auto transition-all animate-slide-in-right max-h-[85vh]">
      
      {/* Header and Close Button */}
      <div className="flex items-center justify-between p-4 border-b border-[#1b3d2b] select-none">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Capas del mapa
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#1b3d2b]/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex p-2 bg-[#0c120f]/60 gap-1 border-b border-[#1b3d2b] select-none">
        {(["base", "overlays", "extras"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-[#1d2d24] text-emerald-400 border border-[#2b593f]/30 shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1c2921]/20"
            }`}
          >
            {tab === "base" ? "Mapa base" : tab === "overlays" ? "Superposiciones" : "Extras"}
          </button>
        ))}
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        
        {/* TABS 1: MAPA BASE */}
        {activeTab === "base" && (
          <div className="grid grid-cols-1 gap-2.5 animate-fade-in">
            {BASE_LAYERS_LIST.map((layer) => {
              const isActive = activeBaseLayer === layer.id;
              return (
                <div
                  key={layer.id}
                  onClick={() => onChangeBaseLayer(layer.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer select-none group ${
                    isActive
                      ? "bg-emerald-500/10 border-emerald-400/50 shadow-md"
                      : "bg-[#0c120f]/40 border-[#1b3d2b]/20 hover:border-emerald-500/20 hover:bg-[#0c120f]/80"
                  }`}
                >
                  <img
                    src={layer.thumbnail}
                    alt={layer.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#1b3d2b] shadow"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[11px] font-bold block leading-snug ${isActive ? "text-emerald-400" : "text-slate-200 group-hover:text-emerald-300"}`}>
                      {layer.name}
                    </span>
                    <span className="text-[9px] text-slate-400 leading-normal block mt-0.5 truncate">
                      {layer.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABS 2: SUPERPOSICIONES */}
        {activeTab === "overlays" && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Heatmaps Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-[#1b3d2b] select-none">
                <span>Heatmaps (Mapas de calor)</span>
                <div className="group relative">
                  <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-[#0a0f0c] border border-[#1b3d2b] p-2 rounded-lg text-[8.5px] text-slate-300 normal-case font-normal leading-normal shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Muestra los senderos más recorridos por ti o por la comunidad global de SummitGPS.
                  </span>
                </div>
              </div>

              {/* Heatmap Personal */}
              <div
                onClick={onTogglePersonalHeatmap}
                className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer select-none group ${
                  showPersonalHeatmap
                    ? "bg-emerald-500/10 border-emerald-400/50"
                    : "bg-[#0c120f]/40 border-[#1b3d2b] hover:border-emerald-500/20"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] font-bold block leading-snug ${showPersonalHeatmap ? "text-emerald-400" : "text-slate-200"}`}>
                    Heatmap personal
                  </span>
                  <span className="text-[9px] text-slate-400 leading-normal block mt-0.5 truncate">
                    Tus actividades de ruta de todos los tiempos.
                  </span>
                </div>
                <div className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all ${showPersonalHeatmap ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}>
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </div>
              </div>

              {/* Heatmap Comunitario */}
              <div
                onClick={() => {
                  if (!isPlusUser) {
                    onOpenPlusModal();
                  } else {
                    onToggleCommunityHeatmap();
                  }
                }}
                className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer select-none group ${
                  showCommunityHeatmap
                    ? "bg-emerald-500/10 border-emerald-400/50"
                    : "bg-[#0c120f]/40 border-[#1b3d2b] hover:border-emerald-500/20"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] font-bold flex items-center gap-1 leading-snug ${showCommunityHeatmap ? "text-emerald-400" : "text-slate-200"}`}>
                    Heatmap comunitario
                    {!isPlusUser && (
                      <span className="text-[8px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1 py-0.2 rounded font-extrabold">Plus</span>
                    )}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-normal block mt-0.5 truncate">
                    Actividad reciente en la ruta global.
                  </span>
                </div>
                <div className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all ${showCommunityHeatmap ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}>
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </div>
              </div>

            </div>

            {/* Terreno Section */}
            <div className="space-y-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-[#1b3d2b] select-none">
                Límites de terreno
              </div>

              {/* Public lands / limits */}
              <div
                onClick={onToggleTerrainLimits}
                className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer select-none group ${
                  showTerrainLimits
                    ? "bg-emerald-500/10 border-emerald-400/50"
                    : "bg-[#0c120f]/40 border-[#1b3d2b] hover:border-emerald-500/20"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow">
                  <Mountain className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] font-bold block leading-snug ${showTerrainLimits ? "text-emerald-400" : "text-slate-200"}`}>
                    Terrenos públicos de la zona
                  </span>
                  <span className="text-[9px] text-slate-400 leading-normal block mt-0.5 truncate">
                    Denominaciones y gestores del suelo.
                  </span>
                </div>
                <div className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all ${showTerrainLimits ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}>
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </div>
              </div>
            </div>

            {/* Relieve y Seguridad Section */}
            <div className="space-y-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-[#1b3d2b] select-none">
                Relieve y Seguridad
              </div>

              {/* Sombreado de Pendiente (Hillshade) */}
              <div className="space-y-2">
                <div
                  onClick={onToggleContours}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer select-none group ${
                    showContours
                      ? "bg-emerald-500/10 border-emerald-400/50"
                      : "bg-[#0c120f]/40 border-[#1b3d2b] hover:border-emerald-500/20"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow">
                    <Mountain className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[11px] font-bold block leading-snug ${showContours ? "text-emerald-400" : "text-slate-200"}`}>
                      Sombreado de Pendiente (Hillshade)
                    </span>
                    <span className="text-[9px] text-slate-400 leading-normal block mt-0.5 truncate">
                      Relieve sombreado en 3D del terreno.
                    </span>
                  </div>
                  <div className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all ${showContours ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}>
                    <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                  </div>
                </div>

                {showContours && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] animate-fade-in text-[10px] font-bold text-slate-400">
                    <div className="flex items-center justify-between mb-1 select-none">
                      <span>Intensidad del Relieve:</span>
                      <span className="font-mono text-emerald-400">{Math.round(overlayOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={overlayOpacity}
                      onChange={(e) => onChangeOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1 rounded-full bg-[#131b17]"
                    />
                  </div>
                )}
              </div>

              {/* Mapa de Pendientes (IGN) */}
              <div className="space-y-2">
                <div
                  onClick={onToggleSlopeShading}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer select-none group ${
                    showSlopeShading
                      ? "bg-emerald-500/10 border-emerald-400/50"
                      : "bg-[#0c120f]/40 border-[#1b3d2b] hover:border-emerald-500/20"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[11px] font-bold block leading-snug ${showSlopeShading ? "text-emerald-400" : "text-slate-200"}`}>
                      Mapa de Pendientes (IGN)
                    </span>
                    <span className="text-[9px] text-slate-400 leading-normal block mt-0.5 truncate">
                      Riesgo de aludes (pendientes empinadas).
                    </span>
                  </div>
                  <div className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all ${showSlopeShading ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}>
                    <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                  </div>
                </div>

                {showSlopeShading && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] animate-fade-in text-[10px] font-bold text-slate-400">
                    <div className="flex items-center justify-between mb-1 select-none">
                      <span>Opacidad de Pendientes:</span>
                      <span className="font-mono text-emerald-400">{Math.round(slopeShadingOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={slopeShadingOpacity}
                      onChange={(e) => onChangeSlopeShadingOpacity(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1 rounded-full bg-[#131b17]"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TABS 3: EXTRAS */}
        {activeTab === "extras" && (
          <div className="space-y-4 animate-fade-in text-xs font-semibold">
            
            {/* Detalles de la ruta */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block pb-1 border-b border-[#1b3d2b] select-none">
                Detalles de la ruta
              </span>

              {/* Distance markers switch */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] select-none">
                <span className="text-[11px] text-slate-200">Marcadores de distancia</span>
                <button
                  onClick={onToggleDistanceMarkers}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${showDistanceMarkers ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}
                >
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </button>
              </div>
            </div>

            {/* Puntos de ruta */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block pb-1 border-b border-[#1b3d2b] select-none">
                Puntos de ruta
              </span>

              {/* Waypoints switch */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] select-none">
                <span className="text-[11px] text-slate-200">Tus puntos de paso</span>
                <button
                  onClick={onToggleWaypoints}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${showWaypoints ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}
                >
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </button>
              </div>

              {/* Community waypoints switch */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] select-none">
                <span className="text-[11px] text-slate-200">Puntos de paso comunitarios</span>
                <button
                  onClick={onToggleCommunityWaypoints}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${showCommunityWaypoints ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}
                >
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </button>
              </div>
            </div>

            {/* Senderos y rutas cercanas */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block pb-1 border-b border-[#1b3d2b] select-none">
                Senderos y rutas cercanas
              </span>

              {/* Nearby Trails (Community Activities) */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] select-none">
                <span className="text-[11px] text-slate-200">Actividades de la comunidad</span>
                <button
                  onClick={onToggleNearbyTrails}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${showNearbyTrails ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}
                >
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </button>
              </div>

              {/* Hiking Waymarked */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] select-none">
                <span className="text-[11px] text-slate-200 font-medium">Senderismo Waymarked</span>
                <button
                  onClick={onToggleHikingTrails}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${showHikingTrails ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}
                >
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </button>
              </div>

              {/* Cycling Waymarked */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] select-none">
                <span className="text-[11px] text-slate-200 font-medium">Ciclismo Waymarked</span>
                <button
                  onClick={onToggleCyclingTrails}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${showCyclingTrails ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}
                >
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </button>
              </div>

              {/* Waymarked MTB */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c120f]/30 border border-[#1b3d2b] select-none">
                <span className="text-[11px] text-slate-200 font-medium">Waymarked MTB</span>
                <button
                  onClick={onToggleMtbTrails}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${showMtbTrails ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"}`}
                >
                  <div className="w-3 h-3 rounded-full bg-[#0c120f] shadow-md" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
