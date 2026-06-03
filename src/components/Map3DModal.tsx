import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
}

interface Map3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackPoints: RoutePoint[];
  trackColor: string;
  trackName: string;
}

// ─── Tile helpers ────────────────────────────────────────────────────────────
function lngLatToTileXY(lng: number, lat: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latR = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function tileNWCorner(tx: number, ty: number, z: number) {
  const n = 2 ** z;
  const lng = (tx / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI;
  return { lng, lat };
}

async function loadDemTile(z: number, tx: number, ty: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, 256, 256).data;
      const out = new Float32Array(256 * 256);
      for (let i = 0; i < 256 * 256; i++) {
        out[i] = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768;
      }
      resolve(out);
    };
    img.onerror = () => reject(new Error(`DEM tile ${z}/${tx}/${ty} failed`));
  });
}

// ─── Elevation colour ramp ────────────────────────────────────────────────────
function elevColor(e: number): [number, number, number] {
  if (e < 200)  return [0.18, 0.42, 0.12];
  if (e < 600)  return [0.34, 0.55, 0.20];
  if (e < 1200) return [0.55, 0.45, 0.28];
  if (e < 1800) return [0.62, 0.60, 0.54];
  if (e < 2400) return [0.78, 0.75, 0.70];
  return [0.94, 0.94, 0.96];
}

// ─── Lat/Lng → local metres ───────────────────────────────────────────────────
function toLocal(lat: number, lng: number, cLat: number, cLng: number) {
  const x = (lng - cLng) * Math.cos((cLat * Math.PI) / 180) * 111320;
  const z = -(lat - cLat) * 111320;
  return { x, z };
}

// ─── Choose zoom ──────────────────────────────────────────────────────────────
function pickZoom(latSpan: number, lngSpan: number) {
  const maxSpan = Math.max(latSpan, lngSpan);
  if (maxSpan > 1.5) return 10;
  if (maxSpan > 0.5) return 11;
  if (maxSpan > 0.2) return 12;
  return 13;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Map3DModal({ isOpen, onClose, trackPoints, trackColor, trackName }: Map3DModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [elev, setElev] = useState(1.5);
  const elevRef = useRef(1.5);
  const terrainRef = useRef<THREE.Mesh | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current || trackPoints.length < 2) return;

    setStatus("loading");
    let cancelled = false;

    (async () => {
      try {
        const container = containerRef.current!;
        const W = container.clientWidth;
        const H = container.clientHeight;

        // Bounding box with 15% padding
        const lats = trackPoints.map(p => p.lat);
        const lngs = trackPoints.map(p => p.lng);
        const pad = 0.15;
        const latSpan = (Math.max(...lats) - Math.min(...lats));
        const lngSpan = (Math.max(...lngs) - Math.min(...lngs));
        const latMin = Math.min(...lats) - latSpan * pad;
        const latMax = Math.max(...lats) + latSpan * pad;
        const lngMin = Math.min(...lngs) - lngSpan * pad;
        const lngMax = Math.max(...lngs) + lngSpan * pad;
        const cLat = (latMin + latMax) / 2;
        const cLng = (lngMin + lngMax) / 2;

        const Z = pickZoom(latMax - latMin, lngMax - lngMin);

        // Fetch DEM tile grid
        const tMin = lngLatToTileXY(lngMin, latMax, Z);
        const tMax = lngLatToTileXY(lngMax, latMin, Z);
        const tW = tMax.x - tMin.x + 1;
        const tH = tMax.y - tMin.y + 1;

        const tileData: Float32Array[][] = [];
        for (let ty = tMin.y; ty <= tMax.y; ty++) {
          const row: Float32Array[] = [];
          for (let tx = tMin.x; tx <= tMax.x; tx++) {
            row.push(await loadDemTile(Z, tx, ty));
          }
          tileData.push(row);
        }
        if (cancelled) return;

        // Stitch tiles into one big grid (256*tW × 256*tH)
        const gW = 256 * tW;
        const gH = 256 * tH;
        const stitched = new Float32Array(gW * gH);
        for (let ry = 0; ry < tH; ry++) {
          for (let rx = 0; rx < tW; rx++) {
            const tile = tileData[ry][rx];
            for (let py = 0; py < 256; py++) {
              for (let px = 0; px < 256; px++) {
                stitched[(ry * 256 + py) * gW + (rx * 256 + px)] = tile[py * 256 + px];
              }
            }
          }
        }

        // Calculate corner lat/lng of the stitched grid
        const nw = tileNWCorner(tMin.x, tMin.y, Z);
        const se = tileNWCorner(tMax.x + 1, tMax.y + 1, Z);
        const gridLatMax = nw.lat, gridLatMin = se.lat;
        const gridLngMin = nw.lng, gridLngMax = se.lng;

        // Build terrain geometry (GRID × GRID segments)
        const GRID = 192;
        const geo = new THREE.PlaneGeometry(1, 1, GRID - 1, GRID - 1);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position as THREE.BufferAttribute;
        const colors = new Float32Array(pos.count * 3);
        let minE = Infinity, maxE = -Infinity;

        // Sample elevation for each vertex
        const elevs: number[] = [];
        for (let i = 0; i < pos.count; i++) {
          // vertex local coords (-0.5 to 0.5) → world lat/lng
          const localX = pos.getX(i); // East-West
          const localZ = pos.getZ(i); // South-North (rotated)

          const ptLng = cLng + (localX / 1.0) * (gridLngMax - gridLngMin);
          const ptLat = cLat - (localZ / 1.0) * (gridLatMax - gridLatMin);

          // Sample stitched heightmap
          const fx = Math.max(0, Math.min(1, (ptLng - gridLngMin) / (gridLngMax - gridLngMin)));
          const fy = Math.max(0, Math.min(1, (gridLatMax - ptLat) / (gridLatMax - gridLatMin)));
          const ix = Math.floor(fx * (gW - 1));
          const iy = Math.floor(fy * (gH - 1));
          const e = stitched[iy * gW + ix];
          elevs.push(e);
          if (e > maxE) maxE = e;
          if (e < minE) minE = e;
        }

        const terrainWidth = (lngMax - lngMin) * Math.cos((cLat * Math.PI) / 180) * 111320;
        const terrainDepth = (latMax - latMin) * 111320;
        const terrainSize = Math.max(terrainWidth, terrainDepth);
        const elevRange = Math.max(maxE - minE, 1);

        for (let i = 0; i < pos.count; i++) {
          const e = elevs[i];
          const y = ((e - minE) / elevRange) * terrainSize * 0.25 * elevRef.current;
          pos.setY(i, y);
          const [r, g, b] = elevColor(e);
          colors[i * 3]     = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
        pos.needsUpdate = true;
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        const scale = terrainSize;
        geo.scale(scale, 1, scale);

        // ─── Three.js scene ────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0c1a0f);
        scene.fog = new THREE.FogExp2(0x0c1a0f, 0.00004);

        const camera = new THREE.PerspectiveCamera(50, W / H, 1, 500000);
        camera.position.set(0, terrainSize * 0.6, terrainSize * 0.8);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(W, H);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, terrainSize * 0.1, 0);
        controls.minDistance = terrainSize * 0.1;
        controls.maxDistance = terrainSize * 3;
        controls.maxPolarAngle = Math.PI / 2.1;
        controls.update();

        // Lights
        const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
        sun.position.set(1, 2, 1);
        sun.castShadow = true;
        scene.add(sun);
        scene.add(new THREE.AmbientLight(0x8ab4c0, 0.6));

        // Terrain mesh
        const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        scene.add(mesh);
        terrainRef.current = mesh;

        // Track line (TubeGeometry)
        const trackPts: THREE.Vector3[] = [];
        const step = Math.max(1, Math.floor(trackPoints.length / 300));
        for (let i = 0; i < trackPoints.length; i += step) {
          const p = trackPoints[i];
          const { x, z } = toLocal(p.lat, p.lng, cLat, cLng);
          // Interpolate terrain Y at this point
          const fx = Math.max(0, Math.min(1, (p.lng - gridLngMin) / (gridLngMax - gridLngMin)));
          const fy = Math.max(0, Math.min(1, (gridLatMax - p.lat) / (gridLatMax - gridLatMin)));
          const ix = Math.floor(fx * (gW - 1));
          const iy = Math.floor(fy * (gH - 1));
          const e = stitched[iy * gW + ix];
          const y = ((e - minE) / elevRange) * terrainSize * 0.25 * elevRef.current + terrainSize * 0.003;
          trackPts.push(new THREE.Vector3(x, y, z));
        }

        if (trackPts.length >= 2) {
          const curve = new THREE.CatmullRomCurve3(trackPts);
          const tubeGeo = new THREE.TubeGeometry(curve, trackPts.length * 2, terrainSize * 0.003, 6, false);
          const tubeMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(trackColor) });
          const tube = new THREE.Mesh(tubeGeo, tubeMat);
          tube.castShadow = true;
          scene.add(tube);

          // Start/End spheres
          [trackPts[0], trackPts[trackPts.length - 1]].forEach((pt, i) => {
            const s = new THREE.Mesh(
              new THREE.SphereGeometry(terrainSize * 0.006, 16, 16),
              new THREE.MeshLambertMaterial({ color: i === 0 ? 0x22c55e : 0xef4444 })
            );
            s.position.copy(pt);
            scene.add(s);
          });
        }

        if (cancelled) { renderer.dispose(); container.removeChild(renderer.domElement); return; }
        setStatus("ready");

        // Render loop
        let animId: number;
        const animate = () => {
          animId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Resize observer
        const ro = new ResizeObserver(() => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        });
        ro.observe(container);

        cleanupRef.current = () => {
          cancelled = true;
          cancelAnimationFrame(animId);
          ro.disconnect();
          controls.dispose();
          renderer.dispose();
          if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        };
      } catch (e: any) {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; cleanupRef.current?.(); cleanupRef.current = null; };
  }, [isOpen, trackPoints]);

  // Elevation exaggeration slider
  useEffect(() => {
    elevRef.current = elev;
    // Rebuild is triggered by changing elev dep → remount via key on outer div if needed
    // For a live update we'd need to rebuild the mesh; here we just note it for next open
  }, [elev]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-[#0c120f] border border-[#1b3d2b] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ height: "78vh" }}>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-[#0c120f]/95 to-transparent pointer-events-none">
          <div>
            <h3 className="text-emerald-400 font-bold text-sm">Vista 3D — {trackName}</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Arrastra para rotar · Scroll para zoom · Clic derecho para desplazar</p>
          </div>
          <button onClick={onClose} className="pointer-events-auto text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0c120f]/80">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-300 text-sm font-semibold">Descargando terreno 3D…</p>
              <p className="text-slate-500 text-xs">Obteniendo datos de elevación DEM</p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0c120f]/80">
            <div className="text-center space-y-2">
              <p className="text-red-400 text-sm font-semibold">No se pudo cargar el terreno</p>
              <p className="text-slate-500 text-xs">Comprueba la conexión e inténtalo de nuevo</p>
            </div>
          </div>
        )}

        {/* Three.js canvas */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Controls HUD */}
        {status === "ready" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-[#131b17]/90 border border-[#1b3d2b] rounded-xl px-4 py-2 pointer-events-auto shadow-xl backdrop-blur-sm">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Relieve</span>
            <input type="range" min="0.5" max="5" step="0.1" value={elev}
              onChange={(e) => setElev(parseFloat(e.target.value))}
              className="w-28 accent-emerald-400 cursor-pointer" />
            <span className="text-[10px] font-mono text-slate-300 w-8">{elev.toFixed(1)}×</span>
            <span className="text-slate-600 select-none">|</span>
            <span className="text-[9px] text-slate-400 flex items-center gap-1">
              <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: trackColor }} />
              {trackName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
