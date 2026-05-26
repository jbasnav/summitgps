import type { RoutePoint } from "../hooks/useRoutePlanner";
import { calculateSplits, formatElevation } from "../utils/geoUtils";
import { Activity, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SplitsTableProps {
  points: RoutePoint[];
  useImperial: boolean;
}

export const SplitsTable: React.FC<SplitsTableProps> = ({ points, useImperial }) => {
  const splits = calculateSplits(points, useImperial);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m ${s}s`;
  };

  if (points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#0c120f]/80 border border-[#1b3d2b]/20">
        <Activity className="w-8 h-8 mb-2 text-slate-500 animate-pulse" />
        <p className="text-xs text-slate-400">Dibuja o importa una ruta para ver los tramos de rendimiento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          Análisis de Tramos ({useImperial ? "Millas" : "Kilómetros"})
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1b3d2b]/20 bg-[#0c120f]/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1b3d2b]/30 bg-[#080d0b]">
              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tramo</th>
              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distancia</th>
              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>Desnivel</span>
              </th>
              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alt. Media</th>
              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ritmo Est.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b3d2b]/15 text-xs font-mono">
            {splits.map((split) => (
              <tr 
                key={split.number} 
                className="hover:bg-emerald-500/5 transition-colors group"
              >
                <td className="py-2.5 px-3 font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                  #{split.number}
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {split.distance.toFixed(2)} {useImperial ? "mi" : "km"}
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-emerald-400 font-semibold flex items-center text-[10px]">
                      <ArrowUpRight className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                      +{formatElevation(split.ascent, useImperial)}
                    </span>
                    <span className="text-rose-400 font-semibold flex items-center text-[10px]">
                      <ArrowDownRight className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                      -{formatElevation(split.descent, useImperial)}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                  {formatElevation(split.avgElevation, useImperial)}
                </td>
                <td className="py-2.5 px-3 text-emerald-300/90 font-semibold text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500/80" />
                    {formatTime(split.timeSeconds)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-slate-500 leading-normal">
        * El ritmo estimado se calcula utilizando la regla de Naismith (4 km/h base + 10 minutos por cada 100 metros de desnivel positivo).
      </p>
    </div>
  );
};
