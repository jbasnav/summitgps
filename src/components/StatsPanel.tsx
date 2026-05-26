import { useState } from "react";
import { Compass, ChevronsUp, ChevronsDown, Clock, Activity, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { formatDistance, formatElevation, estimateHikingTime, calculateDifficulty, calculateSurfaceStats } from "../utils/geoUtils";
import type { RoutePoint } from "../hooks/useRoutePlanner";
import { SplitsTable } from "./SplitsTable";

interface StatsPanelProps {
  distance: number; // in km
  ascent: number; // in meters
  descent: number; // in meters
  useImperial: boolean;
  points?: RoutePoint[];
}

export function StatsPanel({ distance, ascent, descent, useImperial, points = [] }: StatsPanelProps) {
  const [showSplits, setShowSplits] = useState(false);
  const timeStr = estimateHikingTime(distance, ascent);
  const difficulty = calculateDifficulty(distance, ascent);

  // Calculate surface statistics
  const surfaceStats = calculateSurfaceStats(points);

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b100d] border border-white/5 shadow-inner">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          Dificultad Estimada
        </span>
        <span
          className="text-[10.5px] font-bold px-3 py-1 rounded-full text-black shadow-md transition-all duration-300 tracking-wider uppercase"
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
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1 shadow-md hover:border-emerald-500/10 transition-all duration-300">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            Distancia
          </div>
          <div className="text-lg font-extrabold text-slate-100">
            {formatDistance(distance, useImperial)}
          </div>
        </div>

        {/* Tiempo Estimado */}
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1 shadow-md hover:border-emerald-500/10 transition-all duration-300">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Tiempo Est.
          </div>
          <div className="text-lg font-extrabold text-slate-100">
            {timeStr}
          </div>
        </div>

        {/* Ascenso Acumulado */}
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1 shadow-md hover:border-emerald-500/10 transition-all duration-300">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <ChevronsUp className="w-3.5 h-3.5 text-emerald-400" />
            Ascenso (+)
          </div>
          <div className="text-lg font-extrabold text-emerald-400">
            {formatElevation(ascent, useImperial)}
          </div>
        </div>

        {/* Descenso Acumulado */}
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-1 shadow-md hover:border-emerald-500/10 transition-all duration-300">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <ChevronsDown className="w-3.5 h-3.5 text-rose-400" />
            Descenso (-)
          </div>
          <div className="text-lg font-extrabold text-rose-400">
            {formatElevation(descent, useImperial)}
          </div>
        </div>
      </div>

      {/* Surface Statistics Section */}
      {surfaceStats.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#0b100d] border border-white/5 space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Distribución de Superficie
          </span>
          
          {/* Multi-colored Progress Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800 shadow-inner">
            {surfaceStats.map((stat, idx) => (
              <div
                key={idx}
                className="h-full first:rounded-l-full last:rounded-r-full hover:scale-y-110 transition-transform duration-200 cursor-help"
                style={{
                  width: `${stat.percentage}%`,
                  backgroundColor: stat.color,
                }}
                title={`${stat.surface}: ${stat.percentage.toFixed(0)}%`}
              />
            ))}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
            {surfaceStats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: stat.color }}
                />
                <span className="truncate text-slate-300 font-semibold">{stat.surface}:</span>
                <span className="text-slate-400 ml-auto">
                  {formatDistance(stat.distance, useImperial)} ({stat.percentage.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Splits Table Collapsible Accordion */}
      {points.length >= 2 && (
        <div className="space-y-2 select-none">
          <button
            onClick={() => setShowSplits(prev => !prev)}
            className="w-full py-2.5 px-4 rounded-xl border border-[#1b3d2b]/30 bg-[#0c120f]/60 hover:bg-[#0a0f0d] hover:border-emerald-500/20 text-xs font-semibold text-slate-300 hover:text-emerald-300 transition-all flex items-center justify-between shadow-sm cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Análisis Detallado de Tramos (Splits)
            </span>
            {showSplits ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          
          {showSplits && (
            <div className="pt-2 animate-fade-in">
              <SplitsTable points={points} useImperial={useImperial} />
            </div>
          )}
        </div>
      )}
      
      <p className="text-[9.5px] text-slate-500 italic text-center leading-relaxed">
        * El tiempo estimado y ritmo se calculan según la regla de Naismith (4 km/h base + 10 min por cada 100m de ascenso).
      </p>
    </div>
  );
}
