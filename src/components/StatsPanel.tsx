import { Compass, ChevronsUp, ChevronsDown, Clock, Activity } from "lucide-react";
import { formatDistance, formatElevation, estimateHikingTime, calculateDifficulty } from "../utils/geoUtils";

interface StatsPanelProps {
  distance: number; // in km
  ascent: number; // in meters
  descent: number; // in meters
  useImperial: boolean;
}

export function StatsPanel({ distance, ascent, descent, useImperial }: StatsPanelProps) {
  const timeStr = estimateHikingTime(distance, ascent);
  const difficulty = calculateDifficulty(distance, ascent);

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b100d] border border-white/5">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          Dificultad Estimada
        </span>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full text-black shadow-md transition-all duration-300"
          style={{ backgroundColor: difficulty.color }}
        >
          {difficulty.label === "Easy" && "Fácil"}
          {difficulty.label === "Moderate" && "Moderado"}
          {difficulty.label === "Strenuous" && "Exigente"}
          {difficulty.label === "Expert" && "Experto"}
        </span>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Distancia */}
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            Distancia
          </div>
          <div className="text-lg font-extrabold text-slate-100">
            {formatDistance(distance, useImperial)}
          </div>
        </div>

        {/* Tiempo Estimado */}
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Tiempo Est.
          </div>
          <div className="text-lg font-extrabold text-slate-100">
            {timeStr}
          </div>
        </div>

        {/* Ascenso Acumulado */}
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <ChevronsUp className="w-3.5 h-3.5 text-emerald-400" />
            Ascenso (+)
          </div>
          <div className="text-lg font-extrabold text-emerald-400">
            {formatElevation(ascent, useImperial)}
          </div>
        </div>

        {/* Descenso Acumulado */}
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <ChevronsDown className="w-3.5 h-3.5 text-rose-400" />
            Descenso (-)
          </div>
          <div className="text-lg font-extrabold text-rose-400">
            {formatElevation(descent, useImperial)}
          </div>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-500 italic text-center">
        * El tiempo se calcula según la regla de Naismith (4 km/h en plano + 10 min por cada 100m de subida).
      </p>
    </div>
  );
}
