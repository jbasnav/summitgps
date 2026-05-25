import { useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { MapContainer } from "./components/MapContainer";
import { ElevationProfile } from "./components/ElevationProfile";
import { WaypointModal } from "./components/WaypointModal";
import { useRoutePlanner, type Waypoint, type RoutePoint } from "./hooks/useRoutePlanner";
import type { BaseLayerId } from "./components/LayerSelector";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function App() {
  const {
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
    addPoint,
    removeLastPoint,
    clearRoute,
    importRouteData,
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
  } = useRoutePlanner();

  // App settings states
  const [activeBaseLayer, setActiveBaseLayer] = useState<BaseLayerId>("opentopo"); // Default to OpenTopoMap (Gaia Topo clone)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.4);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [useImperial, setUseImperial] = useState<boolean>(false);

  // Synchronization and Viewport states
  const [hoverPoint, setHoverPoint] = useState<RoutePoint | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);

  // Waypoint Modal States
  const [isWptModalOpen, setIsWptModalOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [newWptCoords, setNewWptCoords] = useState<[number, number] | null>(null);

  // Handle unit switching
  const handleToggleUnits = useCallback(() => {
    setUseImperial((prev) => !prev);
  }, []);

  // Trigger search fly-to
  const handleFlyToCoords = useCallback((lat: number, lng: number) => {
    setFlyToCoords([lat, lng]);
    // Clear after flying to let future clicks re-trigger if same coordinate is selected
    setTimeout(() => setFlyToCoords(null), 1600);
  }, []);

  // Handle right-click on map to drop waypoint
  const handleRightClickMap = useCallback((lat: number, lng: number) => {
    setNewWptCoords([lat, lng]);
    setEditingWaypoint(null);
    setIsWptModalOpen(true);
  }, []);

  // Handle clicking a waypoint on map to edit it
  const handleEditWaypoint = useCallback((wpt: Waypoint) => {
    setEditingWaypoint(wpt);
    setNewWptCoords(null);
    setIsWptModalOpen(true);
  }, []);

  // Save Waypoint (new or edited)
  const handleSaveWaypoint = useCallback(
    (data: { name: string; icon: string; note: string; color: string }) => {
      if (editingWaypoint) {
        updateWaypoint(editingWaypoint.id, data);
      } else if (newWptCoords) {
        addWaypoint({
          name: data.name,
          lat: newWptCoords[0],
          lng: newWptCoords[1],
          icon: data.icon,
          note: data.note,
          color: data.color,
        });
      }
      // Reset coordinates & states
      setEditingWaypoint(null);
      setNewWptCoords(null);
    },
    [editingWaypoint, newWptCoords, addWaypoint, updateWaypoint]
  );

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-[#070a08] select-none">
      {/* Sidebar Panel */}
      <Sidebar
        routeName={routeName}
        setRouteName={setRouteName}
        points={points}
        waypoints={waypoints}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        snapToTrail={snapToTrail}
        setSnapToTrail={setSnapToTrail}
        distance={distance}
        ascent={ascent}
        descent={descent}
        loading={loading}
        onClearRoute={clearRoute}
        onUndoPoint={removeLastPoint}
        onImportRoute={importRouteData}
        onFlyToCoords={handleFlyToCoords}
        onDeleteWaypoint={removeWaypoint}
        onEditWaypoint={handleEditWaypoint}
        activeBaseLayer={activeBaseLayer}
        onChangeBaseLayer={setActiveBaseLayer}
        overlayOpacity={overlayOpacity}
        onChangeOverlayOpacity={setOverlayOpacity}
        showContours={showContours}
        onToggleContours={() => setShowContours(!showContours)}
        useImperial={useImperial}
        onToggleUnits={handleToggleUnits}
      />

      {/* Main Map Viewport & Collapsible Elevation Chart */}
      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        {/* Full-Screen Map Container */}
        <div className="flex-1 min-h-0 relative">
          <MapContainer
            points={points}
            waypoints={waypoints}
            isDrawing={isDrawing}
            activeBaseLayer={activeBaseLayer}
            overlayOpacity={overlayOpacity}
            showContours={showContours}
            hoverPoint={hoverPoint}
            flyToCoords={flyToCoords}
            onAddPoint={addPoint}
            onRightClickMap={handleRightClickMap}
            onEditWaypoint={handleEditWaypoint}
          />
        </div>

        {/* Collapsible Elevation Chart (renders only if route has points) */}
        {points.length > 0 && (
          <div className="absolute bottom-5 right-5 left-5 md:left-auto md:w-[600px] z-[2000] flex flex-col pointer-events-auto transition-transform duration-300">
            {/* Collapse toggle bar */}
            <button
              onClick={() => setIsChartCollapsed(!isChartCollapsed)}
              className="self-end px-3 py-1 bg-[#131b17]/95 border border-[#1b3d2b] border-b-0 rounded-t-xl text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 text-[10px] font-bold shadow-lg"
            >
              {isChartCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Mostrar Elevación
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Ocultar Elevación
                </>
              )}
            </button>

            {/* Profile body */}
            <div
              className={`transition-all duration-300 ${
                isChartCollapsed ? "h-0 opacity-0 pointer-events-none" : "h-[200px] opacity-100"
              }`}
            >
              <ElevationProfile
                points={points}
                useImperial={useImperial}
                onHoverPoint={setHoverPoint}
              />
            </div>
          </div>
        )}
      </div>

      {/* Waypoint Input/Editor Modal */}
      <WaypointModal
        isOpen={isWptModalOpen}
        onClose={() => setIsWptModalOpen(false)}
        onSave={handleSaveWaypoint}
        initialData={
          editingWaypoint
            ? {
                name: editingWaypoint.name,
                icon: editingWaypoint.icon,
                note: editingWaypoint.note,
                color: editingWaypoint.color,
              }
            : undefined
        }
        onDelete={
          editingWaypoint
            ? () => {
                removeWaypoint(editingWaypoint.id);
                setIsWptModalOpen(false);
              }
            : undefined
        }
      />
    </div>
  );
}
