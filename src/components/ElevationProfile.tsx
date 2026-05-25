import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
}

interface ElevationProfileProps {
  points: RoutePoint[];
  useImperial: boolean;
  onHoverPoint: (point: RoutePoint | null) => void;
}

export function ElevationProfile({
  points,
  useImperial,
  onHoverPoint,
}: ElevationProfileProps) {
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
    }
  };

  const handleMouseLeave = () => {
    onHoverPoint(null);
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

  return (
    <div className="bg-[#070b09]/60 border border-[#1b3d2b]/20 backdrop-blur-md rounded-2xl p-5 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
          Perfil de Elevación
        </h4>
        <span className="text-[10px] text-slate-500">
          Pasa el cursor sobre el gráfico para ubicar el punto en el mapa
        </span>
      </div>

      <div className="flex-1 w-full h-[140px] text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
