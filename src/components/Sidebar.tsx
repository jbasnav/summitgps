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
  ChevronLeft,
  ChevronRight,
  Loader,
  Tent,
  Camera,
  AlertTriangle,
  Info,
  Droplet,
  Eye,
  EyeOff,
  Plus,
  Scissors,
  Link,
  Edit2,
  Folder,
  FolderOpen,
  Trophy,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { LayerSelector, type BaseLayerId } from "./LayerSelector";
import { StatsPanel } from "./StatsPanel";
import { parseGPX, exportToGPX } from "../utils/gpxExporter";
import type { Track } from "../hooks/useRoutePlanner";

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
  
  // Multi-track additions
  onCreateNewTrack: (name?: string) => string;
  onDeleteTrack: (id: string) => void;
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

  // Waypoint Groups / Challenges Props
  waypointGroups: any[];
  onAddWaypointGroup: (group: { name: string; description: string; color: string; visible: boolean }) => void;
  onDeleteWaypointGroup: (id: string) => void;
  onToggleWaypointGroupVisibility: (id: string) => void;
  onToggleWaypointCompleted: (id: string) => void;
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
  onCreateNewTrack,
  onDeleteTrack,
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
  onToggleWaypointGroupVisibility,
  onToggleWaypointCompleted,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("route");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Track Library selection state for merging
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);

  // Waypoint Groups / Challenges state
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>("default");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#10b981");
  
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
    e.target.value = "";
  };

  // GPX Export (Exports the currently active track)
  const handleGpxExport = () => {
    const activeTrack = tracks.find((t) => t.id === activeTrackId);
    if (!activeTrack) {
      alert("Por favor, selecciona un track activo de la biblioteca para exportar.");
      return;
    }

    if (activeTrack.points.length === 0 && activeTrack.waypoints.length === 0) {
      alert("No hay ruta ni waypoints en el track activo para exportar.");
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
  const handleMergeSelected = () => {
    if (selectedMergeIds.length < 2) {
      alert("Por favor, selecciona al menos 2 tracks de la biblioteca para unirlos.");
      return;
    }
    const name = window.prompt("Introduce el nombre de la ruta fusionada:", "Ruta Combinada");
    if (name === null) return; // cancelled
    onMergeTracks(selectedMergeIds, name || undefined);
    setSelectedMergeIds([]); // clear selection
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
            <img src="/favicon.svg" alt="SUMMIT GPS Logo" className="w-8 h-8 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.25)] select-none pointer-events-none" />
            <div>
              <h1 className="text-sm font-extrabold tracking-wider text-emerald-400">
                SUMMIT GPS
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                Outdoor Planner
              </p>
            </div>
          </div>

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
            { id: "route" as TabId, label: "Rutas", icon: Route },
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
          {/* TAB: ROUTE (MULTIPLES RUTAS) */}
          {activeTab === "route" && (
            <div className="space-y-5 animate-fade-in">
              
              {/* SECTION 1: LIBRARY OF TRACKS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Biblioteca de Tracks ({tracks.length})
                  </h4>
                  {selectedMergeIds.length >= 2 && (
                    <button
                      onClick={handleMergeSelected}
                      className="text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-blue-500/30"
                    >
                      <Link className="w-3 h-3" />
                      Unir Seleccionados
                    </button>
                  )}
                </div>

                {tracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-[#1b3d2b]/40 rounded-xl text-center space-y-2 bg-[#0c120f]/50">
                    <Route className="w-5 h-5 text-slate-600" />
                    <span className="text-[11px] font-semibold text-slate-400">Biblioteca Vacía</span>
                    <p className="text-[9px] text-slate-500">
                      Importa un archivo GPX o inicia una nueva ruta para guardarla aquí.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {tracks.map((track) => {
                      const isActive = track.id === activeTrackId;
                      const isCheckedForMerge = selectedMergeIds.includes(track.id);
                      return (
                        <div
                          key={track.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            isActive
                              ? "bg-emerald-500/[0.04] border-emerald-400/50"
                              : "bg-[#0b100d] border-white/5 hover:border-white/10"
                          }`}
                        >
                          {/* Left contents: checkbox for merge, color dot, visibility icon */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Merge checkbox */}
                            <input
                              type="checkbox"
                              checked={isCheckedForMerge}
                              onChange={() => handleToggleMergeSelect(track.id)}
                              title="Seleccionar para unir tracks"
                              className="w-3.5 h-3.5 accent-emerald-400 bg-black rounded border-[#1b3d2b] cursor-pointer"
                            />

                            {/* Color Selector (circular cycle color) */}
                            <button
                              onClick={() => handleCycleColor(track.id, track.color)}
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 transition-transform active:scale-95"
                              style={{ backgroundColor: track.color }}
                              title="Hacer clic para cambiar color"
                            />

                            {/* Visibility Eye icon */}
                            <button
                              onClick={() => onToggleTrackVisibility(track.id)}
                              className="text-slate-400 hover:text-slate-200 transition-colors"
                              title={track.visible ? "Ocultar en mapa" : "Mostrar en mapa"}
                            >
                              {track.visible ? (
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                              )}
                            </button>

                            {/* Track Name */}
                            <span
                              onClick={() => setActiveTrackId(track.id)}
                              className={`truncate cursor-pointer hover:underline ${
                                isActive ? "font-bold text-emerald-300" : "text-slate-300"
                              }`}
                            >
                              {track.name}
                            </span>
                          </div>

                          {/* Right actions: pencil (activate edit) and trash */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Edit Pencil icon */}
                            <button
                              onClick={() => {
                                setActiveTrackId(track.id);
                                if (track.points.length > 0) {
                                  // Auto focus map to the track
                                  onFlyToCoords(track.points[0].lat, track.points[0].lng);
                                }
                              }}
                              className={`p-1 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                              }`}
                              title="Habilitar edición de esta ruta"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            {/* Delete icon */}
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(`¿Seguro que deseas eliminar la ruta "${track.name}" de la biblioteca?`)
                                ) {
                                  onDeleteTrack(track.id);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors"
                              title="Eliminar de la biblioteca"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ACTION TOOLBAR */}
              <div className="border-t border-[#1b3d2b]/40 pt-4 flex gap-2">
                <button
                  onClick={() => {
                    const name = window.prompt("Introduce el nombre de la nueva ruta:", "Nueva Ruta");
                    if (name) onCreateNewTrack(name);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.08] text-emerald-300 hover:text-emerald-200 transition-colors text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Ruta
                </button>
              </div>

              {/* SECTION 2: EDITING CONTROLS FOR ACTIVE ROUTE */}
              {activeTrackId ? (
                <div className="border-t border-[#1b3d2b]/40 pt-4 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Ruta Activa Seleccionada
                    </h4>
                    <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      ACTIVA
                    </span>
                  </div>

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

                  {/* Drawing Actions */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsDrawing(!isDrawing);
                          if (isSplitting) setIsSplitting(false); // turn off split mode
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

                    {/* Snap to trail */}
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

                  {/* Route metrics display */}
                  {points.length > 0 && (
                    <div className="space-y-4">
                      <StatsPanel
                        distance={distance}
                        ascent={ascent}
                        descent={descent}
                        useImperial={useImperial}
                      />
                      
                      <button
                        onClick={() => {
                          if (window.confirm("¿Seguro que deseas borrar todos los puntos de la ruta activa?")) {
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

                  {/* GPX Export / Download active track */}
                  <button
                    onClick={handleGpxExport}
                    disabled={points.length === 0 && waypoints.length === 0}
                    className="w-full py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0a0f0d] hover:bg-[#0f1612] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0a0f0d] disabled:hover:text-slate-400 text-slate-300 hover:text-emerald-400 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Exportar GPX (Track Activo)
                  </button>
                </div>
              ) : (
                <div className="border-t border-[#1b3d2b]/40 pt-5 text-center p-4 rounded-xl bg-[#0c120f]/50 border border-[#1b3d2b]/20">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Selecciona una ruta en el lápiz 📝 o crea una "Nueva Ruta" para ver sus métricas, iniciar dibujo o exportarla a GPX.
                  </p>
                </div>
              )}

              {/* Import GPX Upload Widget (Always Visible) */}
              <div className="border-t border-[#1b3d2b]/40 pt-4">
                <label className="w-full py-2.5 rounded-xl border border-[#1b3d2b] bg-[#0c120f] hover:bg-[#0f1612] text-slate-300 hover:text-emerald-400 cursor-pointer transition-all text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Importar y Añadir GPX
                  <input
                    type="file"
                    accept=".gpx"
                    onChange={handleGpxUpload}
                    className="hidden"
                  />
                </label>
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

          {/* TAB: WAYPOINTS (WAYPOINT GROUPS & CHALLENGES) */}
          {activeTab === "waypoints" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Grupos de Marcas y Retos ({waypointGroups.length})
                </h4>
                <button
                  onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                  className="flex items-center gap-1 text-[10px] font-bold bg-[#1c2921] border border-[#1b3d2b] text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo Reto
                </button>
              </div>

              {/* CHALLENGE CREATOR FORM */}
              {isCreatingGroup && (
                <div className="bg-[#0c120f]/80 border border-[#1b3d2b] rounded-xl p-4 space-y-3.5 shadow-inner animate-fade-in">
                  <div className="flex items-center justify-between border-b border-[#1b3d2b]/20 pb-2">
                    <span className="text-xs font-bold text-emerald-400">Crear Carpeta / Reto</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingGroup(false)}
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
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
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

                  {/* Form Action */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!newGroupName.trim()) {
                        alert("Por favor, introduce un nombre para el grupo.");
                        return;
                      }
                      onAddWaypointGroup({
                        name: newGroupName.trim(),
                        description: newGroupDesc.trim(),
                        color: newGroupColor,
                        visible: true,
                      });
                      setNewGroupName("");
                      setNewGroupDesc("");
                      setNewGroupColor("#10b981");
                      setIsCreatingGroup(false);
                    }}
                    className="w-full py-2 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-400/10"
                  >
                    Guardar Reto / Carpeta
                  </button>
                </div>
              )}

              {/* LIST OF ACCORDION GROUPS */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {waypointGroups.map((group) => {
                  const isExpanded = expandedGroupId === group.id;
                  
                  // Filter waypoints belonging to this group
                  const groupWaypoints = waypoints.filter((w) => {
                    if (group.id === "default") {
                      return !w.groupId || w.groupId === "default";
                    }
                    return w.groupId === group.id;
                  });

                  const totalCount = groupWaypoints.length;
                  const completedCount = groupWaypoints.filter((w) => w.completed).length;
                  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  const isFullyCompleted = totalCount > 0 && completedCount === totalCount;

                  return (
                    <div
                      key={group.id}
                      className="border border-[#1b3d2b]/40 rounded-xl overflow-hidden bg-[#0c120f]/30"
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        className="flex items-center justify-between p-3 bg-[#0c120f]/60 hover:bg-[#0c120f]/90 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Folder Icon indicating status */}
                          <div
                            className="shrink-0 flex items-center justify-center"
                            style={{ color: group.color }}
                          >
                            {isExpanded ? (
                              <FolderOpen className="w-4 h-4" />
                            ) : (
                              <Folder className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-200 truncate">
                                {group.name}
                              </span>
                              {isFullyCompleted && (
                                <span title="¡Reto completado al 100%!">
                                  <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0 animate-bounce" />
                                </span>
                              )}
                            </div>
                            
                            {/* Short Progress metrics */}
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                              <span>
                                {completedCount} / {totalCount} cimas
                              </span>
                              <span>•</span>
                              <span className={isFullyCompleted ? "text-yellow-400 animate-pulse font-bold" : "text-emerald-400"}>
                                {completionPercent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Visibility & Delete icons */}
                        <div className="flex items-center gap-2.5 shrink-0 pl-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWaypointGroupVisibility(group.id);
                            }}
                            className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
                            title={group.visible ? "Ocultar marcas del reto en el mapa" : "Mostrar marcas del reto en el mapa"}
                          >
                            {group.visible ? (
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </button>

                          {group.id !== "default" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    `¿Seguro que deseas eliminar el reto "${group.name}"? Los waypoints asociados no se borrarán, volverán a "Mis Marcadores".`
                                  )
                                ) {
                                  onDeleteWaypointGroup(group.id);
                                  if (expandedGroupId === group.id) {
                                    setExpandedGroupId("default");
                                  }
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                              title="Eliminar reto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Progress Bar (Fluent and sleek) */}
                      {totalCount > 0 && (
                        <div className="h-1 bg-black/40 w-full relative">
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
                        <div className="p-3 bg-[#0a0f0d]/30 border-t border-[#1b3d2b]/20 space-y-2.5">
                          {/* Group description */}
                          {group.description && (
                            <p className="text-[10px] text-slate-400 leading-relaxed italic bg-[#050807]/30 border-l border-emerald-500/20 pl-2 py-0.5">
                              {group.description}
                            </p>
                          )}

                          {/* Waypoints within this group */}
                          {groupWaypoints.length === 0 ? (
                            <div className="py-4 text-center">
                              <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                                Sin marcas en este reto. Haz clic derecho en el mapa para añadir un waypoint y asígnalo a este reto.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {groupWaypoints.map((wpt) => {
                                const WptIcon = WPT_ICONS[wpt.icon] || MapPin;
                                const isCompleted = !!wpt.completed;
                                return (
                                  <div
                                    key={wpt.id}
                                    onClick={() => onFlyToCoords(wpt.lat, wpt.lng)}
                                    className={`group flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                      isCompleted
                                        ? "bg-emerald-500/[0.01] border-emerald-500/10 hover:border-emerald-500/20"
                                        : "bg-[#0b100d] border-white/5 hover:border-emerald-500/10"
                                    }`}
                                  >
                                    {/* Custom Checkbox for completed status */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleWaypointCompleted(wpt.id);
                                      }}
                                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-all shrink-0 ${
                                        isCompleted
                                          ? "bg-emerald-400 border-emerald-400 text-black hover:bg-emerald-500"
                                          : "border-slate-600 hover:border-emerald-400"
                                      }`}
                                    >
                                      {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                                    </button>

                                    {/* Mini Category Icon */}
                                    <div
                                      className="w-5 h-5 rounded flex items-center justify-center text-slate-900 shrink-0 mt-0.5"
                                      style={{ backgroundColor: wpt.color }}
                                    >
                                      <WptIcon className="w-3.5 h-3.5 text-white" />
                                    </div>

                                    {/* Waypoint details */}
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span
                                          className={`text-xs font-bold truncate group-hover:text-emerald-300 transition-colors ${
                                            isCompleted ? "line-through text-slate-500" : "text-slate-300"
                                          }`}
                                        >
                                          {wpt.name}
                                        </span>

                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onEditWaypoint(wpt);
                                            }}
                                            className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300"
                                          >
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (window.confirm("¿Seguro que deseas eliminar este waypoint?")) {
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
                                        <p className="text-[10px] text-slate-500 line-clamp-1 leading-tight">
                                          {wpt.note}
                                        </p>
                                      )}
                                      <p className="text-[8px] text-slate-600 font-mono">
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
                    </div>
                  );
                })}
              </div>
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
                    placeholder="Ej. Aneto, Picos de Europa..."
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
