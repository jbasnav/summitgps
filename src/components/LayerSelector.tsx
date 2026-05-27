import React, { useState } from "react";
import { Layers, Sliders, Map, Globe, Compass, Mountain, Plus, Trash2, Eye, EyeOff } from "lucide-react";

export interface CustomLayer {
  id: string;
  name: string;
  type: "xyz" | "wms";
  url: string;
  visible: boolean;
  opacity: number;
  isBase: boolean;
  wmsLayers?: string;
  attribution?: string;
}

export type BaseLayerId = "osm" | "satellite" | "opentopo" | "terrain" | (string & {});

export interface LayerSelectorProps {
  activeBaseLayer: BaseLayerId;
  onChangeBaseLayer: (id: BaseLayerId) => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (opacity: number) => void;
  showContours: boolean;
  onToggleContours: () => void;
  
  // Custom layers and slope shading props (Fase 13)
  customLayers?: CustomLayer[];
  onAddCustomLayer?: (layer: Omit<CustomLayer, "id" | "visible" | "opacity">) => void;
  onDeleteCustomLayer?: (id: string) => void;
  onToggleCustomLayer?: (id: string) => void;
  onUpdateCustomLayerOpacity?: (id: string, opacity: number) => void;

  // Slope shading props
  showSlopeShading?: boolean;
  onToggleSlopeShading?: () => void;
  slopeShadingOpacity?: number;
  onChangeSlopeShadingOpacity?: (opacity: number) => void;
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
    name: "OpenTopoMap",
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
  customLayers = [],
  onAddCustomLayer,
  onDeleteCustomLayer,
  onToggleCustomLayer,
  onUpdateCustomLayerOpacity,
  showSlopeShading = false,
  onToggleSlopeShading,
  slopeShadingOpacity = 0.6,
  onChangeSlopeShadingOpacity,
}: LayerSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"xyz" | "wms">("xyz");
  const [formUrl, setFormUrl] = useState("");
  const [formIsBase, setFormIsBase] = useState(true);
  const [formWmsLayers, setFormWmsLayers] = useState("");
  const [formAttribution, setFormAttribution] = useState("");

  const applyPreset = (preset: {
    name: string;
    type: "xyz" | "wms";
    url: string;
    isBase: boolean;
    wmsLayers?: string;
    attribution?: string;
  }) => {
    setFormName(preset.name);
    setFormType(preset.type);
    setFormUrl(preset.url);
    setFormIsBase(preset.isBase);
    setFormWmsLayers(preset.wmsLayers || "");
    setFormAttribution(preset.attribution || "");
  };

  const PRESETS = [
    {
      name: "IGN España Topo (WMS)",
      type: "wms" as const,
      url: "https://www.ign.es/wms-inspire/mapas-raster",
      isBase: true,
      wmsLayers: "mtn_rasterizado",
      attribution: "© Instituto Geográfico Nacional",
    },
    {
      name: "Catastro España (WMS)",
      type: "wms" as const,
      url: "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx",
      isBase: false,
      wmsLayers: "Catastro",
      attribution: "© Dirección General del Catastro",
    },
    {
      name: "CyclOSM (Ciclismo)",
      type: "xyz" as const,
      url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
      isBase: true,
      attribution: "© CyclOSM & OpenStreetMap",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUrl) return;

    if (onAddCustomLayer) {
      onAddCustomLayer({
        name: formName,
        type: formType,
        url: formUrl,
        isBase: formIsBase,
        wmsLayers: formType === "wms" ? formWmsLayers : undefined,
        attribution: formAttribution || undefined,
      });
    }

    // Reset form
    setFormName("");
    setFormUrl("");
    setFormWmsLayers("");
    setFormAttribution("");
    setShowAddForm(false);
  };

  const customBaseLayers = customLayers.filter((l) => l.isBase);
  const customOverlayLayers = customLayers.filter((l) => !l.isBase);

  return (
    <div className="space-y-6">
      {/* ══════════ MAPA BASE ══════════ */}
      <div>
        <h4 className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Mapa Base
          </span>
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {/* Preconfigured Base Layers */}
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

          {/* Custom Base Layers */}
          {customBaseLayers.map((layer) => {
            const isActive = activeBaseLayer === layer.id;
            return (
              <div
                key={layer.id}
                className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left overflow-hidden transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-500/10 border-emerald-400/60 ring-1 ring-emerald-500/20"
                    : "bg-[#0b100d] border-white/5 hover:border-white/10 hover:bg-[#0f1612]"
                }`}
                onClick={() => onChangeBaseLayer(layer.id)}
              >
                <div className="flex w-full justify-between items-start mb-2">
                  <Map className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  {onDeleteCustomLayer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomLayer(layer.id);
                      }}
                      className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      title="Eliminar capa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className={`text-xs font-semibold ${isActive ? "text-emerald-300" : "text-slate-200"} truncate w-full`}>
                  {layer.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                  {layer.type} Base
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════ SEGURIDAD Y RELIEVE (OVERLAYS) ══════════ */}
      <div className="border-t border-[#1b3d2b]/40 pt-5 space-y-4">
        <h4 className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase flex items-center gap-1.5">
          <Sliders className="w-4 h-4" />
          Seguridad y Relieve
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
          </div>
        )}

        {/* Slope Angle Shading Toggle (IGN WMS) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b100d] border border-white/5">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              🔥 Mapa de Pendientes (IGN)
            </span>
            <p className="text-[10px] text-slate-500">Colorea pendientes empinadas (riesgo de aludes y dificultad).</p>
          </div>
          {onToggleSlopeShading && (
            <button
              type="button"
              onClick={onToggleSlopeShading}
              className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                showSlopeShading ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"
              }`}
            >
              <span className={`w-5 h-5 rounded-full shadow-md transform duration-200 ${showSlopeShading ? "bg-black" : "bg-slate-400"}`} />
            </button>
          )}
        </div>

        {/* Slope Shading Opacity */}
        {showSlopeShading && onChangeSlopeShadingOpacity && (
          <div className="space-y-2 p-3.5 rounded-xl bg-[#0b100d] border border-white/5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Opacidad de Pendientes</span>
              <span className="text-xs font-medium text-emerald-400">{Math.round(slopeShadingOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={slopeShadingOpacity}
              onChange={(e) => onChangeSlopeShadingOpacity(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#18231e] rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* ══════════ CAPAS DE USUARIO PERSONALIZADAS ══════════ */}
      <div className="border-t border-[#1b3d2b]/40 pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            Capas de Usuario
          </h4>
          {onAddCustomLayer && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                showAddForm
                  ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-black"
              }`}
              title={showAddForm ? "Cancelar" : "Añadir Capa Personalizada"}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Custom Layer Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-[#0c120f]/80 border border-[#1b3d2b]/40 space-y-3.5 animate-slide-in-top">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border-b border-[#1b3d2b]/30 pb-1.5 mb-2 flex justify-between items-center">
              <span>Nueva Capa XYZ / WMS</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">Form</span>
            </div>

            {/* Presets Row */}
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Preajustes Sugeridos</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="text-[9px] px-2 py-1 rounded bg-[#18231e] border border-[#1b3d2b]/40 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-all font-semibold"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Nombre de la Capa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: IGN Topográfico España"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#080d0a] border border-[#1b3d2b]/40 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Servidor</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-[#080d0a] border border-[#1b3d2b]/40 rounded-lg py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 transition-colors"
                  >
                    <option value="xyz">XYZ Tiles</option>
                    <option value="wms">WMS Server</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Categoría</label>
                  <select
                    value={formIsBase ? "true" : "false"}
                    onChange={(e) => setFormIsBase(e.target.value === "true")}
                    className="w-full bg-[#080d0a] border border-[#1b3d2b]/40 rounded-lg py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 transition-colors"
                  >
                    <option value="true">Mapa Base</option>
                    <option value="false">Superpuesta (Overlay)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">URL del Servidor</label>
                <textarea
                  required
                  rows={2}
                  placeholder={
                    formType === "xyz"
                      ? "https://{s}.tile.example.com/{z}/{x}/{y}.png"
                      : "https://example.com/wms"
                  }
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-[#080d0a] border border-[#1b3d2b]/40 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 transition-colors font-mono resize-none leading-relaxed"
                />
              </div>

              {formType === "wms" && (
                <div className="animate-fade-in">
                  <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Capas WMS (comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: mtn_rasterizado, Catastro"
                    value={formWmsLayers}
                    onChange={(e) => setFormWmsLayers(e.target.value)}
                    className="w-full bg-[#080d0a] border border-[#1b3d2b]/40 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 transition-colors font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-[9.5px] font-bold text-slate-400 uppercase block mb-1">Atribución (Opcional)</label>
                <input
                  type="text"
                  placeholder="© Autor / Proveedor del Mapa"
                  value={formAttribution}
                  onChange={(e) => setFormAttribution(e.target.value)}
                  className="w-full bg-[#080d0a] border border-[#1b3d2b]/40 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400 active:scale-[0.98] py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-3"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Añadir Capa al Mapa
            </button>
          </form>
        )}

        {/* Custom Overlays list */}
        {customOverlayLayers.length > 0 && (
          <div className="space-y-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Superpuestas del Usuario ({customOverlayLayers.length})</span>
            <div className="space-y-2">
              {customOverlayLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="p-3 rounded-xl bg-[#0b100d] border border-white/5 space-y-2 hover:border-[#1b3d2b]/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate flex-1 leading-normal" title={layer.name}>
                      {layer.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onToggleCustomLayer && (
                        <button
                          type="button"
                          onClick={() => onToggleCustomLayer(layer.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                          title={layer.visible ? "Ocultar overlay" : "Mostrar overlay"}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {onDeleteCustomLayer && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustomLayer(layer.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                          title="Eliminar overlay"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {layer.visible && onUpdateCustomLayerOpacity && (
                    <div className="space-y-1.5 pt-1 border-t border-[#1b3d2b]/10 animate-fade-in">
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                        <span>Opacidad</span>
                        <span className="text-emerald-400 font-bold">{Math.round(layer.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={layer.opacity}
                        onChange={(e) => onUpdateCustomLayerOpacity(layer.id, parseFloat(e.target.value))}
                        className="w-full h-1 bg-[#18231e] rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {customLayers.length === 0 && !showAddForm && (
          <p className="text-[10px] text-slate-500 text-center py-2 bg-black/5 rounded-xl border border-dashed border-white/5">
            No tienes capas personalizadas añadidas. ¡Pulsa el botón `+` para añadir servidores XYZ o WMS!
          </p>
        )}
      </div>
    </div>
  );
}
