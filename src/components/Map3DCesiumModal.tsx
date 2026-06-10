import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
}

interface Map3DCesiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackPoints: RoutePoint[];
  trackColor: string;
  trackName: string;
}

export function Map3DCesiumModal({
  isOpen,
  onClose,
  trackPoints,
  trackColor,
  trackName,
}: Map3DCesiumModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlying, setIsFlying] = useState(false);
  const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    setLoading(true);

    let viewer: Cesium.Viewer;

    (async () => {
      try {
        // Free ArcGIS world terrain (no Ion token required)
        const terrain = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
          "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
        );

        // CesiumJS 1.100+ API: use ImageryLayer.fromProviderAsync to avoid deprecated constructors
        const arcGisLayer = Cesium.ImageryLayer.fromProviderAsync(
          Cesium.ArcGisMapServerImageryProvider.fromUrl(
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
          )
        );

        viewer = new Cesium.Viewer(containerRef.current!, {
          terrainProvider: terrain,
          baseLayer: arcGisLayer, // replaces deprecated imageryProvider option
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          terrainShadows: Cesium.ShadowMode.ENABLED,
        });

        viewerRef.current = viewer;

        // Enable realistic atmosphere and shadows
        viewer.scene.globe.enableLighting = true;
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
        }
        viewer.scene.sun = new Cesium.Sun();
        viewer.scene.globe.depthTestAgainstTerrain = true;

        // Dark sky
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#0c1a10");

        if (trackPoints.length < 2) { setLoading(false); return; }

        // Parse track color
        const color = Cesium.Color.fromCssColorString(trackColor || "#10b981");

        // Build positions (with terrain sampling for accurate clamping)
        const rawPositions = trackPoints.map(p =>
          Cesium.Cartesian3.fromDegrees(p.lng, p.lat, (p.elevation ?? 0) + 5)
        );

        // Track polyline — clamped to terrain
        viewer.entities.add({
          name: trackName,
          polyline: {
            positions: rawPositions,
            width: 5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: color,
            }),
            clampToGround: false, // use elevation from GPX
            arcType: Cesium.ArcType.GEODESIC,
          },
        });

        // Shadow/outline below the track
        viewer.entities.add({
          polyline: {
            positions: rawPositions,
            width: 2,
            material: Cesium.Color.BLACK.withAlpha(0.3),
            clampToGround: true,
            arcType: Cesium.ArcType.GEODESIC,
          },
        });

        // Start marker (green)
        const start = trackPoints[0];
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(start.lng, start.lat, (start.elevation ?? 0) + 10),
          ellipsoid: {
            radii: new Cesium.Cartesian3(30, 30, 30),
            material: Cesium.Color.fromCssColorString("#22c55e"),
          },
          label: {
            text: "▶ Inicio",
            font: "bold 13px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -40),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        // End marker (red)
        const end = trackPoints[trackPoints.length - 1];
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(end.lng, end.lat, (end.elevation ?? 0) + 10),
          ellipsoid: {
            radii: new Cesium.Cartesian3(30, 30, 30),
            material: Cesium.Color.fromCssColorString("#ef4444"),
          },
          label: {
            text: "⏹ Fin",
            font: "bold 13px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -40),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        // Fly to track bounding sphere with a nice tilt
        const lats = trackPoints.map(p => p.lat);
        const lngs = trackPoints.map(p => p.lng);
        const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const spanLat = (Math.max(...lats) - Math.min(...lats)) * 111320;
        const spanLng = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * Math.cos((cLat * Math.PI) / 180);
        const viewRadius = Math.max(spanLat, spanLng) * 1.8;

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(cLng, cLat - 0.02, viewRadius * 0.7),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-40),
            roll: 0,
          },
          duration: 2,
          complete: () => setLoading(false),
        });
      } catch (e) {
        console.error("Cesium init error:", e);
        setLoading(false);
      }
    })();

    return () => {
      if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [isOpen]);

  // Fly along track animation
  const flyAlongTrack = () => {
    const viewer = viewerRef.current;
    if (!viewer || trackPoints.length < 2) return;
    setIsFlying(true);

    let i = 0;
    const step = Math.max(1, Math.floor(trackPoints.length / 80));

    const next = () => {
      if (!viewerRef.current || i >= trackPoints.length - 1) { setIsFlying(false); return; }
      const p = trackPoints[i];
      const pNext = trackPoints[Math.min(i + step, trackPoints.length - 1)];
      const heading = Math.atan2(pNext.lng - p.lng, pNext.lat - p.lat);

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, (p.elevation ?? 0) + 200),
        orientation: {
          heading,
          pitch: Cesium.Math.toRadians(-20),
          roll: 0,
        },
        duration: 0.8,
        complete: () => { i += step; flyTimerRef.current = setTimeout(next, 50); },
      });
    };
    next();
  };

  const stopFly = () => {
    if (flyTimerRef.current) { clearTimeout(flyTimerRef.current); flyTimerRef.current = null; }
    setIsFlying(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-6xl bg-[#0c120f] border border-[#1b3d2b] rounded-2xl overflow-hidden shadow-2xl"
        style={{ height: "82vh" }}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-[#0c120f]/95 to-transparent pointer-events-none">
          <div>
            <h3 className="text-emerald-400 font-bold text-sm flex items-center gap-2">
              <span>🌍</span> Vista 3D — {trackName}
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5">
              Clic izq. para rotar · Scroll para zoom · Clic der. para desplazar
            </p>
          </div>
          <button
            onClick={onClose}
            className="pointer-events-auto text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0c120f]/80">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-300 text-sm font-semibold">Cargando terreno 3D…</p>
              <p className="text-slate-500 text-xs">CesiumJS · ArcGIS World Terrain</p>
            </div>
          </div>
        )}

        {/* Cesium container */}
        <div ref={containerRef} className="w-full h-full" />

        {/* HUD */}
        {!loading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-auto">
            <button
              onClick={isFlying ? stopFly : flyAlongTrack}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl border transition-all ${
                isFlying
                  ? "bg-red-500/90 border-red-400 text-white"
                  : "bg-emerald-500/90 border-emerald-400 text-black"
              }`}
            >
              {isFlying ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Detener Vuelo
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Volar Ruta
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
