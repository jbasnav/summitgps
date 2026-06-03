import { useState, useEffect, useRef } from "react";
import { X, CloudRain, Wind, Trophy, Play, Pause, Thermometer, Navigation } from "lucide-react";

interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
}

interface RouteConditionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isPlusUser: boolean;
  onOpenPlusModal: () => void;
  points: RoutePoint[];
  useImperial: boolean;
  simulatedTime: number; // minutes from 0 to 1439 (24 hours)
  onChangeSimulatedTime: (time: number) => void;
  isCollapsed?: boolean;
}

export function RouteConditionsPanel({
  isOpen,
  onClose,
  isPlusUser,
  onOpenPlusModal,
  points = [],
  useImperial,
  simulatedTime,
  onChangeSimulatedTime,
  isCollapsed = false,
}: RouteConditionsPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const playIntervalRef = useRef<any>(null);

  // Clean play/pause interval
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        onChangeSimulatedTime((simulatedTime + 15) % 1440); // Advance 15 mins
      }, 500);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, simulatedTime, onChangeSimulatedTime]);

  if (!isOpen) return null;

  // Format minutes into HH:MM
  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Weather determinations based on coordinates
  // We compute values deterministically based on coordinates to make it consistent
  const avgLat = points.length > 0 ? points.reduce((acc, p) => acc + p.lat, 0) / points.length : 40.4167;
  const avgLng = points.length > 0 ? points.reduce((acc, p) => acc + p.lng, 0) / points.length : -3.7037;

  // Deterministic wind speed: (10 + fractional coords)
  const baseWind = Math.round(10 + Math.abs(Math.sin(avgLat) * 30));
  const gusts = Math.round(baseWind * 1.5 + Math.abs(Math.cos(avgLng) * 10));
  
  // Rain probability (base):
  const rainProb = Math.max(1, Math.min(99, Math.round(Math.abs(Math.sin(avgLat * 5) * Math.cos(avgLng * 5)) * 100)));
  
  // Air Quality AQI determination (0-150):
  const aqiVal = Math.round(Math.abs(Math.sin(avgLat * 12) * 120) + 15);
  const aqiLabel = aqiVal < 50 ? "Excelente" : aqiVal < 100 ? "Aceptable" : "Moderado";
  const aqiColor = aqiVal < 50 ? "bg-green-500" : aqiVal < 100 ? "bg-yellow-500" : "bg-orange-500";

  // Temperature calculations based on time of day and elevation lapse rate
  // Time factor: peak warmth at 14:00 (840 mins), coldest at 05:00 (300 mins)
  const getBaseTempForTime = (timeMins: number) => {
    const radians = ((timeMins - 300) / 1440) * 2 * Math.PI;
    const diurnalSwing = Math.cos(radians); // goes from -1 to 1
    const baseTemp = 18 + diurnalSwing * 8; // ranges between 10C and 26C
    return baseTemp;
  };

  const baseTemp = getBaseTempForTime(simulatedTime);

  // Elevation lapse rate: drops ~0.65C per 100m
  const maxElev = points.length > 0 ? Math.max(...points.map(p => p.elevation)) : 800;
  const minElev = points.length > 0 ? Math.min(...points.map(p => p.elevation)) : 400;
  const avgElev = points.length > 0 ? points.reduce((acc, p) => acc + p.elevation, 0) / points.length : 600;

  const currentTemp = Math.round(baseTemp - (avgElev - 300) * 0.0065);
  const maxTemp = Math.round(baseTemp - (minElev - 300) * 0.0065);
  const minTemp = Math.round(baseTemp - (maxElev - 300) * 0.0065);

  const finalTemp = useImperial ? Math.round(currentTemp * 1.8 + 32) : currentTemp;
  const finalMinTemp = useImperial ? Math.round(minTemp * 1.8 + 32) : minTemp;
  const finalMaxTemp = useImperial ? Math.round(maxTemp * 1.8 + 32) : maxTemp;
  const tempUnit = useImperial ? "°F" : "°C";

  // Generate SVG path for chart (Elevation Profile with Rain Probability columns)
  const drawChart = () => {
    if (points.length < 2) return null;
    const width = 300;
    const height = 110;
    const padding = 15;
    
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxDist = points[points.length - 1].distance;
    const elevations = points.map(p => p.elevation);
    const maxE = Math.max(...elevations, 1000);
    const minE = Math.min(...elevations, 0);
    const eRange = maxE - minE || 100;

    // SVG Points for elevation line
    const pointsString = points.map(p => {
      const x = padding + (p.distance / maxDist) * chartW;
      const y = padding + chartH - ((p.elevation - minE) / eRange) * chartH;
      return `${x},${y}`;
    }).join(" ");

    const closedPointsString = `${padding + chartW},${padding + chartH} ${padding},${padding + chartH} ${pointsString}`;

    // Rain probability columns along the route
    const barsCount = 10;
    const barSpacing = chartW / barsCount;
    const rainBars = [];
    for (let i = 0; i < barsCount; i++) {
      // Find nearest point
      const targetDist = (i / barsCount) * maxDist;
      const point = points.find(p => p.distance >= targetDist) || points[points.length - 1];
      // Generate probability based on point location
      const prob = Math.max(1, Math.min(100, Math.round(Math.abs(Math.sin(point.lat * 12) * Math.cos(point.lng * 8)) * 80 + 10)));
      
      const x = padding + i * barSpacing + 2;
      const h = (prob / 100) * chartH;
      const y = padding + chartH - h;
      rainBars.push(
        <rect
          key={i}
          x={x}
          y={y}
          width={barSpacing - 4}
          height={h}
          className="fill-sky-500/25 stroke-sky-400/30 stroke-1"
          rx="1.5"
        >
          <title>{`Km ${targetDist.toFixed(1)}: ${prob}% prob.`}</title>
        </rect>
      );
    }

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="select-none overflow-visible">
        {/* Gradients */}
        <defs>
          <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={padding + chartW} y2={padding} className="stroke-white/5 stroke-1" strokeDasharray="3 3" />
        <line x1={padding} y1={padding + chartH} x2={padding + chartW} y2={padding + chartH} className="stroke-white/10 stroke-1" />

        {/* Rain bars (rendered behind elevation line) */}
        {rainBars}

        {/* Elevation Area & Line */}
        <polygon points={closedPointsString} fill="url(#elevationGrad)" />
        <polyline points={pointsString} fill="none" className="stroke-emerald-400 stroke-[2]" strokeLinecap="round" strokeLinejoin="round" />

        {/* Labels */}
        <text x={padding} y={height - 2} className="fill-slate-500 font-mono text-[8px] font-bold">0.0 km</text>
        <text x={padding + chartW} y={height - 2} className="fill-slate-500 font-mono text-[8px] font-bold text-right" style={{ textAnchor: 'end' }}>
          {maxDist.toFixed(1)} km
        </text>
      </svg>
    );
  };

  // Solar angle variables for illustration
  const solarAngle = ((simulatedTime - 360) / 720) * 180; // 0 at 6am, 180 at 6pm
  const isNight = simulatedTime < 360 || simulatedTime > 1080; // Night is before 6am or after 6pm

  return (
    <div
      className="absolute w-[340px] md:w-[380px] border-l border-r border-[#1b3d2b] bg-[#131b17]/97 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col z-[9997] animate-slide-in-left pointer-events-auto transition-all duration-300"
      style={{ left: isCollapsed ? 64 : 380, top: 144, height: 'calc(100vh - 144px)' }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[#1b3d2b] bg-[#0c120f]/60 select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
            <CloudRain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">Condiciones de la ruta</h3>
            <p className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-wider leading-none mt-0.5">
              Meteorología & Relieve
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#1b3d2b]/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Drawer Container */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        
        {/* Blurry blocking wall if NOT Premium */}
        {!isPlusUser && (
          <div className="absolute inset-0 z-50 bg-[#0c120f]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg border border-yellow-400/30 text-black mb-4">
              <Trophy className="w-7 h-7" />
            </div>
            
            <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">SummitGPS Plus</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 max-w-[240px]">
              Desbloquea el perfil meteorológico detallado a lo largo de tu ruta y la simulación solar avanzada.
            </p>
            
            <button
              onClick={onOpenPlusModal}
              className="mt-5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
            >
              Obtener Plus
            </button>
          </div>
        )}

        {/* Real conditions container (displayed blurred behind lock if not Plus) */}
        <div className={`p-5 space-y-5 flex-1 ${!isPlusUser ? "filter blur-sm pointer-events-none select-none" : ""}`}>
          
          {points.length < 2 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#1b3d2b]/30 rounded-2xl bg-[#0c120f]/20">
              <Navigation className="w-8 h-8 text-slate-600 animate-bounce mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sin ruta trazada</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                Dibuja o selecciona una ruta en el planificador para ver sus condiciones específicas.
              </p>
            </div>
          ) : (
            <>
              {/* Rain Chart Section */}
              <div className="space-y-2.5 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/30 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1b3d2b]/15">
                  <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    💧 Precipitación a lo largo de la ruta
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    Promedio: {rainProb}%
                  </span>
                </div>
                
                {drawChart()}
                
                <p className="text-[9.5px] text-slate-500 text-center leading-normal">
                  Las barras representan la probabilidad de lluvia a lo largo del trayecto. La línea verde indica el relieve de altitud.
                </p>
              </div>

              {/* Weather statistics checklist */}
              <div className="space-y-3 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/30 shadow-lg">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1b3d2b]/15">
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    🌦️ Próximas horas
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold bg-[#131b17] border border-[#1b3d2b]/20 px-1.5 py-0.5 rounded uppercase">
                    Predicción
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1 select-none">
                  {/* Weather Status */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Clima Estimado</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl filter drop-shadow">
                        {isNight ? "🌙" : rainProb > 50 ? "🌧️" : rainProb > 20 ? "⛅" : "☀️"}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 leading-tight">
                          {rainProb > 50 ? "Precipitaciones" : rainProb > 20 ? "Inestable" : "Cielo Despejado"}
                        </span>
                        <span className="text-[9px] text-slate-500">A lo largo del trayecto</span>
                      </div>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Temperatura</span>
                    <div className="flex items-center gap-1.5">
                      <Thermometer className="w-5 h-5 text-emerald-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 leading-tight">
                          {finalTemp}{tempUnit}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          Min: {finalMinTemp}° / Max: {finalMaxTemp}°
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1b3d2b]/15 text-[10.5px]">
                  <div className="bg-[#131b17]/40 border border-[#1b3d2b]/10 rounded-lg p-2 flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Visibilidad</span>
                    <span className="font-bold text-slate-200">40 km</span>
                  </div>
                  <div className="bg-[#131b17]/40 border border-[#1b3d2b]/10 rounded-lg p-2 flex flex-col items-center gap-0.5" title="Velocidad media del viento">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Viento</span>
                    <span className="font-bold text-slate-200 flex items-center gap-0.5">
                      <Wind className="w-3 h-3 text-slate-400" /> {baseWind} km/h
                    </span>
                  </div>
                  <div className="bg-[#131b17]/40 border border-[#1b3d2b]/10 rounded-lg p-2 flex flex-col items-center gap-0.5" title="Rachas máximas de viento">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Ráfagas</span>
                    <span className="font-bold text-amber-500">{gusts} km/h</span>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="w-full text-center py-1 text-[9px] font-extrabold text-slate-400 hover:text-emerald-400 uppercase tracking-wider transition-all select-none border-t border-[#1b3d2b]/10 pt-2.5 cursor-pointer mt-1"
                >
                  {showMore ? "▲ Mostrar menos" : "▼ Mostrar más"}
                </button>

                {showMore && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[#1b3d2b]/15 text-[10px] animate-fade-in">
                    <div className="flex justify-between p-1 text-slate-400">
                      <span>Precipitación diaria:</span>
                      <span className="font-bold text-slate-200">0.3 mm (Hoy)</span>
                    </div>
                    <div className="flex justify-between p-1 text-slate-400">
                      <span>Precipitación mañana:</span>
                      <span className="font-bold text-slate-200">11.2 mm</span>
                    </div>
                    <div className="flex justify-between p-1 text-slate-400">
                      <span>Humedad relativa:</span>
                      <span className="font-bold text-slate-200">62%</span>
                    </div>
                    <div className="flex justify-between p-1 text-slate-400">
                      <span>Presión de aire:</span>
                      <span className="font-bold text-slate-200">1013 hPa</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Air Quality AQI Index */}
              <div className="space-y-3 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/30 shadow-lg">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1b3d2b]/15">
                  <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    😷 Calidad del aire
                  </span>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-white/5 text-slate-100 ${aqiColor}`}>
                    {aqiLabel}
                  </span>
                </div>

                <div className="space-y-2 pt-1 select-none">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10.5px] text-slate-300">Índice Europeo de Calidad del Aire (AQI)</span>
                    <span className="text-xs font-black text-slate-200">{aqiVal}</span>
                  </div>
                  
                  {/* Gradient scale bar */}
                  <div className="h-2 w-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-purple-600 relative border border-black/30">
                    {/* Marker pointer */}
                    <div
                      className="absolute -top-1 w-2.5 h-4 bg-white border border-black rounded shadow-[0_0_8px_rgba(255,255,255,0.8)] -translate-x-1/2 cursor-pointer transition-all duration-300"
                      style={{ left: `${Math.min(100, (aqiVal / 150) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Day/Night solar timeline arc */}
              <div className="space-y-3.5 bg-[#0c120f]/60 p-4 rounded-xl border border-[#1b3d2b]/30 shadow-lg">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1b3d2b]/15">
                  <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    ☀️ Sol y luna
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-200">
                      {formatTime(simulatedTime)}
                    </span>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`p-1 rounded-lg border transition-all cursor-pointer ${
                        isPlaying
                          ? "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                          : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25"
                      }`}
                      title={isPlaying ? "Pausar simulación" : "Iniciar simulación solar"}
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>
                  </div>
                </div>

                {/* Arc Simulation */}
                <div className="relative h-24 w-full flex flex-col justify-end select-none overflow-hidden bg-black/10 border border-[#1b3d2b]/10 rounded-xl p-3">
                  {/* Sky background layer based on time */}
                  <div
                    className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${
                      isNight ? "bg-indigo-950/20" : "bg-sky-400/5"
                    }`}
                  />
                  
                  {/* Sun / Moon Arc line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50">
                    <path
                      d="M 5,45 A 40,40 0 0,1 95,45"
                      fill="none"
                      className="stroke-[#1b3d2b]/40 stroke-1"
                      strokeDasharray="2 2"
                    />
                    
                    {/* The Sun or Moon moving */}
                    {!isNight ? (
                      <circle
                        cx={50 - 45 * Math.cos((solarAngle * Math.PI) / 180)}
                        cy={45 - 40 * Math.sin((solarAngle * Math.PI) / 180)}
                        r="3.5"
                        className="fill-yellow-400 stroke-yellow-200 stroke-1 shadow-lg filter drop-shadow-[0_0_4px_rgba(234,179,8,0.8)]"
                      />
                    ) : (
                      <circle
                        cx={50 - 45 * Math.cos((((simulatedTime > 1080 ? simulatedTime - 1080 : simulatedTime + 360) / 720) * 180 * Math.PI) / 180)}
                        cy={45 - 40 * Math.sin((((simulatedTime > 1080 ? simulatedTime - 1080 : simulatedTime + 360) / 720) * 180 * Math.PI) / 180)}
                        r="2.5"
                        className="fill-slate-200 stroke-slate-400 stroke-[0.5] shadow-md filter drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]"
                      />
                    )}
                  </svg>

                  {/* Sunset / Sunrise marks */}
                  <div className="flex justify-between items-end text-[8.5px] font-bold text-slate-500">
                    <div className="flex flex-col items-start leading-none select-none">
                      <span>🌅 06:12</span>
                      <span className="text-[7.5px] text-slate-600 mt-0.5">Amanece</span>
                    </div>
                    <div className="flex flex-col items-end leading-none select-none">
                      <span>🌇 21:38</span>
                      <span className="text-[7.5px] text-slate-600 mt-0.5">Anochece</span>
                    </div>
                  </div>
                </div>

                {/* Hourly timeline slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max="1439"
                    step="10"
                    value={simulatedTime}
                    onChange={(e) => {
                      onChangeSimulatedTime(parseInt(e.target.value));
                      setIsPlaying(false); // Stop playing on manual seek
                    }}
                    className="w-full h-1 bg-[#18231e] rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 select-none">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:59</span>
                  </div>
                </div>
                
                <p className="text-[9px] text-slate-500 text-center leading-normal">
                  Desliza para simular la hora del día y comprobar las variaciones de luz solar y temperatura a lo largo del trayecto.
                </p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
