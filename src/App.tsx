import { useState, useCallback, useMemo } from "react";
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
    tracks,
    activeTrackId,
    setActiveTrackId,
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
    
    // Multi-track operations
    createNewTrack,
    deleteTrack,
    toggleTrackVisibility,
    setTrackColor,
    mergeTracks,
    splitTrack,

    // Waypoint Groups / Challenges
    waypointGroups,
    addWaypointGroup,
    deleteWaypointGroup,
    toggleWaypointGroupVisibility,
    toggleWaypointCompleted,
  } = useRoutePlanner();

  // App settings states
  const [activeBaseLayer, setActiveBaseLayer] = useState<BaseLayerId>("opentopo");
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.4);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [useImperial, setUseImperial] = useState<boolean>(false);

  // Synchronization and Viewport states
  const [hoverPoint, setHoverPoint] = useState<RoutePoint | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false); // Split route mode
  const [mapCenter, setMapCenter] = useState<[number, number] | null>([43.1906, -4.8322]);
  const [osmPois, setOsmPois] = useState<any[]>([]);

  // Waypoint Modal States
  const [isWptModalOpen, setIsWptModalOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [newWptCoords, setNewWptCoords] = useState<[number, number] | null>(null);

  // Derive all visible waypoints across all visible tracks in the library
  const visibleWaypoints = useMemo(() => {
    const list: Waypoint[] = [];
    const groupVisibilityMap = new Map(waypointGroups.map((g) => [g.id, g.visible]));

    tracks.forEach((t) => {
      if (t.visible) {
        t.waypoints.forEach((w) => {
          const groupId = w.groupId || "default";
          const isGroupVisible = groupVisibilityMap.get(groupId) !== false; // Default to true if not found

          if (isGroupVisible) {
            list.push({
              ...w,
              color: w.color || t.color, // Fallback to track color if none set
            });
          }
        });
      }
    });
    return list;
  }, [tracks, waypointGroups]);

  // Handle unit switching
  const handleToggleUnits = useCallback(() => {
    setUseImperial((prev) => !prev);
  }, []);

  // Trigger search fly-to
  const handleFlyToCoords = useCallback((lat: number, lng: number) => {
    setFlyToCoords([lat, lng]);
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

  // Handle pre-filling waypoint modal from an OSM POI template
  const handleAddOsmPoi = useCallback((poi: any) => {
    const templateWaypoint: Waypoint = {
      id: `temp-${Date.now()}`,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      icon: poi.icon || "mountain",
      note: poi.note || `Altitud: ${poi.elevation ? `${poi.elevation}m` : "No disponible"}`,
      color: poi.color || "#10b981",
      groupId: "default",
      completed: false,
    };
    setEditingWaypoint(templateWaypoint);
    setNewWptCoords(null);
    setIsWptModalOpen(true);
  }, []);

  // Save Waypoint (new, edited, or template imported)
  const handleSaveWaypoint = useCallback(
    (data: { name: string; icon: string; note: string; color: string; groupId: string; completed: boolean }) => {
      if (editingWaypoint && !editingWaypoint.id.startsWith("temp-")) {
        updateWaypoint(editingWaypoint.id, data);
      } else {
        const coords = editingWaypoint?.id.startsWith("temp-")
          ? ([editingWaypoint.lat, editingWaypoint.lng] as [number, number])
          : newWptCoords;

        if (coords) {
          addWaypoint({
            name: data.name,
            lat: coords[0],
            lng: coords[1],
            icon: data.icon,
            note: data.note,
            color: data.color,
            groupId: data.groupId,
            completed: data.completed,
          });
        }
      }
      setEditingWaypoint(null);
      setNewWptCoords(null);
    },
    [editingWaypoint, newWptCoords, addWaypoint, updateWaypoint]
  );

  // Handle vertex click splitting action
  const handleSplitTrackAt = useCallback((trackId: string, index: number) => {
    splitTrack(trackId, index);
    setIsSplitting(false); // turn off split mode after cutting
  }, [splitTrack]);

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-[#070a08] select-none">
      {/* Sidebar Panel */}
      <Sidebar
        routeName={routeName}
        setRouteName={setRouteName}
        points={points}
        waypoints={visibleWaypoints} // Pass all visible waypoints to display in tab
        tracks={tracks}
        activeTrackId={activeTrackId}
        setActiveTrackId={setActiveTrackId}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        isSplitting={isSplitting}
        setIsSplitting={setIsSplitting}
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
        onCreateNewTrack={createNewTrack}
        onDeleteTrack={deleteTrack}
        onToggleTrackVisibility={toggleTrackVisibility}
        onSetTrackColor={setTrackColor}
        onMergeTracks={mergeTracks}
        activeBaseLayer={activeBaseLayer}
        onChangeBaseLayer={setActiveBaseLayer}
        overlayOpacity={overlayOpacity}
        onChangeOverlayOpacity={setOverlayOpacity}
        showContours={showContours}
        onToggleContours={() => setShowContours(!showContours)}
        useImperial={useImperial}
        onToggleUnits={handleToggleUnits}
        waypointGroups={waypointGroups}
        onAddWaypointGroup={addWaypointGroup}
        onDeleteWaypointGroup={deleteWaypointGroup}
        onToggleWaypointGroupVisibility={toggleWaypointGroupVisibility}
        onToggleWaypointCompleted={toggleWaypointCompleted}
        mapCenter={mapCenter}
        osmPois={osmPois}
        onSetOsmPois={setOsmPois}
        onAddOsmPoi={handleAddOsmPoi}
        onAddWaypoint={addWaypoint}
      />

      {/* Main Map Viewport & Collapsible Elevation Chart */}
      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        <div className="flex-1 min-h-0 relative">
          <MapContainer
            tracks={tracks}
            activeTrackId={activeTrackId}
            isDrawing={isDrawing}
            isSplitting={isSplitting}
            activeBaseLayer={activeBaseLayer}
            overlayOpacity={overlayOpacity}
            showContours={showContours}
            hoverPoint={hoverPoint}
            flyToCoords={flyToCoords}
            onAddPoint={addPoint}
            onRightClickMap={handleRightClickMap}
            onEditWaypoint={handleEditWaypoint}
            onSplitTrackAt={handleSplitTrackAt}
            waypointGroups={waypointGroups}
            onMapMove={useCallback((lat: number, lng: number) => setMapCenter([lat, lng]), [])}
            osmPois={osmPois}
            onAddOsmPoi={handleAddOsmPoi}
          />
        </div>

        {/* Collapsible Elevation Chart */}
        {points.length > 0 && (
          <div className="absolute bottom-5 right-5 left-5 md:left-auto md:w-[600px] z-[2000] flex flex-col pointer-events-auto transition-transform duration-300">
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

      {/* Waypoint Modal */}
      <WaypointModal
        isOpen={isWptModalOpen}
        onClose={() => setIsWptModalOpen(false)}
        onSave={handleSaveWaypoint}
        groups={waypointGroups}
        initialData={
          editingWaypoint
            ? {
                name: editingWaypoint.name,
                icon: editingWaypoint.icon,
                note: editingWaypoint.note,
                color: editingWaypoint.color,
                groupId: editingWaypoint.groupId,
                completed: editingWaypoint.completed,
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
