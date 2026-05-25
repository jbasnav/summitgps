import { Layers, Sliders, Map, Globe, Compass, Mountain } from "lucide-react";

export type BaseLayerId = "osm" | "satellite" | "opentopo" | "terrain";

export interface LayerSelectorProps {
  activeBaseLayer: BaseLayerId;
  onChangeBaseLayer: (id: BaseLayerId) => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (opacity: number) => void;
  showContours: boolean;
  onToggleContours: () => void;
}

const BASE_LAYERS = [
  {
    id: "osm" as BaseLayerId,
    name: "OpenStreetMap",
    desc: "Estándar urbano y vial, ideal para rutas de senderismo cercanas a ciudades.",
    icon: Map,
    thumbnail: "https://a.tile.openstreetmap.org/12/2079/1431.png",
  },
  {
    id: "opentopo" as BaseLayerId,
    name: "Gaia Topo (OpenTopoMap)",
    desc: "Curvas de nivel ultra-detalladas, picos y sombreado de relieve perfecto.",
    icon: Mountain,
    thumbnail: "https://a.tile.opentopomap.org/12/2079/1431.png",
  },
  {
    id: "satellite" as BaseLayerId,
    name: "Imágenes Satélite (Esri)",
    desc: "Imágenes de satélite reales de alta resolución para ver el terreno real.",
    icon: Globe,
    thumbnail: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1431/2079.jpg",
  },
  {
    id: "terrain" as BaseLayerId,
    name: "Esri World Topo",
    desc: "Mapa físico y político integrado, con excelente sombreado de relieve.",
    icon: Compass,
    thumbnail: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/12/1431/2079.jpg",
  },
];

export function LayerSelector({
  activeBaseLayer,
  onChangeBaseLayer,
  overlayOpacity,
  onChangeOverlayOpacity,
  showContours,
  onToggleContours,
}: LayerSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase mb-3 flex items-center gap-1.5">
          <Layers className="w-4 h-4" />
          Mapa Base
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {BASE_LAYERS.map((layer) => {
            const Icon = layer.icon;
            const isActive = activeBaseLayer === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => onChangeBaseLayer(layer.id)}
                className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left overflow-hidden transition-all ${
                  isActive
                    ? "bg-emerald-500/10 border-emerald-400/60 ring-1 ring-emerald-500/20"
                    : "bg-[#0b100d] border-white/5 hover:border-white/10 hover:bg-[#0f1612]"
                }`}
              >
                {/* Background Thumbnail representing the map base */}
                <div className="absolute right-0 bottom-0 w-12 h-12 opacity-10 group-hover:opacity-20 transition-opacity rounded-tl-xl overflow-hidden pointer-events-none">
                  <img src={layer.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
                
                <Icon className={`w-4 h-4 mb-2 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span className={`text-xs font-semibold ${isActive ? "text-emerald-300" : "text-slate-200"}`}>
                  {layer.name}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight mt-1 line-clamp-2">
                  {layer.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#1b3d2b]/40 pt-5 space-y-4">
        <h4 className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase flex items-center gap-1.5">
          <Sliders className="w-4 h-4" />
          Capas Superpuestas (Overlays)
        </h4>

        {/* Contour lines toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b100d] border border-white/5">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200">Sombreado de Pendiente (Hillshade)</span>
            <p className="text-[10px] text-slate-500">Agrega relieve sombreado en 3D sobre cualquier mapa base.</p>
          </div>
          <button
            type="button"
            onClick={onToggleContours}
            className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              showContours ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"
            }`}
          >
            <span className={`w-5 h-5 rounded-full shadow-md transform duration-200 ${showContours ? "bg-black" : "bg-slate-400"}`} />
          </button>
        </div>

        {/* Overlay opacity control */}
        {showContours && (
          <div className="space-y-2 p-3.5 rounded-xl bg-[#0b100d] border border-white/5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Intensidad del Relieve</span>
              <span className="text-xs font-medium text-emerald-400">{Math.round(overlayOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => onChangeOverlayOpacity(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#18231e] rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            />
            <div className="flex justify-between text-[9px] text-slate-600 font-medium">
              <span>Mínimo</span>
              <span>Medio</span>
              <span>Máximo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
