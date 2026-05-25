import { useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Loader,
  Tent,
  Camera,
  AlertTriangle,
  Info,
  Droplet,
} from "lucide-react";
import { LayerSelector, type BaseLayerId } from "./LayerSelector";
import { StatsPanel } from "./StatsPanel";
import { parseGPX, exportToGPX } from "../utils/gpxExporter";

interface SidebarProps {
  routeName: string;
  setRouteName: (name: string) => void;
  points: any[];
  waypoints: any[];
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  snapToTrail: boolean;
  setSnapToTrail: (snap: boolean) => void;
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
}

type TabId = "search" | "layers" | "route" | "waypoints";

const WPT_ICONS: Record<string, any> = {
  mountain: MapPin,
  camp: Tent,
  camera: Camera,
  danger: AlertTriangle,
  info: Info,
  water: Droplet,
};

export function Sidebar({
  routeName,
  setRouteName,
  points,
  waypoints,
  isDrawing,
  setIsDrawing,
  snapToTrail,
  setSnapToTrail,
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
  activeBaseLayer,
  onChangeBaseLayer,
  overlayOpacity,
  onChangeOverlayOpacity,
  showContours,
  onToggleContours,
  useImperial,
  onToggleUnits,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("route");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // GPX Import
  const handleGpxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseGPX(text);
        onImportRoute(parsed.routeName, parsed.routePoints, parsed.waypoints);
        
        // Auto zoom to first imported route point or waypoint
        if (parsed.routePoints.length > 0) {
          onFlyToCoords(parsed.routePoints[0].lat, parsed.routePoints[0].lng);
        } else if (parsed.waypoints.length > 0) {
          onFlyToCoords(parsed.waypoints[0].lat, parsed.waypoints[0].lng);
        }
      } catch (err) {
        alert("Error al parsear el archivo GPX: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  };

  // GPX Export
  const handleGpxExport = () => {
    if (points.length === 0 && waypoints.length === 0) {
      alert("No hay ruta ni waypoints para exportar.");
      return;
    }
    const gpxString = exportToGPX(routeName, points, waypoints);
    const blob = new Blob([gpxString], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${routeName.replace(/\s+/g, "_") || "ruta_summit"}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Geocoding Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchResults([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      if (!response.ok) throw new Error("Search service error");
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    onFlyToCoords(lat, lon);
  };

  return (
    <div
      className={`relative z-[9999] h-full flex transition-all duration-300 ${
        isCollapsed ? "w-0" : "w-[380px] max-w-[90vw]"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3.5 transform -translate-y-1/2 w-7 h-12 bg-[#0c120f]/90 hover:bg-[#111a15]/95 border border-[#1b3d2b] rounded-r-xl text-emerald-400 flex items-center justify-center shadow-xl z-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main Sidebar Panel */}
      <div className="w-full h-full bg-[#131b17]/95 border-r border-[#1b3d2b] text-slate-100 flex flex-col overflow-hidden backdrop-blur-md">
        {/* Header / Brand */}
        <div className="p-5 border-b border-[#1b3d2b] flex items-center justify-between bg-[#0c120f]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-[#131b17] font-black tracking-tighter">
              S
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider text-emerald-400">
                SUMMIT GPS
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                Outdoor Planner
              </p>
            </div>
          </div>

          {/* Unit Toggle */}
          <button
            onClick={onToggleUnits}
            className="text-[10px] font-bold px-2 py-1 rounded bg-[#1c2921] border border-[#1b3d2b] text-slate-300 hover:text-emerald-400 transition-colors"
          >
            {useImperial ? "Milla / ft" : "Km / m"}
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 border-b border-[#1b3d2b] bg-[#0c120f]/50">
          {[
            { id: "route" as TabId, label: "Ruta", icon: Route },
            { id: "layers" as TabId, label: "Capas", icon: LayersIcon },
            { id: "waypoints" as TabId, label: "Marcas", icon: MapPin },
            { id: "search" as TabId, label: "Buscar", icon: Search },
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
          {/* TAB: ROUTE */}
          {activeTab === "route" && (
            <div className="space-y-5 animate-fade-in">
              {/* Route Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Nombre de la Ruta
                </label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {/* Drawing Controls */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsDrawing(!isDrawing)}
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
                    {isDrawing ? "Finalizar Dibujo" : "Dibujar Ruta"}
                  </button>

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

                {/* Drawing Helper text */}
                {isDrawing && (
                  <p className="text-[10px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-center animate-pulse">
                    🖱️ Haz clic en el mapa para ir agregando puntos de paso a tu ruta.
                  </p>
                )}

                {/* Snap to trail option */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b100d] border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-200">
                      Ajustar a Senderos
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Ruta inteligente guiada por caminos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSnapToTrail(!snapToTrail)}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      snapToTrail ? "bg-emerald-400 justify-end" : "bg-[#18231e] justify-start"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full shadow-md transform duration-200 ${
                        snapToTrail ? "bg-black" : "bg-slate-400"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Statistics Details */}
              {points.length > 0 && (
                <div className="border-t border-[#1b3d2b]/40 pt-4 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Métricas de la Ruta
                  </h4>
                  <StatsPanel
                    distance={distance}
                    ascent={ascent}
                    descent={descent}
                    useImperial={useImperial}
                  />
                  
                  {/* Clear button */}
                  <button
                    onClick={() => {
                      if (window.confirm("¿Seguro que deseas borrar toda la ruta dibujada?")) {
                        onClearRoute();
                      }
                    }}
                    className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400 bg-red-500/[0.03] hover:bg-red-500/[0.08] transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Borrar Trazado
                  </button>
                </div>
              )}

              {/* GPX Import/Export Actions */}
              <div className="border-t border-[#1b3d2b]/40 pt-5 flex gap-2">
                <label className="flex-1 py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0b100d] hover:bg-[#0f1612] text-slate-300 hover:text-emerald-400 cursor-pointer transition-all text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Importar GPX
                  <input
                    type="file"
                    accept=".gpx"
                    onChange={handleGpxUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleGpxExport}
                  disabled={points.length === 0 && waypoints.length === 0}
                  className="flex-1 py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0b100d] hover:bg-[#0f1612] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0b100d] disabled:hover:text-slate-300 text-slate-300 hover:text-emerald-400 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Exportar GPX
                </button>
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
              />
            </div>
          )}

          {/* TAB: WAYPOINTS */}
          {activeTab === "waypoints" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Tus Puntos de Interés ({waypoints.length})
                </h4>
                <p className="text-[9px] text-slate-500">Haz clic derecho en el mapa para añadir</p>
              </div>

              {waypoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[#1b3d2b]/40 rounded-2xl text-center space-y-2 bg-[#0c120f]/50">
                  <MapPin className="w-6 h-6 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-400">Sin Waypoints</span>
                  <p className="text-[10px] text-slate-500 max-w-xs">
                    Coloca marcadores en el mapa haciendo clic derecho o usa el planificador de rutas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {waypoints.map((wpt) => {
                    const WptIcon = WPT_ICONS[wpt.icon] || MapPin;
                    return (
                      <div
                        key={wpt.id}
                        onClick={() => onFlyToCoords(wpt.lat, wpt.lng)}
                        className="group flex items-start gap-3 p-3 rounded-xl bg-[#0b100d] border border-white/5 hover:border-emerald-500/20 hover:bg-[#0f1612] cursor-pointer transition-all"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-900 shrink-0 mt-0.5"
                          style={{ backgroundColor: wpt.color }}
                        >
                          <WptIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
                              {wpt.name}
                            </span>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditWaypoint(wpt);
                                }}
                                className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300"
                              >
                                Editar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm("¿Deseas eliminar este marcador?")) {
                                    onDeleteWaypoint(wpt.id);
                                  }
                                }}
                                className="text-[9px] font-bold text-red-400 hover:text-red-300"
                              >
                                Borrar
                              </button>
                            </div>
                          </div>
                          {wpt.note && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                              {wpt.note}
                            </p>
                          )}
                          <p className="text-[9px] text-slate-600 font-mono">
                            {wpt.lat.toFixed(5)}, {wpt.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: SEARCH */}
          {activeTab === "search" && (
            <div className="space-y-4 animate-fade-in">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ej. Aneto, Chamonix, Montserrat..."
                    className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 bg-emerald-400 text-[#0c120f] hover:bg-emerald-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Ir
                </button>
              </form>

              {searchLoading && (
                <div className="flex justify-center p-8">
                  <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Resultados encontrados
                  </span>
                  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectSearchResult(result)}
                        className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-[#0b100d] border border-white/5 hover:border-emerald-500/20 hover:bg-[#0f1612] text-left transition-all"
                      >
                        <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-200">
                            {result.display_name.split(",")[0]}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                            {result.display_name.split(",").slice(1).join(",").trim()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
