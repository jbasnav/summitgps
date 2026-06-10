import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from "recharts";
import { X } from "lucide-react";

interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
}

interface TrackProfile {
  id: string;
  name: string;
  color: string;
  points: RoutePoint[];
}

interface CombinedElevationProfileProps {
  tracks: TrackProfile[];
  useImperial?: boolean;
  onClose: () => void;
  onHoverPoint?: (point: any) => void;
  mapInstance?: any;
}

const SAMPLE_POINTS = 300;

const CustomTooltip = ({ active, payload, useImperial }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#131b17]/95 border border-[#1b3d2b] rounded-xl px-3 py-2 shadow-xl text-xs space-y-1 min-w-[140px]">
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            <span className="text-slate-300 truncate max-w-[100px]">{p.name}</span>
          </span>
          <span className="font-bold" style={{ color: p.color }}>
            {useImperial ? `${Math.round(p.value * 3.28084)} ft` : `${Math.round(p.value)} m`}
          </span>
        </div>
      ))}
      <div className="text-slate-500 text-[9px] pt-0.5 border-t border-[#1b3d2b]">
        {useImperial
          ? `${(payload[0]?.payload?.km * 0.621371).toFixed(2)} mi`
          : `${payload[0]?.payload?.km.toFixed(2)} km`}
      </div>
    </div>
  );
};

/** Interpolate elevation at a given km position for a track */
function elevAtKm(points: RoutePoint[], km: number): number | null {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  if (km > last.distance + 0.01) return null; // beyond track end
  if (km <= 0) return points[0].elevation;

  for (let i = 1; i < points.length; i++) {
    if (points[i].distance >= km) {
      const prev = points[i - 1];
      const curr = points[i];
      const span = curr.distance - prev.distance;
      if (span <= 0) return curr.elevation;
      const t = (km - prev.distance) / span;
      return prev.elevation + t * (curr.elevation - prev.elevation);
    }
  }
  return last.elevation;
}

export function CombinedElevationProfile({
  tracks,
  useImperial = false,
  onClose,
  onHoverPoint,
  mapInstance,
}: CombinedElevationProfileProps) {
  const [refLeft, setRefLeft] = useState<number | null>(null);
  const [refRight, setRefRight] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);

  if (tracks.length === 0) return null;

  // Use actual km positions on a shared x-axis from 0 to maxDist
  const maxDist = Math.max(...tracks.map((t) => t.points[t.points.length - 1]?.distance ?? 0));
  const step = maxDist / (SAMPLE_POINTS - 1);

  interface DataRow {
    km: number;
    [key: string]: number | null;
  }

  const data: DataRow[] = Array.from({ length: SAMPLE_POINTS }, (_, i) => {
    const km = i * step;
    const row: DataRow = { km };
    tracks.forEach((t) => {
      row[t.id] = elevAtKm(t.points, km);
    });
    return row;
  });

  const allElevations = tracks.flatMap((t) => t.points.map((p) => p.elevation));
  const minElev = Math.floor(Math.min(...allElevations) / 50) * 50;
  const maxElev = Math.ceil(Math.max(...allElevations) / 50) * 50;

  const elevLabel = (v: number) =>
    useImperial ? `${Math.round(v * 3.28084)} ft` : `${v} m`;
  const distLabel = (v: number) =>
    useImperial ? `${(v * 0.621371).toFixed(1)} mi` : `${v.toFixed(1)} km`;

  // Helper to find closest point in track by distance
  const findClosestPoint = (points: RoutePoint[], km: number): RoutePoint | null => {
    if (points.length === 0) return null;
    let closest = points[0];
    let minDiff = Math.abs(points[0].distance - km);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].distance - km);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }
    return closest;
  };

  // Handle hover synchronization
  const handleMouseMove = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
      const activeIdx = state.activeTooltipIndex;
      const row = data[activeIdx];
      if (row && tracks[0]) {
        const closestPoint = findClosestPoint(tracks[0].points, row.km ?? 0);
        if (closestPoint && onHoverPoint) {
          onHoverPoint(closestPoint);
        }
      }
      if (refLeft !== null) {
        setRefRight(activeIdx);
      }
    }
  };

  const handleMouseLeave = () => {
    if (onHoverPoint) {
      onHoverPoint(null);
    }
    setRefLeft(null);
    setRefRight(null);
  };

  const handleMouseDown = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
      setRefLeft(state.activeTooltipIndex);
      setRefRight(state.activeTooltipIndex);
    }
  };

  const handleZoomToRange = (start: number, end: number) => {
    if (!mapInstance) return;
    const distStart = data[start]?.km;
    const distEnd = data[end]?.km;
    if (distStart === undefined || distStart === null || distEnd === undefined || distEnd === null) return;

    const selectedPoints: { lat: number; lng: number }[] = [];

    tracks.forEach((track) => {
      track.points.forEach((p) => {
        if (p.distance >= distStart && p.distance <= distEnd) {
          selectedPoints.push({ lat: p.lat, lng: p.lng });
        }
      });
    });

    if (selectedPoints.length > 0) {
      let minLat = selectedPoints[0].lat;
      let maxLat = selectedPoints[0].lat;
      let minLng = selectedPoints[0].lng;
      let maxLng = selectedPoints[0].lng;

      for (let i = 1; i < selectedPoints.length; i++) {
        const pt = selectedPoints[i];
        if (pt.lat < minLat) minLat = pt.lat;
        if (pt.lat > maxLat) maxLat = pt.lat;
        if (pt.lng < minLng) minLng = pt.lng;
        if (pt.lng > maxLng) maxLng = pt.lng;
      }

      mapInstance.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [50, 50] });
    }
  };

  const handleMouseUp = () => {
    if (refLeft !== null && refRight !== null) {
      if (refLeft === refRight) {
        // Single click: clear selection
        setSelectedRange(null);
      } else {
        const start = Math.min(refLeft, refRight);
        const end = Math.max(refLeft, refRight);
        setSelectedRange([start, end]);
        handleZoomToRange(start, end);
      }
    }
    setRefLeft(null);
    setRefRight(null);
  };

  // Determine bounds for ReferenceArea (live drag vs active selection)
  let refAreaX1: number | undefined = undefined;
  let refAreaX2: number | undefined = undefined;

  if (refLeft !== null && refRight !== null && refLeft !== refRight) {
    refAreaX1 = data[Math.min(refLeft, refRight)]?.km ?? undefined;
    refAreaX2 = data[Math.max(refLeft, refRight)]?.km ?? undefined;
  } else if (selectedRange !== null) {
    refAreaX1 = data[selectedRange[0]]?.km ?? undefined;
    refAreaX2 = data[selectedRange[1]]?.km ?? undefined;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pb-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-[#131b17]/97 border border-[#1b3d2b] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1b3d2b]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-emerald-400">Perfil de Elevación Combinado</h3>
              {selectedRange !== null && (
                <button
                  onClick={() => setSelectedRange(null)}
                  className="flex items-center gap-1 py-0.5 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <span>Segmento Seleccionado</span>
                  <X className="w-2.5 h-2.5 text-emerald-400" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{tracks.length} rutas superpuestas</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chart */}
        <div className="p-4" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1b3d2b" vertical={false} />
              <XAxis
                dataKey="km"
                tickFormatter={distLabel}
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={{ stroke: "#1b3d2b" }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={[minElev, maxElev]}
                tickFormatter={elevLabel}
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={{ stroke: "#1b3d2b" }}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip useImperial={useImperial} />} />
              <Legend
                formatter={(value) => {
                  const t = tracks.find((tr) => tr.id === value);
                  return <span style={{ color: "#cbd5e1", fontSize: 10 }}>{t?.name ?? value}</span>;
                }}
                wrapperStyle={{ paddingTop: 6 }}
              />
              {tracks.map((t) => (
                <Line
                  key={t.id}
                  type="monotone"
                  dataKey={t.id}
                  name={t.id}
                  stroke={t.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: t.color }}
                  connectNulls={false}
                />
              ))}
              {refAreaX1 !== undefined && refAreaX2 !== undefined && (
                <ReferenceArea
                  x1={refAreaX1}
                  x2={refAreaX2}
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Track summary row */}
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {tracks.map((t) => {
            const last = t.points[t.points.length - 1];
            const dist = last?.distance ?? 0;
            const gain = t.points.reduce((acc, p, i) => {
              if (i === 0) return acc;
              const diff = p.elevation - t.points[i - 1].elevation;
              return diff > 0 ? acc + diff : acc;
            }, 0);
            return (
              <div key={t.id} className="flex items-center gap-2 bg-[#0c120f]/60 border border-[#1b3d2b] rounded-lg px-3 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-[10px] text-slate-300 font-semibold truncate max-w-[120px]">{t.name}</span>
                <span className="text-[9px] text-slate-500">
                  {useImperial ? `${(dist * 0.621371).toFixed(1)} mi` : `${dist.toFixed(1)} km`}
                  {" · "}
                  {useImperial ? `+${Math.round(gain * 3.28084)} ft` : `+${Math.round(gain)} m`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

