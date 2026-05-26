import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea
} from "recharts";
import { X } from "lucide-react";

interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
  surface?: string;
}

interface ElevationProfileProps {
  points: RoutePoint[];
  useImperial: boolean;
  onHoverPoint: (point: RoutePoint | null) => void;
  selectedRange: [number, number] | null;
  onSelectRange: (range: [number, number] | null) => void;
}

export function ElevationProfile({
  points,
  useImperial,
  onHoverPoint,
  selectedRange,
  onSelectRange,
}: ElevationProfileProps) {
  const [refLeft, setRefLeft] = useState<number | null>(null);
  const [refRight, setRefRight] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-[#0d1310] border border-[#1b3d2b]/25 rounded-2xl p-6">
        <span className="text-sm font-semibold mb-1">Perfil de Elevación</span>
        <span className="text-xs text-center max-w-xs">
          Dibuja una ruta en el mapa o importa un archivo GPX para ver el perfil topográfico y las altitudes.
        </span>
      </div>
    );
  }

  // Format data for chart
  const chartData = points.map((p, index) => {
    const dist = useImperial ? p.distance * 0.621371 : p.distance;
    const elev = useImperial ? p.elevation * 3.28084 : p.elevation;
    return {
      index,
      distance: parseFloat(dist.toFixed(3)),
      elevation: Math.round(elev),
      originalPoint: p,
    };
  });

  const distUnit = useImperial ? "mi" : "km";
  const elevUnit = useImperial ? "ft" : "m";

  // Handle hover synchronization
  const handleMouseMove = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
      const activeIdx = state.activeTooltipIndex;
      if (points[activeIdx]) {
        onHoverPoint(points[activeIdx]);
      }
      if (refLeft !== null) {
        setRefRight(activeIdx);
      }
    }
  };

  const handleMouseLeave = () => {
    onHoverPoint(null);
    setRefLeft(null);
    setRefRight(null);
  };

  const handleMouseDown = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
      setRefLeft(state.activeTooltipIndex);
      setRefRight(state.activeTooltipIndex);
    }
  };

  const handleMouseUp = () => {
    if (refLeft !== null && refRight !== null) {
      if (refLeft === refRight) {
        // Single click: clear selection
        onSelectRange(null);
      } else {
        const start = Math.min(refLeft, refRight);
        const end = Math.max(refLeft, refRight);
        onSelectRange([start, end]);
      }
    }
    setRefLeft(null);
    setRefRight(null);
  };

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#101714]/90 border border-emerald-500/20 backdrop-blur-md rounded-xl p-3 shadow-xl text-slate-200 text-xs space-y-1 animate-fade-in">
          <p className="font-semibold text-emerald-400">Punto de Ruta</p>
          <p className="flex justify-between gap-4">
            <span className="text-slate-500">Distancia:</span>
            <span className="font-bold">{data.distance} {distUnit}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-slate-500">Altitud:</span>
            <span className="font-bold">{data.elevation} {elevUnit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Determine bounds for ReferenceArea (live drag vs active selection)
  let refAreaX1: number | undefined = undefined;
  let refAreaX2: number | undefined = undefined;

  if (refLeft !== null && refRight !== null && refLeft !== refRight) {
    refAreaX1 = chartData[Math.min(refLeft, refRight)].distance;
    refAreaX2 = chartData[Math.max(refLeft, refRight)].distance;
  } else if (selectedRange !== null) {
    refAreaX1 = chartData[selectedRange[0]].distance;
    refAreaX2 = chartData[selectedRange[1]].distance;
  }

  return (
    <div className="bg-[#070b09]/60 border border-[#1b3d2b]/20 backdrop-blur-md rounded-2xl p-5 h-full flex flex-col justify-between select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
            Perfil de Elevación
          </h4>
          {selectedRange !== null && (
            <button
              onClick={() => onSelectRange(null)}
              className="flex items-center gap-1 py-0.5 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              <span>Segmento Seleccionado</span>
              <X className="w-2.5 h-2.5 text-emerald-400" />
            </button>
          )}
        </div>
        <span className="text-[10px] text-slate-500">
          Arrastra para seleccionar un tramo · Clic para limpiar
        </span>
      </div>

      <div className="flex-1 w-full h-[140px] text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <defs>
              <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#16241e" vertical={false} />
            <XAxis
              dataKey="distance"
              tickLine={false}
              axisLine={false}
              stroke="#64748b"
              unit={` ${distUnit}`}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              stroke="#64748b"
              unit={` ${elevUnit}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#10b981", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorElevation)"
            />
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
